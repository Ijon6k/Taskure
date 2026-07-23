package repository

import (
	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"gorm.io/gorm"
)

type ColumnRepository interface {
	CreateColumn(col *models.Column) error
	GetCountByProjectID(projectID string) (int64, error)
	FindColumnByID(id string) (*models.Column, error)
	UpdateColumn(col *models.Column, updates map[string]interface{}) error
	DeleteColumn(id string) error
}

type columnRepository struct {
	db *gorm.DB
}

func NewColumnRepository(db *gorm.DB) ColumnRepository {
	return &columnRepository{db: db}
}

func (r *columnRepository) CreateColumn(col *models.Column) error {
	return r.db.Create(col).Error
}

func (r *columnRepository) GetCountByProjectID(projectID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Column{}).Where("project_id = ?", projectID).Count(&count).Error
	return count, err
}

func (r *columnRepository) FindColumnByID(id string) (*models.Column, error) {
	var col models.Column
	if err := r.db.First(&col, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &col, nil
}

func (r *columnRepository) UpdateColumn(col *models.Column, updates map[string]interface{}) error {
	return r.db.Model(col).Updates(updates).Error
}

func (r *columnRepository) DeleteColumn(id string) error {
	return r.db.Delete(&models.Column{}, "id = ?", id).Error
}
