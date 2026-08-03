package service

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
)

type WorkspaceService interface {
	EnsureDefaultWorkspace() (*models.Workspace, error)
	GetDefaultWorkspace() (*models.Workspace, error)
	UpdateDefaultWorkspace(updates map[string]interface{}) (*models.Workspace, error)
	BackfillNanoIDs() error
}

type workspaceService struct {
	repo repository.WorkspaceRepository
}

// NewWorkspaceService creates the workspace service.
func NewWorkspaceService(repo repository.WorkspaceRepository) WorkspaceService {
	return &workspaceService{repo: repo}
}

// EnsureDefaultWorkspace seeds the default workspace on a fresh database.
func (s *workspaceService) EnsureDefaultWorkspace() (*models.Workspace, error) {
	return s.repo.EnsureUserAndWorkspace()
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
