package repository

import (
	"errors"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrNoVariantJobs = errors.New("no variant jobs to claim")

// VariantJobRepository persists image-variant generation jobs.
type VariantJobRepository interface {
	Create(job *models.ImageVariantJob) error
	ClaimNext() (*models.ImageVariantJob, error)
	MarkDone(id string) error
	Requeue(id string, attempts int, lastError string) error
	MarkFailed(id string, attempts int, lastError string) error
	ReclaimProcessing() error
	FailedJobs() ([]models.ImageVariantJob, error)
	DeleteByObjectKeys(keys []string) error
}

type variantJobRepository struct {
	db *gorm.DB
}

// NewVariantJobRepository creates the variant-job repository.
func NewVariantJobRepository(db *gorm.DB) VariantJobRepository {
	return &variantJobRepository{db: db}
}

// Create enqueues a variant job.
func (r *variantJobRepository) Create(job *models.ImageVariantJob) error {
	return r.db.Create(job).Error
}

// ClaimNext atomically claims the oldest pending job. It uses FOR UPDATE SKIP
// LOCKED so concurrent workers never claim the same row and never block each
// other. Returns (nil, nil) when the queue is empty.
func (r *variantJobRepository) ClaimNext() (*models.ImageVariantJob, error) {
	var job models.ImageVariantJob
	err := r.db.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
		Where("status = ?", models.VariantJobPending).
		Order("created_at asc").
		Limit(1).
		Find(&job).Error
	if err != nil {
		return nil, err
	}
	if job.ID == "" {
		return nil, nil
	}
	if err := r.db.Model(&job).Update("status", models.VariantJobProcessing).Error; err != nil {
		return nil, err
	}
	job.Status = models.VariantJobProcessing
	return &job, nil
}

// MarkDone marks a job as completed.
func (r *variantJobRepository) MarkDone(id string) error {
	now := time.Now()
	return r.db.Model(&models.ImageVariantJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":       models.VariantJobDone,
			"last_error":   "",
			"processed_at": &now,
		}).Error
}

// Requeue returns a job to the pending queue.
func (r *variantJobRepository) Requeue(id string, attempts int, lastError string) error {
	return r.db.Model(&models.ImageVariantJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     models.VariantJobPending,
			"attempts":   attempts,
			"last_error": lastError,
		}).Error
}

// MarkFailed records a permanent failure for a job.
func (r *variantJobRepository) MarkFailed(id string, attempts int, lastError string) error {
	now := time.Now()
	return r.db.Model(&models.ImageVariantJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":       models.VariantJobFailed,
			"attempts":     attempts,
			"last_error":   lastError,
			"processed_at": &now,
		}).Error
}

// ReclaimProcessing requeues jobs that were mid-flight when the process died,
// so an interrupted run resumes instead of stalling forever.
func (r *variantJobRepository) ReclaimProcessing() error {
	return r.db.Model(&models.ImageVariantJob{}).
		Where("status = ?", models.VariantJobProcessing).
		Update("status", models.VariantJobPending).Error
}

// FailedJobs returns permanently failed jobs, oldest first, so the worker can
// reconcile them against the actual storage state on startup.
func (r *variantJobRepository) FailedJobs() ([]models.ImageVariantJob, error) {
	var jobs []models.ImageVariantJob
	err := r.db.Where("status = ?", models.VariantJobFailed).
		Order("created_at asc").
		Find(&jobs).Error
	return jobs, err
}

// DeleteByObjectKeys removes jobs for the given original object keys, keeping
// the queue clean when attachments or resources are deleted.
func (r *variantJobRepository) DeleteByObjectKeys(keys []string) error {
	if len(keys) == 0 {
		return nil
	}
	return r.db.Where("object_key IN ?", keys).Delete(&models.ImageVariantJob{}).Error
}
