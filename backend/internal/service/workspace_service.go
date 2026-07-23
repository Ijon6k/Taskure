package service

import (
	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/repository"
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

func NewWorkspaceService(repo repository.WorkspaceRepository) WorkspaceService {
	return &workspaceService{repo: repo}
}

func (s *workspaceService) EnsureDefaultWorkspace() (*models.Workspace, error) {
	return s.repo.EnsureUserAndWorkspace()
}

func (s *workspaceService) GetDefaultWorkspace() (*models.Workspace, error) {
	return s.repo.GetDefaultWorkspace()
}

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

func (s *workspaceService) BackfillNanoIDs() error {
	return s.repo.BackfillNanoIDs()
}
