package service

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"sync"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/Ijon6k/Taskure/apps/api/internal/viewmodels"
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

// Enum whitelist for project status — invalid values fall back to "active".
var validProjectStatuses = map[string]bool{
	"active": true, "paused": true, "completed": true, "archived": true,
}

// UpdateProjectInput is the typed PATCH payload. Pointer fields distinguish
// "absent" (no change) from explicit values; nil never reaches the DB.
type UpdateProjectInput struct {
	Name         *string `json:"name"`
	Description  *string `json:"description"`
	Color        *string `json:"color"`
	Icon         *string `json:"icon"`
	Status       *string `json:"status"`
	IsPinned     *bool   `json:"is_pinned"`
	IsArchived   *bool   `json:"is_archived"`
	FocusEnabled *bool   `json:"focus_enabled"`
	// Overview metadata — merged into the settings JSONB column.
	TargetGoal    *string                `json:"target_goal"`
	TargetDate    *string                `json:"target_date"`
	Tags          *[]string              `json:"tags"`
	Resources     *interface{}           `json:"resources"`
	StrategyNotes *string                `json:"strategy_notes"`
	Settings      map[string]interface{} `json:"settings"`
}

type ProjectService interface {
	ListProjects(status string, search string, pinned bool) ([]models.Project, error)
	ListProjectsSummary(status string, search string, pinned bool) ([]viewmodels.ProjectSummary, error)
	CreateProject(input CreateProjectInput) (*models.Project, error)
	GetProject(idOrPublicID string) (*models.Project, error)
	GetProjectBoard(idOrPublicID string) (*models.Project, error)
	GetProjectOverview(idOrPublicID string) (*models.Project, error)
	UpdateProject(idOrPublicID string, input *UpdateProjectInput) (*models.Project, error)
	DeleteProject(idOrPublicID string) error

	// MinIO Resource Upload
	UploadResource(ctx context.Context, projectIDOrPublicID string, fileName string, reader io.Reader, fileSize int64, contentType string) (*models.Project, error)
	DeleteResource(ctx context.Context, projectIDOrPublicID string, resourceID string) (*models.Project, error)

	// Asset Explorer
	ListProjectAssets(idOrPublicID string) (*viewmodels.ProjectAssets, error)
}

type projectService struct {
	projectRepo   repository.ProjectRepository
	workspaceRepo repository.WorkspaceRepository
	columnRepo    repository.ColumnRepository
	taskRepo      repository.TaskRepository
	variantJobs   repository.VariantJobRepository
	storage       storage.StorageService

	// Serializes read-modify-write cycles over project settings.resources
	// (UploadResource / DeleteResource) — concurrent calls would otherwise
	// overwrite each other's changes.
	resourcesMu sync.Mutex
}

// NewProjectService creates the project service.
func NewProjectService(
	projectRepo repository.ProjectRepository,
	workspaceRepo repository.WorkspaceRepository,
	columnRepo repository.ColumnRepository,
	taskRepo repository.TaskRepository,
	variantJobs repository.VariantJobRepository,
	storage storage.StorageService,
) ProjectService {
	return &projectService{
		projectRepo:   projectRepo,
		workspaceRepo: workspaceRepo,
		columnRepo:    columnRepo,
		taskRepo:      taskRepo,
		variantJobs:   variantJobs,
		storage:       storage,
	}
}

// ListProjects returns the user's projects with columns and per-column task counts.
func (s *projectService) ListProjects(status string, search string, pinned bool) ([]models.Project, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}
	projects, _, err := s.projectRepo.ListProjectsLight(ws.ID, status, search, pinned, 0, 0)
	return projects, err
}

// ListProjectsSummary returns the lightweight list payload: the same query as
// ListProjects, mapped to a view that omits heavy, unused fields (settings
// JSONB, workspace/owner ids, timestamps).
func (s *projectService) ListProjectsSummary(status string, search string, pinned bool) ([]viewmodels.ProjectSummary, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}
	projects, _, err := s.projectRepo.ListProjectsLight(ws.ID, status, search, pinned, 0, 0)
	if err != nil {
		return nil, err
	}

	summaries := make([]viewmodels.ProjectSummary, 0, len(projects))
	for _, project := range projects {
		summaries = append(summaries, viewmodels.MapProjectSummary(project))
	}
	return summaries, nil
}

// CreateProject creates a project with its default columns from the typed input.
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

// GetProject returns the light payload (metadata + settings + columns with
// task counts, no task rows). Consumers that render the full board must use
// GetProjectBoard.
func (s *projectService) GetProject(idOrPublicID string) (*models.Project, error) {
	return s.projectRepo.FindProjectLight(idOrPublicID)
}

// GetProjectBoard returns the full payload: columns, tasks and checklist
// items, used only by the board page and its heavy consumers.
func (s *projectService) GetProjectBoard(idOrPublicID string) (*models.Project, error) {
	return s.projectRepo.FindProject(idOrPublicID)
}

// GetProjectOverview returns the lightweight overview payload (columns + light task fields).
func (s *projectService) GetProjectOverview(idOrPublicID string) (*models.Project, error) {
	return s.projectRepo.FindProjectOverview(idOrPublicID)
}

// UpdateProject applies typed updates, merging overview metadata into the settings JSONB column.
func (s *projectService) UpdateProject(idOrPublicID string, input *UpdateProjectInput) (*models.Project, error) {
	if input == nil {
		project, err := s.projectRepo.FindProject(idOrPublicID)
		if err != nil {
			return nil, err
		}
		return s.projectRepo.FindProject(project.ID)
	}

	// settings.resources is read-modify-write across UpdateProject (link
	// edits), UploadResource and DeleteResource — serialize them all so a
	// concurrent upload/delete cannot clobber a settings merge.
	s.resourcesMu.Lock()
	defer s.resourcesMu.Unlock()

	project, err := s.projectRepo.FindProject(idOrPublicID)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})

	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.Color != nil {
		updates["color"] = *input.Color
	}
	if input.Icon != nil {
		updates["icon"] = *input.Icon
	}
	if input.Status != nil {
		status := strings.ToLower(strings.TrimSpace(*input.Status))
		if !validProjectStatuses[status] {
			status = "active"
		}
		updates["status"] = status
	}
	if input.IsPinned != nil {
		updates["is_pinned"] = *input.IsPinned
	}
	if input.IsArchived != nil {
		updates["is_archived"] = *input.IsArchived
	}
	if input.FocusEnabled != nil {
		updates["focus_enabled"] = *input.FocusEnabled
	}

	// Automatically unpin project if status is changed to completed or archived
	if statusVal, ok := updates["status"].(string); ok && (statusVal == "completed" || statusVal == "archived") {
		updates["is_pinned"] = false
	}

	// Merge the overview metadata keys into the settings JSONB column.
	settingsMap := make(map[string]interface{})
	if len(project.Settings) > 0 {
		_ = json.Unmarshal(project.Settings, &settingsMap)
	}

	hasSettingsUpdate := false
	if input.TargetGoal != nil {
		settingsMap["target_goal"] = *input.TargetGoal
		hasSettingsUpdate = true
	}
	if input.TargetDate != nil {
		settingsMap["target_date"] = *input.TargetDate
		hasSettingsUpdate = true
	}
	if input.Tags != nil {
		settingsMap["tags"] = *input.Tags
		hasSettingsUpdate = true
	}
	if input.Resources != nil {
		settingsMap["resources"] = *input.Resources
		hasSettingsUpdate = true
	}
	if input.StrategyNotes != nil {
		settingsMap["strategy_notes"] = *input.StrategyNotes
		hasSettingsUpdate = true
	}
	if input.Settings != nil {
		for subK, subV := range input.Settings {
			settingsMap[subK] = subV
		}
		hasSettingsUpdate = true
	}

	if hasSettingsUpdate {
		if bytes, err := json.Marshal(settingsMap); err == nil {
			updates["settings"] = datatypes.JSON(bytes)
		}
	}

	if err := s.projectRepo.UpdateProject(project, updates); err != nil {
		return nil, err
	}
	return s.projectRepo.FindProject(project.ID)
}

// DeleteProject removes a project and deletes its stored objects from object storage.
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
