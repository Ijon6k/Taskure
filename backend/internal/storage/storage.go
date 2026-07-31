package storage

import (
	"context"
	"io"
)

type UploadResult struct {
	ObjectKey string
	PublicURL string
	Size      int64
}

type StorageService interface {
	EnsureBucket(ctx context.Context) error
	UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (*UploadResult, error)
	DeleteFile(ctx context.Context, objectName string) error
	ObjectExists(ctx context.Context, objectName string) (bool, error)
	GetObject(ctx context.Context, objectName string) (io.ReadCloser, error)
	GetPublicURL(objectName string) string
}
