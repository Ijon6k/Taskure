package service

import (
	"log"

	"github.com/Ijon6k/Taskure/apps/api/internal/domain"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/gorm"
)

type CreateColumnInput struct {
	Name     string `json:"name" binding:"required"`
	Color    string `json:"color"`
	Behavior string `json:"behavior"`
}

type ColumnService interface {
	CreateColumn(projectIDOrPublicID string, input CreateColumnInput) (*models.Column, error)
	GetColumn(id string) (*models.Column, error)
	UpdateColumn(id string, updates map[string]interface{}) (*models.Column, error)
	DeleteColumn(id string) error
}

type columnService struct {
	db          *gorm.DB
	columnRepo  repository.ColumnRepository
	projectRepo repository.ProjectRepository
}

// NewColumnService creates the column service.
func NewColumnService(
	db *gorm.DB,
	columnRepo repository.ColumnRepository,
	projectRepo repository.ProjectRepository,
) ColumnService {
	return &columnService{
		db:          db,
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

	if err := domain.EmitEvent(s.db, nil, "column", col.ID, "column.created", map[string]string{"name": col.Name, "project_id": project.ID}); err != nil {
		log.Printf("WARNING: failed to emit column.created event: %v", err)
	}

	return &col, nil
}

// GetColumn returns a single column by ID.
func (s *columnService) GetColumn(id string) (*models.Column, error) {
	return s.columnRepo.FindColumnByID(id)
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
	col, err := s.columnRepo.FindColumnByID(id)
	if err != nil {
		return err
	}

	if err := s.columnRepo.DeleteColumn(id); err != nil {
		return err
	}

	if err := domain.EmitEvent(s.db, nil, "column", col.ID, "column.deleted", map[string]string{"name": col.Name, "project_id": col.ProjectID}); err != nil {
		log.Printf("WARNING: failed to emit column.deleted event: %v", err)
	}

	return nil
}
