package repository

import (
	"strings"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProjectRepository interface {
	ListProjects(workspaceID string, status string, search string, pinned bool) ([]models.Project, error)
	CreateProject(project *models.Project) error
	FindProject(idOrPublicID string) (*models.Project, error)
	UpdateProject(project *models.Project, updates map[string]interface{}) error
	DeleteProject(project *models.Project) error
	GetAllProjects() ([]models.Project, error)
}

type projectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepository{db: db}
}

func isUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

func (r *projectRepository) ListProjects(workspaceID string, status string, search string, pinned bool) ([]models.Project, error) {
	query := r.db.Where("workspace_id = ?", workspaceID)

	if status != "" && status != "all" {
		if status == "archived" {
			query = query.Where("is_archived = ? OR status = ?", true, "archived")
		} else {
			query = query.Where("status = ?", status)
		}
	}

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", s, s)
	}

	if pinned {
		query = query.Where("is_pinned = ?", true)
	}

	var projects []models.Project
	err := query.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Columns.Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).
		Order("is_pinned desc, created_at desc").
		Find(&projects).Error

	return projects, err
}



func (r *projectRepository) CreateProject(project *models.Project) error {
	return r.db.Create(project).Error
}

func (r *projectRepository) FindProject(idOrPublicID string) (*models.Project, error) {
	var project models.Project
	query := r.db.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Columns.Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc").Preload("ChecklistItems").Preload("Labels")
	})

	if isUUID(idOrPublicID) {
		query = query.Where("id = ? OR public_id = ?", idOrPublicID, idOrPublicID)
	} else {
		query = query.Where("public_id = ?", idOrPublicID)
	}

	err := query.First(&project).Error
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *projectRepository) UpdateProject(project *models.Project, updates map[string]interface{}) error {
	return r.db.Model(project).Updates(updates).Error
}

func (r *projectRepository) DeleteProject(project *models.Project) error {
	return r.db.Delete(project).Error
}

func (r *projectRepository) GetAllProjects() ([]models.Project, error) {
	var projects []models.Project
	err := r.db.Find(&projects).Error
	return projects, err
}
