package repository

import (
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/util"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TaskRepository interface {
	CreateTask(task *models.Task) error
	GetCountByColumnID(columnID string) (int64, error)
	FindTask(idOrPublicID string) (*models.Task, error)
	UpdateTask(task *models.Task, updates map[string]interface{}) error
	DeleteTask(task *models.Task) error
	GetPendingTasks(projectID string, limit int) ([]models.Task, error)

	// Tag Stats
	RecordTagUsage(projectID string, tags []string) error
	GetSuggestedTags(projectID string, limit int) ([]models.ProjectTagStat, error)

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

	if util.IsUUID(idOrPublicID) {
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

func (r *taskRepository) GetPendingTasks(projectID string, limit int) ([]models.Task, error) {
	var tasks []models.Task
	query := r.db.Where("status != ?", "done")
	if projectID != "" {
		if util.IsUUID(projectID) {
			query = query.Where("project_id = ?", projectID)
		} else {
			var proj models.Project
			if err := r.db.Select("id").Where("public_id = ?", projectID).First(&proj).Error; err == nil {
				query = query.Where("project_id = ?", proj.ID)
			} else {
				query = query.Where("project_id = ?", projectID)
			}
		}
	}
	if limit <= 0 {
		limit = 100
	}
	err := query.Limit(limit).
		Preload("Column").
		Preload("ChecklistItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("position asc")
		}).
		Preload("Labels").
		Find(&tasks).Error
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

func (r *taskRepository) RecordTagUsage(projectID string, tags []string) error {
	if projectID == "" || len(tags) == 0 {
		return nil
	}
	now := time.Now()
	for _, tag := range tags {
		cleanTag := strings.TrimSpace(tag)
		if cleanTag == "" {
			continue
		}
		stat := models.ProjectTagStat{
			ProjectID:  projectID,
			TagName:    cleanTag,
			UsageCount: 1,
			LastUsedAt: now,
		}
		err := r.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "project_id"}, {Name: "tag_name"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"usage_count":  gorm.Expr("project_tag_stats.usage_count + 1"),
				"last_used_at": now,
				"updated_at":   now,
			}),
		}).Create(&stat).Error
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *taskRepository) GetSuggestedTags(projectID string, limit int) ([]models.ProjectTagStat, error) {
	if limit <= 0 {
		limit = 10
	}
	var stats []models.ProjectTagStat
	err := r.db.Where("project_id = ?", projectID).
		Order("usage_count DESC, last_used_at DESC").
		Limit(limit).
		Find(&stats).Error
	return stats, err
}
