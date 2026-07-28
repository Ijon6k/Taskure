package service

import (
	"encoding/json"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/repository"
	"gorm.io/datatypes"
)

type CreateProjectInput struct {
	Name         string `json:"name" binding:"required"`
	Description  string `json:"description"`
	Color        string `json:"color"`
	Icon         string `json:"icon"`
	Status       string `json:"status"`
	IsPinned     bool   `json:"is_pinned"`
	FocusEnabled *bool  `json:"focus_enabled"`
}

type ProjectService interface {
	ListProjects(status string, search string, pinned bool) ([]models.Project, error)
	CreateProject(input CreateProjectInput) (*models.Project, error)
	GetProject(idOrPublicID string) (*models.Project, error)
	UpdateProject(idOrPublicID string, updates map[string]interface{}) (*models.Project, error)
	DeleteProject(idOrPublicID string) error
}

type projectService struct {
	projectRepo   repository.ProjectRepository
	workspaceRepo repository.WorkspaceRepository
	columnRepo    repository.ColumnRepository
	taskService   TaskService
}

func NewProjectService(
	projectRepo repository.ProjectRepository,
	workspaceRepo repository.WorkspaceRepository,
	columnRepo repository.ColumnRepository,
	taskService TaskService,
) ProjectService {
	return &projectService{
		projectRepo:   projectRepo,
		workspaceRepo: workspaceRepo,
		columnRepo:    columnRepo,
		taskService:   taskService,
	}
}

func (s *projectService) ListProjects(status string, search string, pinned bool) ([]models.Project, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}
	return s.projectRepo.ListProjects(ws.ID, status, search, pinned)
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

	// Create 3 default columns ("Todo", "In Progress", "Done")
	defaultColumns := []models.Column{
		{Name: "Todo", Behavior: models.ColumnBehaviorActive, Position: 0, ProjectID: project.ID, Color: "#6B7280"},
		{Name: "In Progress", Behavior: models.ColumnBehaviorActive, Position: 1, ProjectID: project.ID, Color: "#3B82F6"},
		{Name: "Done", Behavior: models.ColumnBehaviorCompleted, Position: 2, ProjectID: project.ID, Color: "#22C55E"},
	}

	for _, col := range defaultColumns {
		_ = s.columnRepo.CreateColumn(&col)
	}

	if s.taskService != nil {
		s.taskService.InvalidateFocusCache()
	}

	return s.projectRepo.FindProject(project.PublicID)
}

func (s *projectService) GetProject(idOrPublicID string) (*models.Project, error) {
	return s.projectRepo.FindProject(idOrPublicID)
}

func (s *projectService) UpdateProject(idOrPublicID string, updates map[string]interface{}) (*models.Project, error) {
	project, err := s.projectRepo.FindProject(idOrPublicID)
	if err != nil {
		return nil, err
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
	if s.taskService != nil {
		s.taskService.InvalidateFocusCache()
	}
	return s.projectRepo.FindProject(project.ID)
}

func (s *projectService) DeleteProject(idOrPublicID string) error {
	project, err := s.projectRepo.FindProject(idOrPublicID)
	if err != nil {
		return err
	}
	if s.taskService != nil {
		s.taskService.InvalidateFocusCache()
	}
	return s.projectRepo.DeleteProject(project)
}
