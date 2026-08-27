package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type MemoryRepository interface {
	Upsert(memory *models.ProjectMemory) error
	FindByProject(projectID string) (*models.ProjectMemory, error)
	SaveHistory(snapshot datatypes.JSON, projectID string, triggerEvent string) error
	GetHistory(projectID string, limit int) ([]models.MemoryHistory, error)
}

type memoryRepository struct {
	db *gorm.DB
}

func NewMemoryRepository(db *gorm.DB) MemoryRepository {
	return &memoryRepository{db: db}
}

func (r *memoryRepository) Upsert(memory *models.ProjectMemory) error {
	return r.db.Where("project_id = ?", memory.ProjectID).
		Assign(memory).FirstOrCreate(memory).Error
}

func (r *memoryRepository) FindByProject(projectID string) (*models.ProjectMemory, error) {
	var memory models.ProjectMemory
	err := r.db.Where("project_id = ?", projectID).First(&memory).Error
	if err != nil {
		return nil, err
	}
	return &memory, nil
}

func (r *memoryRepository) SaveHistory(snapshot datatypes.JSON, projectID string, triggerEvent string) error {
	entry := models.MemoryHistory{
		ProjectID:    projectID,
		Snapshot:     snapshot,
		TriggerEvent: triggerEvent,
	}
	return r.db.Create(&entry).Error
}

func (r *memoryRepository) GetHistory(projectID string, limit int) ([]models.MemoryHistory, error) {
	if limit <= 0 {
		limit = 10
	}
	var history []models.MemoryHistory
	err := r.db.Where("project_id = ?", projectID).
		Order("created_at DESC").Limit(limit).Find(&history).Error
	return history, err
}
