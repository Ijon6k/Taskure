package handler

import (
	"bytes"
	"container/list"
	"context"
	"crypto/md5"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/chai2010/webp"
	"github.com/gin-gonic/gin"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

type cachedImage struct {
	data        []byte
	contentType string
	etag        string
}

// Bounded Concurrency Semaphore to prevent CPU chokes (max 4 concurrent resizes)
var resizeSem = make(chan struct{}, 4)

type cacheEntry struct {
	key   string
	value *cachedImage
}

type lruCache struct {
	mu      sync.Mutex
	maxSize int
	items   map[string]*list.Element
	order   *list.List // front = most recent
}

func newLRUCache(maxSize int) *lruCache {
	return &lruCache{
		maxSize: maxSize,
		items:   make(map[string]*list.Element),
		order:   list.New(),
	}
}

func (c *lruCache) Get(key string) (*cachedImage, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if elem, ok := c.items[key]; ok {
		c.order.MoveToFront(elem)
		return elem.Value.(*cacheEntry).value, true
	}
	return nil, false
}

func (c *lruCache) Set(key string, value *cachedImage) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if elem, ok := c.items[key]; ok {
		c.order.MoveToFront(elem)
		elem.Value.(*cacheEntry).value = value
		return
	}
	if c.order.Len() >= c.maxSize {
		oldest := c.order.Back()
		if oldest != nil {
			c.order.Remove(oldest)
			delete(c.items, oldest.Value.(*cacheEntry).key)
		}
	}
	entry := &cacheEntry{key: key, value: value}
	elem := c.order.PushFront(entry)
	c.items[key] = elem
}

type StorageHandler struct {
	storage  storage.StorageService
	ramCache *lruCache
}

func NewStorageHandler(storage storage.StorageService) *StorageHandler {
	return &StorageHandler{
		storage:  storage,
		ramCache: newLRUCache(1000),
	}
}

func (h *StorageHandler) ServeStorageFile(c *gin.Context) {
	relPath := c.Param("filepath")
	relPath = strings.TrimPrefix(relPath, "/")

	// Strip bucket prefixes if present
	relPath = strings.TrimPrefix(relPath, "kanban-uploads/")
	relPath = strings.TrimPrefix(relPath, "kanban-assets/")

	// Support .webp extension in URL for frontend thumbnail requests (e.g. file.webp or file.jpg.webp)
	origRelPath := relPath
	if strings.HasSuffix(relPath, ".webp") {
		baseWithoutExt := strings.TrimSuffix(relPath, ".webp")
		exts := []string{"", ".jpg", ".png", ".jpeg", ".gif"}
		for _, ext := range exts {
			candidate := baseWithoutExt + ext
			if reader, err := h.getObjectReader(c.Request.Context(), candidate); err == nil {
				if img, _, decodeErr := image.Decode(reader); decodeErr == nil && img != nil {
					origRelPath = candidate
					reader.Close()
					break
				}
				reader.Close()
			}
		}
	}

	wStr := c.Query("w")
	if wStr == "" {
		wStr = c.Query("width")
	}

	// 1. If NO width parameter is requested, serve exact original file directly
	if wStr == "" {
		h.serveOriginal(c, origRelPath)
		return
	}

	targetW, err := strconv.Atoi(wStr)
	if err != nil || targetW <= 0 || targetW > 3840 {
		h.serveOriginal(c, origRelPath)
		return
	}

	// Compute unique cache key and ETag
	cacheKey := fmt.Sprintf("w%d_%s.webp", targetW, strings.ReplaceAll(origRelPath, "/", "_"))
	etag := fmt.Sprintf("\"%x\"", md5.Sum([]byte(cacheKey)))

	// Check HTTP 304 Not Modified (If-None-Match header)
	if clientETag := c.GetHeader("If-None-Match"); clientETag == etag {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Header("ETag", etag)
		c.Status(http.StatusNotModified)
		return
	}

	// 2. RAM Memory Cache Hit (0.1ms Response)
	if cached, ok := h.ramCache.Get(cacheKey); ok && cached != nil {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Header("ETag", cached.etag)
		c.Header("X-Thumbnail-Cache", "HIT-RAM")
		c.Data(http.StatusOK, cached.contentType, cached.data)
		return
	}

	// 3. Local Disk Cache Hit
	cacheDir := filepath.Join(os.TempDir(), "kanban_thumb_cache")
	_ = os.MkdirAll(cacheDir, 0755)

	cachePath := filepath.Join(cacheDir, cacheKey)

	if stat, err := os.Stat(cachePath); err == nil && stat.Size() > 0 {
		if data, err := os.ReadFile(cachePath); err == nil && len(data) > 0 {
			contentType := "image/webp"
			item := &cachedImage{data: data, contentType: contentType, etag: etag}
			h.ramCache.Set(cacheKey, item)

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
	if cached, ok := h.ramCache.Get(cacheKey); ok && cached != nil {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Header("ETag", cached.etag)
		c.Header("X-Thumbnail-Cache", "HIT-RAM")
		c.Data(http.StatusOK, cached.contentType, cached.data)
		return
	}

	reader, err := h.getObjectReader(c.Request.Context(), origRelPath)
	if err != nil {
		c.String(http.StatusNotFound, "Object not found")
		return
	}
	defer reader.Close()

	// Decode original image using registered decoders (png, jpeg, gif, webp)
	img, _, err := image.Decode(reader)
	if err != nil {
		// Non-image asset -> serve original
		h.serveOriginal(c, relPath)
		return
	}

	origW := img.Bounds().Dx()
	origH := img.Bounds().Dy()

	if origW == 0 || origH == 0 {
		h.serveOriginal(c, relPath)
		return
	}

	var dstImg image.Image = img
	if origW > targetW {
		targetH := (origH * targetW) / origW
		if targetH <= 0 {
			targetH = 1
		}
		rgba := image.NewRGBA(image.Rect(0, 0, targetW, targetH))
		// Fast SIMD / Vectorized Scaling via golang.org/x/image/draw BiLinear
		draw.BiLinear.Scale(rgba, rgba.Bounds(), img, img.Bounds(), draw.Over, nil)
		dstImg = rgba
	}

	// Encode to WebP format (80% Quality) for super lightweight thumbnail delivery
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
		// Trigger eventual cleanup (non-blocking, best-effort)
		go cleanupDiskCache(cacheDir, 500*1024*1024) // 500MB max
	}()

	// Save to RAM Memory Cache
	item := &cachedImage{data: encodedBytes, contentType: contentType, etag: etag}
	h.ramCache.Set(cacheKey, item)

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

func cleanupDiskCache(cacheDir string, maxSize int64) {
	entries, err := os.ReadDir(cacheDir)
	if err != nil {
		return
	}
	var totalSize int64
	type fileInfo struct {
		path    string
		size    int64
		modTime time.Time
	}
	var files []fileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		totalSize += info.Size()
		files = append(files, fileInfo{
			path:    filepath.Join(cacheDir, entry.Name()),
			size:    info.Size(),
			modTime: info.ModTime(),
		})
	}
	if totalSize <= maxSize {
		return
	}
	// Sort by modification time (oldest first)
	sort.Slice(files, func(i, j int) bool {
		return files[i].modTime.Before(files[j].modTime)
	})
	for _, f := range files {
		if totalSize <= maxSize {
			break
		}
		os.Remove(f.path)
		totalSize -= f.size
	}
}
