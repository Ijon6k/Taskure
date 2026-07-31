package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/focusengine"
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

type MoveTaskInput struct {
	ColumnID string `json:"column_id" binding:"required"`
	Position int    `json:"position"`
	Status   string `json:"status"`
}

type AddChecklistInput struct {
	Title string `json:"title" binding:"required"`
}

type AttachmentItem struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	Size      string `json:"size"`
	MimeType  string `json:"mimeType"`
	ObjectKey string `json:"object_key,omitempty"`
}

type TaskService interface {
	CreateTask(projectIDOrPublicID string, input CreateTaskInput) (*models.Task, error)
	GetTask(idOrPublicID string) (*models.Task, error)
	UpdateTask(idOrPublicID string, updates map[string]interface{}) (*models.Task, error)
	MoveTask(idOrPublicID string, input MoveTaskInput) (*models.Task, error)
	DeleteTask(idOrPublicID string) error

	// Attachments (MinIO S3)
	UploadAttachment(ctx context.Context, taskIDOrPublicID string, fileName string, reader io.Reader, fileSize int64, contentType string) (*models.Task, error)
	DeleteAttachment(ctx context.Context, taskIDOrPublicID string, attachmentID string) (*models.Task, error)

	// Checklist
	AddChecklistItem(taskIDOrPublicID string, input AddChecklistInput) (*models.ChecklistItem, error)
	UpdateChecklistItem(id string, updates map[string]interface{}) (*models.ChecklistItem, error)
	DeleteChecklistItem(id string) error

	// Focus Engine
	GetFocusTask(projectID string, limit int) (*focusengine.FocusResult, error)
	GetFocusOverview() (*repository.FocusOverviewResult, error)
	InvalidateFocusCache()
}

type taskService struct {
	taskRepo         repository.TaskRepository
	projectRepo      repository.ProjectRepository
	columnRepo       repository.ColumnRepository
	storage          storage.StorageService
	cacheMu          sync.RWMutex
	focusCache       *focusengine.FocusResult
	focusCacheExpiry time.Time
}

func NewTaskService(taskRepo repository.TaskRepository, projectRepo repository.ProjectRepository, columnRepo repository.ColumnRepository, storage storage.StorageService) TaskService {
	return &taskService{
		taskRepo:    taskRepo,
		projectRepo: projectRepo,
		columnRepo:  columnRepo,
		storage:     storage,
	}
}

func (s *taskService) InvalidateFocusCache() {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	s.focusCache = nil
	s.focusCacheExpiry = time.Time{}
}

func (s *taskService) invalidateFocusCache() {
	s.InvalidateFocusCache()
}


func (s *taskService) CreateTask(projectIDOrPublicID string, input CreateTaskInput) (*models.Task, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	priority := input.Priority
	if priority == "" {
		priority = "medium"
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

	s.invalidateFocusCache()
	return s.taskRepo.FindTask(task.PublicID)

}

func (s *taskService) GetTask(idOrPublicID string) (*models.Task, error) {
	return s.taskRepo.FindTask(idOrPublicID)
}

func (s *taskService) UpdateTask(idOrPublicID string, updates map[string]interface{}) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return nil, err
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
	s.invalidateFocusCache()
	return s.taskRepo.FindTask(task.ID)
}

func (s *taskService) MoveTask(idOrPublicID string, input MoveTaskInput) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"column_id": input.ColumnID,
		"position":  input.Position,
	}

	// Look up target column's behavior directly
	col, err := s.columnRepo.FindColumnByID(input.ColumnID)
	if err == nil && col != nil {
		if col.Behavior == models.ColumnBehaviorCompleted {
			updates["status"] = "done"
		} else {
			if input.Status != "" {
				updates["status"] = input.Status
			} else {
				updates["status"] = "in_progress"
			}
		}
	} else if input.Status != "" {
		updates["status"] = input.Status
	}

	if err := s.taskRepo.UpdateTask(task, updates); err != nil {
		return nil, err
	}

	s.invalidateFocusCache()
	return s.taskRepo.FindTask(task.ID)
}

func (s *taskService) DeleteTask(idOrPublicID string) error {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return err
	}
	s.invalidateFocusCache()
	return s.taskRepo.DeleteTask(task)
}

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

	s.invalidateFocusCache()
	return &item, nil
}

func (s *taskService) UpdateChecklistItem(id string, updates map[string]interface{}) (*models.ChecklistItem, error) {
	item, err := s.taskRepo.FindChecklistItem(id)
	if err != nil {
		return nil, err
	}

	if err := s.taskRepo.UpdateChecklistItem(item, updates); err != nil {
		return nil, err
	}
	s.invalidateFocusCache()
	return item, nil
}

func (s *taskService) DeleteChecklistItem(id string) error {
	s.invalidateFocusCache()
	return s.taskRepo.DeleteChecklistItem(id)
}

func (s *taskService) GetFocusTask(projectID string, limit int) (*focusengine.FocusResult, error) {
	if limit <= 0 {
		limit = 100
	}
	pendingTasks, err := s.taskRepo.GetPendingTasks(projectID, limit)
	if err != nil {
		return nil, err
	}

	projects, err := s.projectRepo.GetAllProjects()
	if err != nil {
		return nil, err
	}

	projectMap := make(map[string]models.Project)
	for _, p := range projects {
		projectMap[p.ID] = p
		if p.PublicID != "" {
			projectMap[p.PublicID] = p
		}
	}

	result := focusengine.Evaluate(pendingTasks, projectMap, time.Now())
	return &result, nil
}

func (s *taskService) GetFocusOverview() (*repository.FocusOverviewResult, error) {
	return s.projectRepo.GetFocusOverview()
}

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

	attItem := AttachmentItem{
		ID:        "att_" + uuid.New().String()[:8],
		Type:      "file",
		Title:     fileName,
		URL:       uploadResult.PublicURL,
		Size:      formatFileSize(fileSize),
		MimeType:  contentType,
		ObjectKey: uploadResult.ObjectKey,
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
		_ = s.storage.DeleteFile(ctx, targetObjectKey)
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

