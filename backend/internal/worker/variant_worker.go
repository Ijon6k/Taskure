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

// Start reclaims interrupted jobs and spawns the worker goroutines. It returns
// immediately; Wait blocks until every worker has exited.
func (w *VariantWorker) Start(ctx context.Context) {
	if err := w.repo.ReclaimProcessing(); err != nil {
		w.logger.Warn().Err(err).Msg("failed to reclaim interrupted variant jobs")
	} else {
		w.logger.Info().Msg("reclaimed interrupted variant jobs")
	}

	w.logger.Info().Int("workers", w.workers).Msg("variant worker started")
	for i := 0; i < w.workers; i++ {
		w.wg.Add(1)
		go w.run(ctx, i)
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
