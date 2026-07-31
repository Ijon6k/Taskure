package handler

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/gin-gonic/gin"
)

type fakeStorageService struct {
	objects map[string][]byte
}

func newFakeStorageService(objects map[string][]byte) *fakeStorageService {
	return &fakeStorageService{objects: objects}
}

func (f *fakeStorageService) EnsureBucket(ctx context.Context) error { return nil }
func (f *fakeStorageService) UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (*storage.UploadResult, error) {
	return nil, errors.New("not implemented")
}
func (f *fakeStorageService) DeleteFile(ctx context.Context, objectName string) error {
	delete(f.objects, objectName)
	return nil
}
func (f *fakeStorageService) ObjectExists(ctx context.Context, objectName string) (bool, error) {
	_, ok := f.objects[objectName]
	return ok, nil
}
func (f *fakeStorageService) GetObject(ctx context.Context, objectName string) (io.ReadCloser, error) {
	data, ok := f.objects[objectName]
	if !ok {
		return nil, errors.New("no such object")
	}
	return io.NopCloser(bytes.NewReader(data)), nil
}
func (f *fakeStorageService) GetPublicURL(objectName string) string {
	return "/storage/kanban-uploads/" + objectName
}

func serveStorageRequest(h *StorageHandler, url string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, url, nil)
	c.Params = gin.Params{{Key: "filepath", Value: "kanban-uploads/img.png"}}
	h.ServeStorageFile(c)
	return w
}

func TestServeGeneratedVariant(t *testing.T) {
	store := newFakeStorageService(map[string][]byte{
		"img.png":      []byte("original-bytes"),
		"img_400.webp": []byte("webp-bytes"),
	})
	h := NewStorageHandler(store)

	rec := serveStorageRequest(h, "/storage/kanban-uploads/img.png?w=400")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); got != "image/webp" {
		t.Errorf("content type = %q, want image/webp", got)
	}
	if got := rec.Body.String(); got != "webp-bytes" {
		t.Errorf("body = %q, want variant bytes", got)
	}
	if got := rec.Header().Get("Cache-Control"); got != "public, max-age=31536000, immutable" {
		t.Errorf("cache control = %q, want immutable", got)
	}
	if rec.Header().Get("ETag") == "" {
		t.Error("expected an ETag for the generated variant")
	}
}

func TestServeMissingVariantNotReady(t *testing.T) {
	store := newFakeStorageService(map[string][]byte{
		"img.png": []byte("original-bytes"),
	})
	h := NewStorageHandler(store)

	rec := serveStorageRequest(h, "/storage/kanban-uploads/img.png?w=400")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404 (variant not ready)", rec.Code)
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-store" {
		t.Errorf("cache control = %q, want no-store", got)
	}
}

func TestServeOriginalImmutable(t *testing.T) {
	store := newFakeStorageService(map[string][]byte{
		"img.png": []byte("original-bytes"),
	})
	h := NewStorageHandler(store)

	rec := serveStorageRequest(h, "/storage/kanban-uploads/img.png")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := rec.Body.String(); got != "original-bytes" {
		t.Errorf("body = %q, want original bytes", got)
	}
	if got := rec.Header().Get("Cache-Control"); got != "public, max-age=31536000, immutable" {
		t.Errorf("cache control = %q, want immutable", got)
	}
	if got := rec.Header().Get("Content-Type"); got != "image/png" {
		t.Errorf("content type = %q, want image/png", got)
	}
}

func TestServeMissingObjectNotFound(t *testing.T) {
	store := newFakeStorageService(map[string][]byte{})
	h := NewStorageHandler(store)

	rec := serveStorageRequest(h, "/storage/kanban-uploads/missing.png")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestThumbBase(t *testing.T) {
	cases := map[string]string{
		"img.png":             "img",
		"img_preview.webp":    "img",
		"img.jpg.webp":        "img", // legacy double-suffixed variant URL
		"img_400.webp":        "img_400",
		"dir/photo.webp":      "dir/photo",
		"dir/photo.jpeg.webp": "dir/photo",
	}
	for input, want := range cases {
		if got := thumbBase(input); got != want {
			t.Errorf("thumbBase(%q) = %q, want %q", input, got, want)
		}
	}
}
