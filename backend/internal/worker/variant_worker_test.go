package worker

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"io"
	"testing"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/rs/zerolog"
)

type fakeVariantRepo struct {
	job          *models.ImageVariantJob
	claimed      bool
	doneCalled   bool
	requeued     bool
	failed       bool
	lastAttempts int
	lastError    string
}

func (f *fakeVariantRepo) Create(job *models.ImageVariantJob) error { return nil }
func (f *fakeVariantRepo) ClaimNext() (*models.ImageVariantJob, error) {
	if f.job == nil || f.claimed {
		return nil, nil
	}
	f.claimed = true
	return f.job, nil
}
func (f *fakeVariantRepo) MarkDone(id string) error {
	f.doneCalled = true
	return nil
}
func (f *fakeVariantRepo) Requeue(id string, attempts int, lastError string) error {
	f.requeued = true
	f.lastAttempts = attempts
	f.lastError = lastError
	return nil
}
func (f *fakeVariantRepo) MarkFailed(id string, attempts int, lastError string) error {
	f.failed = true
	f.lastAttempts = attempts
	f.lastError = lastError
	return nil
}
func (f *fakeVariantRepo) ReclaimProcessing() error               { return nil }
func (f *fakeVariantRepo) DeleteByObjectKeys(keys []string) error { return nil }

type fakeStorage struct {
	objects  map[string][]byte
	uploaded map[string]string
	getErr   error
}

func (f *fakeStorage) EnsureBucket(ctx context.Context) error { return nil }
func (f *fakeStorage) UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (*storage.UploadResult, error) {
	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}
	if f.uploaded == nil {
		f.uploaded = map[string]string{}
	}
	f.uploaded[objectName] = contentType
	return &storage.UploadResult{
		ObjectKey: objectName,
		PublicURL: "/storage/kanban-uploads/" + objectName,
		Size:      int64(len(data)),
	}, nil
}
func (f *fakeStorage) DeleteFile(ctx context.Context, objectName string) error {
	delete(f.objects, objectName)
	return nil
}
func (f *fakeStorage) ObjectExists(ctx context.Context, objectName string) (bool, error) {
	_, ok := f.objects[objectName]
	return ok, nil
}
func (f *fakeStorage) GetObject(ctx context.Context, objectName string) (io.ReadCloser, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	data, ok := f.objects[objectName]
	if !ok {
		return nil, errors.New("no such object")
	}
	return io.NopCloser(bytes.NewReader(data)), nil
}
func (f *fakeStorage) GetPublicURL(objectName string) string {
	return "/storage/kanban-uploads/" + objectName
}

func testPNG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode test png: %v", err)
	}
	return buf.Bytes()
}

func newTestWorker(repo *fakeVariantRepo, store *fakeStorage) *VariantWorker {
	return NewVariantWorker(repo, store, zerolog.Nop(), 1)
}

func TestProcessJobGeneratesVariants(t *testing.T) {
	const objectKey = "tasks/task-id/img.png"
	repo := &fakeVariantRepo{job: &models.ImageVariantJob{ObjectKey: objectKey}}
	store := &fakeStorage{objects: map[string][]byte{objectKey: testPNG(t, 3000, 2000)}}

	if err := newTestWorker(repo, store).processNext(context.Background()); err != nil {
		t.Fatalf("processNext failed: %v", err)
	}

	if !repo.doneCalled {
		t.Error("expected job to be marked done")
	}
	if len(store.uploaded) != len(storage.ThumbWidths) {
		t.Fatalf("expected %d variant uploads, got %d", len(storage.ThumbWidths), len(store.uploaded))
	}
	for _, w := range storage.ThumbWidths {
		key := storage.ThumbKey(objectKey, w)
		if ct, ok := store.uploaded[key]; !ok {
			t.Errorf("missing variant upload %s", key)
		} else if ct != "image/webp" {
			t.Errorf("variant %s content type = %q, want image/webp", key, ct)
		}
	}
}

func TestProcessNextRequeuesOnFailure(t *testing.T) {
	const objectKey = "tasks/task-id/img.png"
	repo := &fakeVariantRepo{job: &models.ImageVariantJob{ObjectKey: objectKey}}
	store := &fakeStorage{
		objects: map[string][]byte{objectKey: testPNG(t, 100, 100)},
		getErr:  errors.New("minio unavailable"),
	}

	worker := newTestWorker(repo, store)
	if err := worker.processNext(context.Background()); err != nil {
		t.Fatalf("processNext should not surface repo errors: %v", err)
	}

	if !repo.requeued {
		t.Fatal("expected job to be requeued on failure")
	}
	if repo.lastAttempts != 1 {
		t.Errorf("attempts = %d, want 1", repo.lastAttempts)
	}
	if repo.lastError == "" {
		t.Error("expected a recorded error message")
	}
}

func TestProcessNextFailsAfterMaxAttempts(t *testing.T) {
	const objectKey = "tasks/task-id/img.png"
	repo := &fakeVariantRepo{job: &models.ImageVariantJob{
		ObjectKey: objectKey,
		Attempts:  defaultMaxAttempts - 1,
	}}
	store := &fakeStorage{
		objects: map[string][]byte{objectKey: testPNG(t, 100, 100)},
		getErr:  errors.New("minio unavailable"),
	}

	worker := newTestWorker(repo, store)
	if err := worker.processNext(context.Background()); err != nil {
		t.Fatalf("processNext should not surface repo errors: %v", err)
	}

	if !repo.failed {
		t.Fatal("expected job to be marked failed after max attempts")
	}
	if repo.lastAttempts != defaultMaxAttempts {
		t.Errorf("attempts = %d, want %d", repo.lastAttempts, defaultMaxAttempts)
	}
}

func TestProcessNextEmptyQueue(t *testing.T) {
	repo := &fakeVariantRepo{}
	store := &fakeStorage{}

	if err := newTestWorker(repo, store).processNext(context.Background()); err != nil {
		t.Fatalf("empty queue should return nil, got %v", err)
	}
	if repo.doneCalled || repo.requeued || repo.failed {
		t.Error("no job should have been processed on an empty queue")
	}
}
