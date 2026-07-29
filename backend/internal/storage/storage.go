package storage

import (
	"context"
	"io"
)

// UploadResult contains response details from object storage upload.
type UploadResult struct {
	ObjectKey string `json:"object_key"`
	PublicURL string `json:"public_url"`
	Size      int64  `json:"size"`
}

// StorageService defines the interface for S3 Object Storage operations.
type StorageService interface {
	EnsureBucket(ctx context.Context) error
	UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (*UploadResult, error)
	DeleteFile(ctx context.Context, objectName string) error
	GetPublicURL(objectName string) string
}
