package service

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
)

type CreateColumnInput struct {
	Name     string `json:"name" binding:"required"`
	Color    string `json:"color"`
	Behavior string `json:"behavior"`
}

type ColumnService interface {
	CreateColumn(projectIDOrPublicID string, input CreateColumnInput) (*models.Column, error)
	UpdateColumn(id string, updates map[string]interface{}) (*models.Column, error)
	DeleteColumn(id string) error
}

type columnService struct {
	columnRepo  repository.ColumnRepository
	projectRepo repository.ProjectRepository
}

// NewColumnService creates the column service.
func NewColumnService(
	columnRepo repository.ColumnRepository,
	projectRepo repository.ProjectRepository,
) ColumnService {
	return &columnService{
		columnRepo:  columnRepo,
		projectRepo: projectRepo,
	}
}

// CreateColumn creates a column, deriving a unique name when only a project is given.
func (s *columnService) CreateColumn(projectIDOrPublicID string, input CreateColumnInput) (*models.Column, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	count, err := s.columnRepo.GetCountByProjectID(project.ID)
	if err != nil {
		return nil, err
	}

	behavior := input.Behavior
	if behavior == "" {
		behavior = models.ColumnBehaviorActive
	}

	col := models.Column{
		Name:      input.Name,
		Behavior:  behavior,
		Color:     input.Color,
		Position:  int(count),
		ProjectID: project.ID,
	}

	if err := s.columnRepo.CreateColumn(&col); err != nil {
		return nil, err
	}
	return &col, nil
}

// UpdateColumn renames or repositions a column.
func (s *columnService) UpdateColumn(id string, updates map[string]interface{}) (*models.Column, error) {
	col, err := s.columnRepo.FindColumnByID(id)
	if err != nil {
		return nil, err
	}

	if err := s.columnRepo.UpdateColumn(col, updates); err != nil {
		return nil, err
	}
	return col, nil
}

// DeleteColumn removes a column (tasks cascade).
func (s *columnService) DeleteColumn(id string) error {
	return s.columnRepo.DeleteColumn(id)
}
