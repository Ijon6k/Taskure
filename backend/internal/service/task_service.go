package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/focusengine"
	"github.com/Ijon6k/Taskure/apps/api/internal/imageutil"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type CreateTaskInput struct {
	Title       string     `json:"title" binding:"required"`
	ColumnID    string     `json:"column_id" binding:"required"`
	Priority    string     `json:"priority"`
	Description string     `json:"description"`
	DueDate     *time.Time `json:"due_date"`
	Tags        []string   `json:"tags"`
}

// Enum whitelists — invalid values fall back to defaults so the API never
// persists garbage, mirroring the import parser's tolerance.
var validTaskPriorities = map[string]bool{"none": true, "low": true, "medium": true, "high": true, "urgent": true}
var validTaskStatuses = map[string]bool{"todo": true, "in_progress": true, "done": true}

type MoveTaskInput struct {
	ColumnID string `json:"column_id" binding:"required"`
	Position int    `json:"position"`
	Status   string `json:"status"`
}

type AddChecklistInput struct {
	Title string `json:"title" binding:"required"`
}

type AttachmentItem struct {
	ID         string `json:"id"`
	Type       string `json:"type"`
	Title      string `json:"title"`
	URL        string `json:"url"`
	PreviewURL string `json:"preview_url,omitempty"`
	Size       string `json:"size"`
	MimeType   string `json:"mimeType"`
	ObjectKey  string `json:"object_key,omitempty"`
}

type TaskService interface {
	CreateTask(projectIDOrPublicID string, input CreateTaskInput) (*models.Task, error)
	GetTask(idOrPublicID string) (*models.Task, error)
	UpdateTask(idOrPublicID string, updates map[string]interface{}) (*models.Task, error)
	MoveTask(idOrPublicID string, input MoveTaskInput) (*models.Task, error)
	DeleteTask(idOrPublicID string) error
	GetSuggestedTags(projectIDOrPublicID string, limit int) ([]string, error)

	// Attachments (MinIO S3)
	UploadAttachment(ctx context.Context, taskIDOrPublicID string, fileName string, reader io.Reader, fileSize int64, contentType string) (*models.Task, error)
	DeleteAttachment(ctx context.Context, taskIDOrPublicID string, attachmentID string) (*models.Task, error)

	// Checklist
	AddChecklistItem(taskIDOrPublicID string, input AddChecklistInput) (*models.ChecklistItem, error)
	UpdateChecklistItem(id string, updates map[string]interface{}) (*models.ChecklistItem, error)
	DeleteChecklistItem(id string) error

	// Focus Engine
	GetFocusTask(projectID string, limit int, loc *time.Location) (*focusengine.FocusResult, error)
	GetFocusOverview() (*repository.FocusOverviewResult, error)
}

type taskService struct {
	taskRepo    repository.TaskRepository
	projectRepo repository.ProjectRepository
	columnRepo  repository.ColumnRepository
	variantJobs repository.VariantJobRepository
	storage     storage.StorageService
}

// NewTaskService creates the task service.
func NewTaskService(taskRepo repository.TaskRepository, projectRepo repository.ProjectRepository, columnRepo repository.ColumnRepository, variantJobs repository.VariantJobRepository, storage storage.StorageService) TaskService {
	return &taskService{
		taskRepo:    taskRepo,
		projectRepo: projectRepo,
		columnRepo:  columnRepo,
		variantJobs: variantJobs,
		storage:     storage,
	}
}

// CreateTask creates a task in a column and records its tag usage.
func (s *taskService) CreateTask(projectIDOrPublicID string, input CreateTaskInput) (*models.Task, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	// Reject columns that do not belong to this project (cross-project injection).
	col, err := s.columnRepo.FindColumnByID(input.ColumnID)
	if err != nil {
		return nil, fmt.Errorf("column not found: %w", err)
	}
	if col.ProjectID != project.ID {
		return nil, fmt.Errorf("column %s does not belong to project %s", input.ColumnID, project.ID)
	}

	priority := strings.ToLower(strings.TrimSpace(input.Priority))
	if !validTaskPriorities[priority] {
		priority = "none"
	}

	count, err := s.taskRepo.GetCountByColumnID(input.ColumnID)
	if err != nil {
		return nil, err
	}

	task := models.Task{
		Title:       input.Title,
		Description: input.Description,
		ColumnID:    input.ColumnID,
		ProjectID:   project.ID,
		Priority:    priority,
		Status:      "todo",
		Position:    int(count),
		DueDate:     input.DueDate,
	}

	if len(input.Tags) > 0 {
		tagsJSON, _ := json.Marshal(input.Tags)
		task.Tags = datatypes.JSON(tagsJSON)
	}

	if err := s.taskRepo.CreateTask(&task); err != nil {
		return nil, err
	}

	// Record tag usage only after the task persists, so a failed insert never
	// pollutes the suggestion stats.
	if len(input.Tags) > 0 {
		_ = s.taskRepo.RecordTagUsage(project.ID, input.Tags)
	}

	return s.taskRepo.FindTask(task.PublicID)
}

// GetTask returns one task with checklist and labels.
func (s *taskService) GetTask(idOrPublicID string) (*models.Task, error) {
	return s.taskRepo.FindTask(idOrPublicID)
}

// UpdateTask applies a partial update map, re-deriving checklist counts and positions where needed.
func (s *taskService) UpdateTask(idOrPublicID string, updates map[string]interface{}) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return nil, err
	}

	// Enum whitelist: reject unknown priority/status values so garbage never
	// reaches the column. null keeps its old no-op semantics (GORM skips nils).
	if priorityRaw, ok := updates["priority"]; ok {
		if priorityRaw == nil {
			delete(updates, "priority")
		} else {
			priority := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", priorityRaw)))
			if !validTaskPriorities[priority] {
				priority = "none"
			}
			updates["priority"] = priority
		}
	}
	if statusRaw, ok := updates["status"]; ok {
		if statusRaw == nil {
			delete(updates, "status")
		} else {
			status := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", statusRaw)))
			if !validTaskStatuses[status] {
				status = "todo"
			}
			updates["status"] = status
		}
	}

	// Safely parse due_date string into time.Time struct or nil for GORM map updates
	if dueDateRaw, ok := updates["due_date"]; ok {
		if dueDateStr, isStr := dueDateRaw.(string); isStr && dueDateStr != "" {
			if parsedTime, err := time.Parse(time.RFC3339, dueDateStr); err == nil {
				updates["due_date"] = parsedTime
			} else if parsedDate, err := time.Parse("2006-01-02", dueDateStr); err == nil {
				updates["due_date"] = parsedDate
			}
		} else if dueDateRaw == nil || (isStr && dueDateStr == "") {
			updates["due_date"] = nil
		}
	}

	// Safely serialize tags slice into JSONB (handles []interface{} from Gin JSON map binding)
	var recordedTags []string
	if tagsRaw, ok := updates["tags"]; ok {
		var tagStrings []string
		if tagsInterface, isSlice := tagsRaw.([]interface{}); isSlice {
			for _, item := range tagsInterface {
				if str, isStr := item.(string); isStr && str != "" {
					tagStrings = append(tagStrings, str)
				}
			}
		} else if tagsStr, isSlice := tagsRaw.([]string); isSlice {
			tagStrings = tagsStr
		}

		if len(tagStrings) > 0 {
			if tagsJSON, err := json.Marshal(tagStrings); err == nil {
				updates["tags"] = datatypes.JSON(tagsJSON)
			}
			recordedTags = tagStrings
		} else {
			updates["tags"] = datatypes.JSON([]byte("[]"))
		}
	}

	// Safely serialize attachments slice into JSONB column
	if attsRaw, ok := updates["attachments"]; ok {
		if attsJSON, err := json.Marshal(attsRaw); err == nil {
			updates["attachments_json"] = datatypes.JSON(attsJSON)
		} else {
			updates["attachments_json"] = datatypes.JSON([]byte("[]"))
		}
		delete(updates, "attachments")
	}
	if err := s.taskRepo.UpdateTask(task, updates); err != nil {
		return nil, err
	}

	// Record tag usage only after the update persists, so a failed write never
	// pollutes the suggestion stats.
	if len(recordedTags) > 0 {
		_ = s.taskRepo.RecordTagUsage(task.ProjectID, recordedTags)
	}

	return s.taskRepo.FindTask(task.ID)
}

// GetSuggestedTags returns the most-used tags in a project.
func (s *taskService) GetSuggestedTags(projectIDOrPublicID string, limit int) ([]string, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}
	stats, err := s.taskRepo.GetSuggestedTags(project.ID, limit)
	if err != nil {
		return nil, err
	}
	result := make([]string, 0, len(stats))
	for _, st := range stats {
		result = append(result, st.TagName)
	}
	return result, nil
}

// extractAttachmentKeys returns the object-storage keys referenced by a task's
// attachments_json payload, falling back to parsing the URL for legacy entries
// that predate the object_key field.
func extractAttachmentKeys(attsJSON datatypes.JSON) []string {
	if len(attsJSON) == 0 {
		return nil
	}
	var items []AttachmentItem
	if err := json.Unmarshal(attsJSON, &items); err != nil {
		return nil
	}
	keys := make([]string, 0, len(items))
	for _, att := range items {
		key := att.ObjectKey
		if key == "" && strings.Contains(att.URL, "/storage/") {
			if parts := strings.Split(att.URL, "/storage/kanban-uploads/"); len(parts) > 1 {
				key = parts[1]
			}
		}
		if key != "" {
			keys = append(keys, key)
		}
	}
	return keys
}

// MoveTask moves a task between columns and/or repositions it, applying column behavior status rules.
func (s *taskService) MoveTask(idOrPublicID string, input MoveTaskInput) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"column_id": input.ColumnID,
		"position":  input.Position,
	}

	// Look up target column's behavior directly and reject cross-project moves.
	col, err := s.columnRepo.FindColumnByID(input.ColumnID)
	if err != nil {
		return nil, err
	}
	if col.ProjectID != task.ProjectID {
		return nil, fmt.Errorf("column %s does not belong to task's project", input.ColumnID)
	}
	if col.Behavior == models.ColumnBehaviorCompleted {
		updates["status"] = "done"
	} else {
		if input.Status != "" {
			updates["status"] = input.Status
		} else {
			updates["status"] = "in_progress"
		}
	}

	if err := s.taskRepo.UpdateTask(task, updates); err != nil {
		return nil, err
	}

	return s.taskRepo.FindTask(task.ID)
}

// DeleteTask removes a task and deletes its attachment objects.
func (s *taskService) DeleteTask(idOrPublicID string) error {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return err
	}
	// Collect object keys first; the task row still holds them until deletion.
	keys := extractAttachmentKeys(task.AttachmentsJSON)
	if err := s.taskRepo.DeleteTask(task); err != nil {
		return err
	}
	// Best-effort cleanup of orphaned objects and pending variant jobs after
	// the DB delete succeeds.
	_ = s.variantJobs.DeleteByObjectKeys(keys)
	deleteObjects(context.Background(), s.storage, keys)
	return nil
}

// AddChecklistItem appends a subtask to a task.
func (s *taskService) AddChecklistItem(taskIDOrPublicID string, input AddChecklistInput) (*models.ChecklistItem, error) {
	task, err := s.taskRepo.FindTask(taskIDOrPublicID)
	if err != nil {
		return nil, err
	}

	count, err := s.taskRepo.GetChecklistCount(task.ID)
	if err != nil {
		return nil, err
	}

	item := models.ChecklistItem{
		Title:       input.Title,
		IsCompleted: false,
		Position:    int(count),
		TaskID:      task.ID,
	}

	if err := s.taskRepo.AddChecklistItem(&item); err != nil {
		return nil, err
	}

	return &item, nil
}

// UpdateChecklistItem applies partial updates to a subtask.
func (s *taskService) UpdateChecklistItem(id string, updates map[string]interface{}) (*models.ChecklistItem, error) {
	item, err := s.taskRepo.FindChecklistItem(id)
	if err != nil {
		return nil, err
	}

	if err := s.taskRepo.UpdateChecklistItem(item, updates); err != nil {
		return nil, err
	}
	return item, nil
}

// DeleteChecklistItem removes a subtask.
func (s *taskService) DeleteChecklistItem(id string) error {
	return s.taskRepo.DeleteChecklistItem(id)
}

// GetFocusTask selects today's single focus task for a workspace, timezone-aware.
func (s *taskService) GetFocusTask(projectID string, limit int, loc *time.Location) (*focusengine.FocusResult, error) {
	if limit <= 0 {
		limit = 100
	}
	pendingTasks, err := s.taskRepo.GetPendingTasks(projectID, limit)
	if err != nil {
		return nil, err
	}

	projects, err := s.projectRepo.GetFocusProjects()
	if err != nil {
		return nil, err
	}

	projectMap := make(map[string]models.Project, len(projects)*2)
	activeProjectIDs := make(map[string]bool, len(projects)*2)
	for _, p := range projects {
		projectMap[p.ID] = p
		if p.PublicID != "" {
			projectMap[p.PublicID] = p
		}
		// The engine's active set excludes archived projects; mirror that here
		// so the per-column totals fallback runs exactly when Evaluate will use
		// it (otherwise archived-only pending tasks would zero the totals).
		if p.IsArchived || strings.EqualFold(p.Status, "archived") {
			continue
		}
		activeProjectIDs[p.ID] = true
		if p.PublicID != "" {
			activeProjectIDs[p.PublicID] = true
		}
	}

	hasActivePending := false
	for _, t := range pendingTasks {
		if activeProjectIDs[t.ProjectID] {
			hasActivePending = true
			break
		}
	}

	// Per-column totals only back the empty-focus fallback (no pending task in
	// an active project). Skip the query when the focus list will be populated.
	if !hasActivePending {
		columnIDs := make([]string, 0, len(projects)*3)
		for _, p := range projects {
			for _, col := range p.Columns {
				columnIDs = append(columnIDs, col.ID)
			}
		}
		counts, err := s.projectRepo.GetColumnTaskCounts(columnIDs)
		if err != nil {
			return nil, err
		}
		for i := range projects {
			for j := range projects[i].Columns {
				projects[i].Columns[j].TaskCount = counts[projects[i].Columns[j].ID]
			}
		}
	}

	result := focusengine.Evaluate(pendingTasks, projectMap, time.Now(), loc, focusengine.DefaultConfig())
	return &result, nil
}

// GetFocusOverview aggregates focus eligibility counts for the workspace.
func (s *taskService) GetFocusOverview() (*repository.FocusOverviewResult, error) {
	return s.projectRepo.GetFocusOverview()
}

// formatFileSize renders a byte count as a human-readable string.
func formatFileSize(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

// UploadAttachment stores a file in object storage, attaches it to the task and enqueues variant generation for images.
func (s *taskService) UploadAttachment(ctx context.Context, taskIDOrPublicID string, fileName string, reader io.Reader, fileSize int64, contentType string) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(taskIDOrPublicID)
	if err != nil {
		return nil, err
	}

	ext := filepath.Ext(fileName)
	objectName := fmt.Sprintf("tasks/%s/%s_%s%s", task.ID, time.Now().Format("20060102_150405"), uuid.New().String()[:8], ext)

	var uploadResult *storage.UploadResult
	if s.storage != nil {
		res, err := s.storage.UploadFile(ctx, objectName, reader, fileSize, contentType)
		if err != nil {
			return nil, fmt.Errorf("failed to upload attachment to object storage: %w", err)
		}
		uploadResult = res
	} else {
		// Fallback URL if storage service is not initialized
		uploadResult = &storage.UploadResult{
			ObjectKey: objectName,
			PublicURL: fmt.Sprintf("/storage/kanban-uploads/%s", objectName),
			Size:      fileSize,
		}
	}

	// Variants are generated by the background worker; the preview URL is a
	// width request on the original, so it is deterministic and never 404s: the
	// serve path streams the generated 2000px webp once ready and falls back to
	// the original (short-cached) while the job is still pending. Oversized
	// uploads skip variant generation to protect worker memory.
	previewURL := ""
	if s.storage != nil && imageutil.IsPreviewableImage(contentType) && fileSize <= imageutil.MaxVariantSourceBytes {
		previewURL = fmt.Sprintf("%s?w=%d", s.storage.GetPublicURL(uploadResult.ObjectKey), storage.PreviewWidth)
		job := &models.ImageVariantJob{ObjectKey: uploadResult.ObjectKey}
		// Enqueue is best-effort: a failed insert leaves the original upload
		// intact and simply means the image is served at original size.
		_ = s.variantJobs.Create(job)
	}

	attItem := AttachmentItem{
		ID:         "att_" + uuid.New().String()[:8],
		Type:       "file",
		Title:      fileName,
		URL:        uploadResult.PublicURL,
		PreviewURL: previewURL,
		Size:       formatFileSize(fileSize),
		MimeType:   contentType,
		ObjectKey:  uploadResult.ObjectKey,
	}

	var currentAtts []AttachmentItem
	if len(task.AttachmentsJSON) > 0 {
		_ = json.Unmarshal(task.AttachmentsJSON, &currentAtts)
	}
	currentAtts = append(currentAtts, attItem)

	attsBytes, err := json.Marshal(currentAtts)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"attachments_json": datatypes.JSON(attsBytes),
	}

	if err := s.taskRepo.UpdateTask(task, updates); err != nil {
		return nil, err
	}

	return s.taskRepo.FindTask(task.ID)
}

// DeleteAttachment removes an attachment from the task and deletes its object from storage.
func (s *taskService) DeleteAttachment(ctx context.Context, taskIDOrPublicID string, attachmentID string) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(taskIDOrPublicID)
	if err != nil {
		return nil, err
	}

	var currentAtts []AttachmentItem
	if len(task.AttachmentsJSON) > 0 {
		_ = json.Unmarshal(task.AttachmentsJSON, &currentAtts)
	}

	var updatedAtts []AttachmentItem
	var targetObjectKey string

	for _, att := range currentAtts {
		if att.ID == attachmentID {
			targetObjectKey = att.ObjectKey
			if targetObjectKey == "" && strings.Contains(att.URL, "/storage/") {
				parts := strings.Split(att.URL, "/storage/kanban-uploads/")
				if len(parts) > 1 {
					targetObjectKey = parts[1]
				}
			}
		} else {
			updatedAtts = append(updatedAtts, att)
		}
	}

	if targetObjectKey != "" && s.storage != nil {
		// Fail the request if the object cannot be removed so the metadata row
		// is not left pointing at a dangling key (and cleanup stays retryable).
		if err := s.storage.DeleteFile(ctx, targetObjectKey); err != nil {
			return nil, fmt.Errorf("failed to delete attachment object: %w", err)
		}
		// Derived preview/thumbnail keys are cleaned up best-effort, as is any
		// pending variant job for the original.
		_ = s.variantJobs.DeleteByObjectKeys([]string{targetObjectKey})
		for _, key := range storage.RelatedKeys(targetObjectKey) {
			_ = s.storage.DeleteFile(ctx, key)
		}
	}

	attsBytes, err := json.Marshal(updatedAtts)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"attachments_json": datatypes.JSON(attsBytes),
	}

	if err := s.taskRepo.UpdateTask(task, updates); err != nil {
		return nil, err
	}

	return s.taskRepo.FindTask(task.ID)
}
