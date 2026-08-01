// Package worker hosts background jobs for the kanban API.
package worker

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/imageutil"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/rs/zerolog"
)

const (
	// pollInterval is how often an idle worker re-checks the job queue.
	pollInterval = 500 * time.Millisecond
	// defaultMaxAttempts bounds how many times a job is retried before being
	// marked failed.
	defaultMaxAttempts = 5
)

// VariantWorker generates image variants from the queue in the background, so
// uploads never wait on the encode step. Concurrency is bounded by workers.
type VariantWorker struct {
	repo        repository.VariantJobRepository
	storage     storage.StorageService
	logger      zerolog.Logger
	workers     int
	maxAttempts int
	wg          sync.WaitGroup
}

func NewVariantWorker(repo repository.VariantJobRepository, storageSvc storage.StorageService, logger zerolog.Logger, workers int) *VariantWorker {
	if workers < 1 {
		workers = 1
	}
	if workers > 4 {
		workers = 4
	}
	return &VariantWorker{
		repo:        repo,
		storage:     storageSvc,
		logger:      logger.With().Str("component", "variant-worker").Logger(),
		workers:     workers,
		maxAttempts: defaultMaxAttempts,
	}
}

// Start reclaims interrupted jobs, reconciles failed ones against storage, and
// spawns the worker goroutines. It returns immediately; Wait blocks until every
// worker has exited.
func (w *VariantWorker) Start(ctx context.Context) {
	if err := w.repo.ReclaimProcessing(); err != nil {
		w.logger.Warn().Err(err).Msg("failed to reclaim interrupted variant jobs")
	} else {
		w.logger.Info().Msg("reclaimed interrupted variant jobs")
	}

	w.Reconcile(ctx)

	w.logger.Info().Int("workers", w.workers).Msg("variant worker started")
	for i := 0; i < w.workers; i++ {
		w.wg.Add(1)
		go w.run(ctx, i)
	}
}

// Reconcile revives failed jobs whose source object still exists but whose
// variants are still missing, so transient worker failures heal on the next
// startup. Jobs that already produced variants are marked done, and jobs whose
// source was deleted are left alone.
func (w *VariantWorker) Reconcile(ctx context.Context) {
	jobs, err := w.repo.FailedJobs()
	if err != nil {
		w.logger.Warn().Err(err).Msg("failed to load failed variant jobs")
		return
	}

	revived := 0
	for _, job := range jobs {
		exists, err := w.storage.ObjectExists(ctx, job.ObjectKey)
		if err != nil {
			w.logger.Warn().Err(err).Str("object_key", job.ObjectKey).Msg("failed to check source object during reconcile")
			continue
		}
		if !exists {
			continue
		}

		previewReady, err := w.storage.ObjectExists(ctx, storage.ThumbKey(job.ObjectKey, storage.PreviewWidth))
		if err != nil {
			w.logger.Warn().Err(err).Str("object_key", job.ObjectKey).Msg("failed to check variant during reconcile")
			continue
		}
		if previewReady {
			if err := w.repo.MarkDone(job.ID); err != nil {
				w.logger.Warn().Err(err).Str("object_key", job.ObjectKey).Msg("failed to mark stale variant job done")
			}
			continue
		}

		if err := w.repo.Requeue(job.ID, 0, ""); err != nil {
			w.logger.Warn().Err(err).Str("object_key", job.ObjectKey).Msg("failed to requeue failed variant job")
			continue
		}
		revived++
	}

	if revived > 0 {
		w.logger.Info().Int("revived", revived).Msg("revived failed variant jobs")
	}
}

// Wait blocks until all worker goroutines have exited.
func (w *VariantWorker) Wait() {
	w.wg.Wait()
	w.logger.Info().Msg("variant worker stopped")
}

func (w *VariantWorker) run(ctx context.Context, id int) {
	defer w.wg.Done()
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := w.processNext(ctx); err != nil {
				w.logger.Error().Err(err).Msg("worker run error")
			}
		}
	}
}

func (w *VariantWorker) processNext(ctx context.Context) error {
	job, err := w.repo.ClaimNext()
	if err != nil {
		return fmt.Errorf("claim variant job: %w", err)
	}
	if job == nil {
		return nil
	}

	if err := w.processJob(ctx, job); err != nil {
		attempts := job.Attempts + 1
		w.logger.Error().
			Err(err).
			Str("object_key", job.ObjectKey).
			Int("attempts", attempts).
			Msg("variant job failed")
		if attempts >= w.maxAttempts {
			return w.repo.MarkFailed(job.ID, attempts, err.Error())
		}
		return w.repo.Requeue(job.ID, attempts, err.Error())
	}

	w.logger.Info().Str("object_key", job.ObjectKey).Msg("variant job done")
	return w.repo.MarkDone(job.ID)
}

func (w *VariantWorker) processJob(ctx context.Context, job *models.ImageVariantJob) error {
	obj, err := w.storage.GetObject(ctx, job.ObjectKey)
	if err != nil {
		return fmt.Errorf("get original: %w", err)
	}
	defer obj.Close()

	body, err := io.ReadAll(obj)
	if err != nil {
		return fmt.Errorf("read original: %w", err)
	}

	variants, err := imageutil.BuildVariants(body, imageutil.PreviewQuality, storage.ThumbWidths)
	if err != nil {
		return fmt.Errorf("build variants: %w", err)
	}

	for _, width := range storage.ThumbWidths {
		encoded, ok := variants[width]
		if !ok {
			continue
		}
		if _, err := w.storage.UploadFile(ctx, storage.ThumbKey(job.ObjectKey, width), bytes.NewReader(encoded), int64(len(encoded)), "image/webp"); err != nil {
			return fmt.Errorf("upload variant %dpx: %w", width, err)
		}
	}
	return nil
}
