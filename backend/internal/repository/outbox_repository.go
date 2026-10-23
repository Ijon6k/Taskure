package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

type OutboxRepository interface {
	ListUnprocessed(limit int) ([]models.OutboxEvent, error)
	MarkProcessed(id string) error
	IncrementRetry(id string, errMsg string) error
}

type outboxRepository struct {
	db *gorm.DB
}

func NewOutboxRepository(db *gorm.DB) OutboxRepository {
	return &outboxRepository{db: db}
}

func (r *outboxRepository) ListUnprocessed(limit int) ([]models.OutboxEvent, error) {
	if limit <= 0 {
		limit = 50
	}
	var events []models.OutboxEvent
	err := r.db.
		Where("processed = ? AND retry_count < ?", false, 3).
		Order("created_at asc").
		Limit(limit).
		Find(&events).Error
	return events, err
}

func (r *outboxRepository) MarkProcessed(id string) error {
	return r.db.Model(&models.OutboxEvent{}).
		Where("id = ?", id).
		Update("processed", true).Error
}

func (r *outboxRepository) IncrementRetry(id string, errMsg string) error {
	truncated := errMsg
	if len(truncated) > 500 {
		truncated = truncated[:500]
	}
	return r.db.Model(&models.OutboxEvent{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"retry_count": gorm.Expr("retry_count + 1"),
			"last_error":  truncated,
		}).Error
}
