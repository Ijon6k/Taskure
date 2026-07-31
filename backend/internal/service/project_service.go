package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/imageutil"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// ErrResourceNotFound is returned when a project resource ID does not exist.
var ErrResourceNotFound = errors.New("resource not found")

type CreateProjectInput struct {
	Name         string `json:"name" binding:"required"`
	Description  string `json:"description"`
	Color        string `json:"color"`
	Icon         string `json:"icon"`
	Status       string `json:"status"`
	IsPinned     bool   `json:"is_pinned"`
	FocusEnabled *bool  `json:"focus_enabled"`
	Template     string `json:"template"`
}

type ProjectService interface {
	ListProjects(status string, search string, pinned bool) ([]models.Project, error)
	CreateProject(input CreateProjectInput) (*models.Project, error)
	GetProject(idOrPublicID string) (*models.Project, error)
	GetProjectBoard(idOrPublicID string) (*models.Project, error)
	UpdateProject(idOrPublicID string, updates map[string]interface{}) (*models.Project, error)
	DeleteProject(idOrPublicID string) error

	// MinIO Resource Upload
	UploadResource(ctx context.Context, projectIDOrPublicID string, fileName string, reader io.Reader, fileSize int64, contentType string) (*models.Project, error)
	DeleteResource(ctx context.Context, projectIDOrPublicID string, resourceID string) (*models.Project, error)
}

type projectService struct {
	projectRepo   repository.ProjectRepository
	workspaceRepo repository.WorkspaceRepository
	columnRepo    repository.ColumnRepository
	variantJobs   repository.VariantJobRepository
	storage       storage.StorageService
}

func NewProjectService(
	projectRepo repository.ProjectRepository,
	workspaceRepo repository.WorkspaceRepository,
	columnRepo repository.ColumnRepository,
	variantJobs repository.VariantJobRepository,
	storage storage.StorageService,
) ProjectService {
	return &projectService{
		projectRepo:   projectRepo,
		workspaceRepo: workspaceRepo,
		columnRepo:    columnRepo,
		variantJobs:   variantJobs,
		storage:       storage,
	}
}

func (s *projectService) ListProjects(status string, search string, pinned bool) ([]models.Project, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}
	projects, _, err := s.projectRepo.ListProjectsLight(ws.ID, status, search, pinned, 0, 0)
	return projects, err
}

func (s *projectService) CreateProject(input CreateProjectInput) (*models.Project, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}

	color := input.Color
	if color == "" {
		color = "#B4A0E5"
	}
	status := input.Status
	if status == "" {
		status = "active"
	}

	focusEnabled := true
	if input.FocusEnabled != nil {
		focusEnabled = *input.FocusEnabled
	}

	project := models.Project{
		Name:         input.Name,
		Description:  input.Description,
		Color:        color,
		Icon:         input.Icon,
		Status:       status,
		IsPinned:     input.IsPinned,
		FocusEnabled: focusEnabled,
		WorkspaceID:  ws.ID,
		OwnerID:      ws.OwnerID,
	}

	if err := s.projectRepo.CreateProject(&project); err != nil {
		return nil, err
	}

	// Create default columns unless template is explicitly set to "blank"
	if input.Template != "blank" {
		defaultColumns := []models.Column{
			{Name: "Todo", Behavior: models.ColumnBehaviorActive, Position: 0, ProjectID: project.ID, Color: "#6B7280"},
			{Name: "In Progress", Behavior: models.ColumnBehaviorActive, Position: 1, ProjectID: project.ID, Color: "#3B82F6"},
			{Name: "Done", Behavior: models.ColumnBehaviorCompleted, Position: 2, ProjectID: project.ID, Color: "#22C55E"},
		}

		for _, col := range defaultColumns {
			_ = s.columnRepo.CreateColumn(&col)
		}
	}

	return s.projectRepo.FindProject(project.PublicID)
}

func (s *projectService) GetProject(idOrPublicID string) (*models.Project, error) {
	return s.projectRepo.FindProject(idOrPublicID)
}

func (s *projectService) GetProjectBoard(idOrPublicID string) (*models.Project, error) {
	return s.projectRepo.FindProject(idOrPublicID)
}

func (s *projectService) UpdateProject(idOrPublicID string, updates map[string]interface{}) (*models.Project, error) {
	project, err := s.projectRepo.FindProject(idOrPublicID)
	if err != nil {
		return nil, err
	}

	// Automatically unpin project if status is changed to completed or archived
	if statusVal, ok := updates["status"].(string); ok && (statusVal == "completed" || statusVal == "archived") {
		updates["is_pinned"] = false
	}

	// Parse current settings JSON into a map
	settingsMap := make(map[string]interface{})
	if len(project.Settings) > 0 {
		_ = json.Unmarshal(project.Settings, &settingsMap)
	}

	// Dynamic overview metadata keys to store in Settings JSONB
	overviewKeys := []string{"target_goal", "target_date", "tags", "resources", "strategy_notes", "settings"}

	hasSettingsUpdate := false
	for _, key := range overviewKeys {
		if val, exists := updates[key]; exists {
			if key == "settings" {
				if subMap, ok := val.(map[string]interface{}); ok {
					for subK, subV := range subMap {
						settingsMap[subK] = subV
					}
				}
			} else {
				settingsMap[key] = val
			}
			hasSettingsUpdate = true
			delete(updates, key) // Remove from root map so GORM column match won't fail
		}
	}

	if hasSettingsUpdate {
		bytes, err := json.Marshal(settingsMap)
		if err == nil {
			updates["settings"] = datatypes.JSON(bytes)
		}
	}

	if err := s.projectRepo.UpdateProject(project, updates); err != nil {
		return nil, err
	}
	return s.projectRepo.FindProject(project.ID)
}

func (s *projectService) DeleteProject(idOrPublicID string) error {
	project, err := s.projectRepo.FindProject(idOrPublicID)
	if err != nil {
		return err
	}

	// Collect referenced object keys before the project row is deleted.
	var keys []string
	keys = append(keys, extractResourceKeys(project.Settings)...)
	for _, col := range project.Columns {
		for _, t := range col.Tasks {
			keys = append(keys, extractAttachmentKeys(t.AttachmentsJSON)...)
		}
	}

	if err := s.projectRepo.DeleteProject(project); err != nil {
		return err
	}
	// Best-effort cleanup of orphaned objects and pending variant jobs after
	// the DB delete succeeds.
	_ = s.variantJobs.DeleteByObjectKeys(keys)
	deleteObjects(context.Background(), s.storage, keys)
	return nil
}

// extractResourceKeys returns the object-storage keys referenced by a project's
// settings.resources payload, falling back to parsing the URL for legacy
// entries that predate the object_key field.
func extractResourceKeys(settings datatypes.JSON) []string {
	if len(settings) == 0 {
		return nil
	}
	var settingsMap map[string]interface{}
	if err := json.Unmarshal(settings, &settingsMap); err != nil {
		return nil
	}
	resources, ok := settingsMap["resources"].([]interface{})
	if !ok {
		return nil
	}
	keys := make([]string, 0, len(resources))
	for _, r := range resources {
		rm, ok := r.(map[string]interface{})
		if !ok {
			continue
		}
		key, _ := rm["object_key"].(string)
		if key == "" {
			if url, _ := rm["url"].(string); strings.Contains(url, "/storage/") {
				if parts := strings.Split(url, "/storage/kanban-uploads/"); len(parts) > 1 {
					key = parts[1]
				}
			}
		}
		if key != "" {
			keys = append(keys, key)
		}
	}
	return keys
}

func (s *projectService) UploadResource(ctx context.Context, projectIDOrPublicID string, fileName string, reader io.Reader, fileSize int64, contentType string) (*models.Project, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	ext := filepath.Ext(fileName)
	objectName := fmt.Sprintf("projects/%s/%s_%s%s", project.ID, time.Now().Format("20060102_150405"), uuid.New().String()[:8], ext)

	var uploadResult *storage.UploadResult
	if s.storage != nil {
		res, err := s.storage.UploadFile(ctx, objectName, reader, fileSize, contentType)
		if err != nil {
			return nil, fmt.Errorf("failed to upload project resource to object storage: %w", err)
		}
		uploadResult = res
	} else {
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

	isImg := strings.HasPrefix(contentType, "image/") || isImageExt(ext)
	resType := "file"
	if isImg {
		resType = "image"
	}

	resourceItem := map[string]interface{}{
		"id":          "res_" + uuid.New().String()[:8],
		"title":       fileName,
		"url":         uploadResult.PublicURL,
		"preview_url": previewURL,
		"type":        resType,
		"size":        formatFileSize(fileSize),
		"mime_type":   contentType,
		"created_at":  time.Now().Format(time.RFC3339),
		"object_key":  uploadResult.ObjectKey,
	}

	settingsMap := make(map[string]interface{})
	if len(project.Settings) > 0 {
		_ = json.Unmarshal(project.Settings, &settingsMap)
	}

	var currentResources []interface{}
	if rawRes, ok := settingsMap["resources"].([]interface{}); ok {
		currentResources = rawRes
	}
	currentResources = append([]interface{}{resourceItem}, currentResources...)
	settingsMap["resources"] = currentResources

	bytes, err := json.Marshal(settingsMap)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"settings": datatypes.JSON(bytes),
	}

	if err := s.projectRepo.UpdateProject(project, updates); err != nil {
		return nil, err
	}

	return s.projectRepo.FindProject(project.ID)
}

// DeleteResource removes a project resource (its object plus derived
// preview/thumbnail keys) and rewrites settings.resources accordingly.
func (s *projectService) DeleteResource(ctx context.Context, projectIDOrPublicID string, resourceID string) (*models.Project, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	var currentResources []interface{}
	if len(project.Settings) > 0 {
		var settingsMap map[string]interface{}
		if err := json.Unmarshal(project.Settings, &settingsMap); err != nil {
			return nil, err
		}
		if raw, ok := settingsMap["resources"].([]interface{}); ok {
			currentResources = raw
		}
	}

	var updated []interface{}
	var targetObjectKey string
	found := false
	for _, r := range currentResources {
		rm, ok := r.(map[string]interface{})
		if !ok {
			continue
		}
		if rm["id"] == resourceID {
			found = true
			targetObjectKey, _ = rm["object_key"].(string)
			if targetObjectKey == "" {
				if url, _ := rm["url"].(string); strings.Contains(url, "/storage/") {
					if parts := strings.Split(url, "/storage/kanban-uploads/"); len(parts) > 1 {
						targetObjectKey = parts[1]
					}
				}
			}
			continue
		}
		updated = append(updated, r)
	}

	if !found {
		return nil, ErrResourceNotFound
	}

	settingsMap := make(map[string]interface{})
	if len(project.Settings) > 0 {
		_ = json.Unmarshal(project.Settings, &settingsMap)
	}
	if len(updated) == 0 {
		delete(settingsMap, "resources")
	} else {
		settingsMap["resources"] = updated
	}
	settingsBytes, err := json.Marshal(settingsMap)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{
		"settings": datatypes.JSON(settingsBytes),
	}

	if err := s.projectRepo.UpdateProject(project, updates); err != nil {
		return nil, err
	}

	if targetObjectKey != "" && s.storage != nil {
		_ = s.variantJobs.DeleteByObjectKeys([]string{targetObjectKey})
		_ = s.storage.DeleteFile(context.Background(), targetObjectKey)
		for _, key := range storage.RelatedKeys(targetObjectKey) {
			_ = s.storage.DeleteFile(context.Background(), key)
		}
	}

	return s.projectRepo.FindProject(project.ID)
}

func isImageExt(ext string) bool {
	lower := strings.ToLower(ext)
	exts := []string{".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"}
	for _, e := range exts {
		if e == lower {
			return true
		}
	}
	return false
}
