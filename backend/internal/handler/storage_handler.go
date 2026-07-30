package handler

import (
	"bytes"
	"context"
	"crypto/md5"
	"fmt"
	"image"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/chai2010/webp"
	"github.com/gin-gonic/gin"
	"golang.org/x/image/draw"
)

type cachedImage struct {
	data        []byte
	contentType string
	etag        string
}

// Bounded Concurrency Semaphore to prevent CPU chokes (max 4 concurrent resizes)
var resizeSem = make(chan struct{}, 4)

type StorageHandler struct {
	storage  storage.StorageService
	ramCache sync.Map // key: string -> *cachedImage
}

func NewStorageHandler(storage storage.StorageService) *StorageHandler {
	return &StorageHandler{storage: storage}
}

func (h *StorageHandler) ServeStorageFile(c *gin.Context) {
	relPath := c.Param("filepath")
	relPath = strings.TrimPrefix(relPath, "/")

	// Strip bucket prefixes if present
	relPath = strings.TrimPrefix(relPath, "kanban-uploads/")
	relPath = strings.TrimPrefix(relPath, "kanban-assets/")

	wStr := c.Query("w")
	if wStr == "" {
		wStr = c.Query("width")
	}

	// 1. If NO width parameter is requested, serve exact original file directly
	if wStr == "" {
		h.serveOriginal(c, relPath)
		return
	}

	targetW, err := strconv.Atoi(wStr)
	if err != nil || targetW <= 0 || targetW > 3840 {
		h.serveOriginal(c, relPath)
		return
	}

	// Compute unique cache key and ETag
	cacheKey := fmt.Sprintf("w%d_%s.webp", targetW, strings.ReplaceAll(relPath, "/", "_"))
	etag := fmt.Sprintf("\"%x\"", md5.Sum([]byte(cacheKey)))

	// Check HTTP 304 Not Modified (If-None-Match header)
	if clientETag := c.GetHeader("If-None-Match"); clientETag == etag {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Header("ETag", etag)
		c.Status(http.StatusNotModified)
		return
	}

	// 2. RAM Memory Cache Hit (0.1ms Response)
	if val, ok := h.ramCache.Load(cacheKey); ok {
		if cached, ok := val.(*cachedImage); ok && cached != nil {
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
			c.Header("ETag", cached.etag)
			c.Header("X-Thumbnail-Cache", "HIT-RAM")
			c.Data(http.StatusOK, cached.contentType, cached.data)
			return
		}
	}

	// 3. Local Disk Cache Hit
	cacheDir := filepath.Join(os.TempDir(), "kanban_thumb_cache")
	_ = os.MkdirAll(cacheDir, 0755)

	cachePath := filepath.Join(cacheDir, cacheKey)

	if stat, err := os.Stat(cachePath); err == nil && stat.Size() > 0 {
		if data, err := os.ReadFile(cachePath); err == nil && len(data) > 0 {
			contentType := "image/webp"
			item := &cachedImage{data: data, contentType: contentType, etag: etag}
			h.ramCache.Store(cacheKey, item)

			c.Header("Cache-Control", "public, max-age=31536000, immutable")
			c.Header("ETag", etag)
			c.Header("X-Thumbnail-Cache", "HIT-DISK")
			c.Data(http.StatusOK, contentType, data)
			return
		}
	}

	// 4. Cache Miss — acquire concurrency semaphore slot to protect CPU
	resizeSem <- struct{}{}
	defer func() { <-resizeSem }()

	// Double-check RAM cache in case another goroutine generated it while waiting
	if val, ok := h.ramCache.Load(cacheKey); ok {
		if cached, ok := val.(*cachedImage); ok && cached != nil {
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
			c.Header("ETag", cached.etag)
			c.Header("X-Thumbnail-Cache", "HIT-RAM")
			c.Data(http.StatusOK, cached.contentType, cached.data)
			return
		}
	}

	reader, err := h.getObjectReader(c.Request.Context(), relPath)
	if err != nil {
		c.String(http.StatusNotFound, "Object not found")
		return
	}
	defer reader.Close()

	// Decode original image
	img, _, err := image.Decode(reader)
	if err != nil {
		// Non-image asset -> serve original
		h.serveOriginal(c, relPath)
		return
	}

	origW := img.Bounds().Dx()
	origH := img.Bounds().Dy()

	if origW <= targetW {
		h.serveOriginal(c, relPath)
		return
	}

	targetH := (origH * targetW) / origW
	dstImg := image.NewRGBA(image.Rect(0, 0, targetW, targetH))

	// Fast SIMD / Vectorized Scaling via golang.org/x/image/draw BiLinear
	draw.BiLinear.Scale(dstImg, dstImg.Bounds(), img, img.Bounds(), draw.Over, nil)

	// Encode to 100% WebP format (80% Quality)
	var buf bytes.Buffer
	contentType := "image/webp"

	encodeErr := webp.Encode(&buf, dstImg, &webp.Options{Quality: 80})
	if encodeErr != nil {
		h.serveOriginal(c, relPath)
		return
	}

	encodedBytes := buf.Bytes()

	// Save to disk cache asynchronously
	go func() {
		_ = os.WriteFile(cachePath, encodedBytes, 0644)
	}()

	// Save to RAM Memory Cache
	item := &cachedImage{data: encodedBytes, contentType: contentType, etag: etag}
	h.ramCache.Store(cacheKey, item)

	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("ETag", etag)
	c.Header("X-Thumbnail-Cache", "MISS")
	c.Data(http.StatusOK, contentType, encodedBytes)
}

func (h *StorageHandler) serveOriginal(c *gin.Context, relPath string) {
	ctx := c.Request.Context()
	reader, err := h.getObjectReader(ctx, relPath)
	if err != nil {
		c.String(http.StatusNotFound, "File not found")
		return
	}
	defer reader.Close()

	ext := filepath.Ext(relPath)
	switch strings.ToLower(ext) {
	case ".png":
		c.Header("Content-Type", "image/png")
	case ".jpg", ".jpeg":
		c.Header("Content-Type", "image/jpeg")
	case ".gif":
		c.Header("Content-Type", "image/gif")
	case ".webp":
		c.Header("Content-Type", "image/webp")
	case ".svg":
		c.Header("Content-Type", "image/svg+xml")
	case ".pdf":
		c.Header("Content-Type", "application/pdf")
	default:
		c.Header("Content-Type", "application/octet-stream")
	}

	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	_, _ = io.Copy(c.Writer, reader)
}

func (h *StorageHandler) getObjectReader(ctx context.Context, objectKey string) (io.ReadCloser, error) {
	if h.storage != nil {
		if reader, err := h.storage.GetObject(ctx, objectKey); err == nil {
			return reader, nil
		}
	}
	localPath := filepath.Join("storage", "kanban-uploads", objectKey)
	if f, err := os.Open(localPath); err == nil {
		return f, nil
	}
	return nil, fmt.Errorf("object %s not found", objectKey)
}
