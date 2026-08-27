package service

import (
	"log"

	"github.com/Ijon6k/Taskure/apps/api/internal/domain"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/gorm"
)

type WorkspaceService interface {
	EnsureDefaultWorkspace() (*models.Workspace, error)
	GetDefaultWorkspace() (*models.Workspace, error)
	UpdateDefaultWorkspace(updates map[string]interface{}) (*models.Workspace, error)
	BackfillNanoIDs() error
}

type workspaceService struct {
	db   *gorm.DB
	repo repository.WorkspaceRepository
}

// NewWorkspaceService creates the workspace service.
func NewWorkspaceService(db *gorm.DB, repo repository.WorkspaceRepository) WorkspaceService {
	return &workspaceService{db: db, repo: repo}
}

// EnsureDefaultWorkspace seeds the default workspace on a fresh database.
func (s *workspaceService) EnsureDefaultWorkspace() (*models.Workspace, error) {
	ws, err := s.repo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}

	if err := domain.EmitEvent(s.db, nil, "workspace", ws.ID, "workspace.created", map[string]string{"name": ws.Name}); err != nil {
		log.Printf("WARNING: failed to emit workspace.created event: %v", err)
	}

	return ws, nil
}

// GetDefaultWorkspace returns the default workspace with its projects.
func (s *workspaceService) GetDefaultWorkspace() (*models.Workspace, error) {
	return s.repo.GetDefaultWorkspace()
}

// UpdateDefaultWorkspace merges partial updates into workspace settings.
func (s *workspaceService) UpdateDefaultWorkspace(updates map[string]interface{}) (*models.Workspace, error) {
	ws, err := s.repo.GetDefaultWorkspace()
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpdateWorkspace(ws, updates); err != nil {
		return nil, err
	}
	return ws, nil
}

// BackfillNanoIDs assigns public NanoIDs to legacy rows on startup.
func (s *workspaceService) BackfillNanoIDs() error {
	return s.repo.BackfillNanoIDs()
}
