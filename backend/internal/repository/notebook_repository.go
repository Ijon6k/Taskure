package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/util"
	"gorm.io/gorm"
)

type NotebookRepository interface {
	Create(page *models.NotebookPage) error
	CountByProject(projectID string) (int64, error)
	// ListByProject returns page summaries (title + ordering) without the heavy
	// markdown content; callers fetch the full page separately.
	ListByProject(projectID string) ([]models.NotebookPage, error)
	FindByID(id string) (*models.NotebookPage, error)
	Update(page *models.NotebookPage, updates map[string]interface{}) error
	Delete(id string) error
}

type notebookRepository struct {
	db *gorm.DB
}

// NewNotebookRepository creates the notebook page repository.
func NewNotebookRepository(db *gorm.DB) NotebookRepository {
	return &notebookRepository{db: db}
}

// Create persists a new notebook page.
func (r *notebookRepository) Create(page *models.NotebookPage) error {
	return r.db.Create(page).Error
}

// CountByProject counts pages for a project (used for ordering new pages).
func (r *notebookRepository) CountByProject(projectID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.NotebookPage{}).Where("project_id = ?", projectID).Count(&count).Error
	return count, err
}

// ListByProject loads page summaries, pinned first, then by position.
func (r *notebookRepository) ListByProject(projectID string) ([]models.NotebookPage, error) {
	var pages []models.NotebookPage
	err := r.db.
		Select("id", "public_id", "title", "position", "is_pinned", "project_id", "created_at", "updated_at").
		Where("project_id = ?", projectID).
		Order("is_pinned DESC, position ASC, created_at ASC").
		Find(&pages).Error
	return pages, err
}

// FindByID loads one page by internal id or public NanoID.
func (r *notebookRepository) FindByID(id string) (*models.NotebookPage, error) {
	var page models.NotebookPage
	query := r.db.Model(&models.NotebookPage{})
	if util.IsUUID(id) {
		query = query.Where("id = ? OR public_id = ?", id, id)
	} else {
		query = query.Where("public_id = ?", id)
	}
	if err := query.First(&page).Error; err != nil {
		return nil, err
	}
	return &page, nil
}

// Update applies partial updates to a page.
func (r *notebookRepository) Update(page *models.NotebookPage, updates map[string]interface{}) error {
	return r.db.Model(page).Updates(updates).Error
}

// Delete removes a page.
func (r *notebookRepository) Delete(id string) error {
	query := r.db.Model(&models.NotebookPage{})
	if util.IsUUID(id) {
		query = query.Where("id = ? OR public_id = ?", id, id)
	} else {
		query = query.Where("public_id = ?", id)
	}
	return query.Delete(&models.NotebookPage{}).Error
}
