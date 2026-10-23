package repository

import (
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

type JournalRepository interface {
	Create(entry *models.JournalEntry) error
	FindRecent(projectID string, limit int) ([]models.JournalEntry, error)
	FindByEventType(projectID string, eventType string, limit int) ([]models.JournalEntry, error)
	Search(projectID string, query string, limit int) ([]models.JournalEntry, error)
	CreateSynthesis(synthesis *models.JournalSynthesis) error
	GetSyntheses(projectID string, limit int) ([]models.JournalSynthesis, error)
}

type journalRepository struct {
	db *gorm.DB
}

func NewJournalRepository(db *gorm.DB) JournalRepository {
	return &journalRepository{db: db}
}

func (r *journalRepository) Create(entry *models.JournalEntry) error {
	if entry.OccurredAt.IsZero() {
		entry.OccurredAt = time.Now()
	}
	return r.db.Create(entry).Error
}

func (r *journalRepository) FindRecent(projectID string, limit int) ([]models.JournalEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	var entries []models.JournalEntry
	err := r.db.Where("project_id = ?", projectID).
		Order("occurred_at DESC").Limit(limit).Find(&entries).Error
	return entries, err
}

func (r *journalRepository) FindByEventType(projectID string, eventType string, limit int) ([]models.JournalEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	var entries []models.JournalEntry
	err := r.db.Where("project_id = ? AND event_type = ?", projectID, eventType).
		Order("occurred_at DESC").Limit(limit).Find(&entries).Error
	return entries, err
}

func (r *journalRepository) Search(projectID string, query string, limit int) ([]models.JournalEntry, error) {
	if limit <= 0 {
		limit = 30
	}
	var entries []models.JournalEntry
	err := r.db.Where("project_id = ? AND summary ILIKE ?", projectID, "%"+query+"%").
		Order("occurred_at DESC").Limit(limit).Find(&entries).Error
	return entries, err
}

func (r *journalRepository) CreateSynthesis(synthesis *models.JournalSynthesis) error {
	return r.db.Create(synthesis).Error
}

func (r *journalRepository) GetSyntheses(projectID string, limit int) ([]models.JournalSynthesis, error) {
	if limit <= 0 {
		limit = 20
	}
	var syntheses []models.JournalSynthesis
	err := r.db.Where("project_id = ?", projectID).
		Order("period_start DESC").Limit(limit).Find(&syntheses).Error
	return syntheses, err
}
