package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

type TaskRepository interface {
	CreateTask(task *models.Task) error
	GetCountByColumnID(columnID string) (int64, error)
	FindTask(idOrPublicID string) (*models.Task, error)
	UpdateTask(task *models.Task, updates map[string]interface{}) error
	DeleteTask(task *models.Task) error
	GetPendingTasks() ([]models.Task, error)

	// Checklist
	AddChecklistItem(item *models.ChecklistItem) error
	GetChecklistCount(taskID string) (int64, error)
	FindChecklistItem(id string) (*models.ChecklistItem, error)
	UpdateChecklistItem(item *models.ChecklistItem, updates map[string]interface{}) error
	DeleteChecklistItem(id string) error
}

type taskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) CreateTask(task *models.Task) error {
	return r.db.Create(task).Error
}

func (r *taskRepository) GetCountByColumnID(columnID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Task{}).Where("column_id = ?", columnID).Count(&count).Error
	return count, err
}

func (r *taskRepository) FindTask(idOrPublicID string) (*models.Task, error) {
	var task models.Task
	query := r.db.Preload("ChecklistItems", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Labels")

	if isUUID(idOrPublicID) {
		query = query.Where("id = ? OR public_id = ?", idOrPublicID, idOrPublicID)
	} else {
		query = query.Where("public_id = ?", idOrPublicID)
	}

	err := query.First(&task).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) UpdateTask(task *models.Task, updates map[string]interface{}) error {
	return r.db.Model(task).Updates(updates).Error
}

func (r *taskRepository) DeleteTask(task *models.Task) error {
	return r.db.Delete(task).Error
}

func (r *taskRepository) GetPendingTasks() ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.Preload("Column").Preload("ChecklistItems", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Labels").Find(&tasks).Error
	return tasks, err
}

func (r *taskRepository) AddChecklistItem(item *models.ChecklistItem) error {
	return r.db.Create(item).Error
}

func (r *taskRepository) GetChecklistCount(taskID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.ChecklistItem{}).Where("task_id = ?", taskID).Count(&count).Error
	return count, err
}

func (r *taskRepository) FindChecklistItem(id string) (*models.ChecklistItem, error) {
	var item models.ChecklistItem
	if err := r.db.First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *taskRepository) UpdateChecklistItem(item *models.ChecklistItem, updates map[string]interface{}) error {
	return r.db.Model(item).Updates(updates).Error
}

func (r *taskRepository) DeleteChecklistItem(id string) error {
	return r.db.Delete(&models.ChecklistItem{}, "id = ?", id).Error
}
