package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/zerolog"
)

type seaweedFSStorageService struct {
	client    *minio.Client
	bucket    string
	publicURL string
	logger    zerolog.Logger
}

// NewSeaweedFSStorage builds a SeaweedFS/S3-backed storage service.
func NewSeaweedFSStorage(cfg config.Config, logger zerolog.Logger) (StorageService, error) {
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOUser, cfg.MinIOPassword, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize seaweedfs s3 client: %w", err)
	}

	return &seaweedFSStorageService{
		client:    client,
		bucket:    cfg.MinIOBucket,
		publicURL: strings.TrimRight(cfg.MinIOPublicURL, "/"),
		logger:    logger.With().Str("component", "seaweedfs-storage").Logger(),
	}, nil
}

// NewMinIOStorage is a backward-compatible alias for NewSeaweedFSStorage.
func NewMinIOStorage(cfg config.Config, logger zerolog.Logger) (StorageService, error) {
	return NewSeaweedFSStorage(cfg, logger)
}

// EnsureBucket creates the bucket if it does not exist yet.
func (s *seaweedFSStorageService) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("error checking seaweedfs bucket '%s': %w", s.bucket, err)
	}

	if !exists {
		err = s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create seaweedfs bucket '%s': %w", s.bucket, err)
		}
		s.logger.Info().Str("bucket", s.bucket).Msg("created seaweedfs bucket")
	}

	return nil
}

// UploadFile streams a file into the bucket and returns its public URL.
func (s *seaweedFSStorageService) UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (*UploadResult, error) {
	info, err := s.client.PutObject(ctx, s.bucket, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload object to seaweedfs: %w", err)
	}

	s.logger.Info().Str("object", info.Key).Int64("size", info.Size).Msg("file uploaded to seaweedfs")

	return &UploadResult{
		ObjectKey: info.Key,
		PublicURL: s.GetPublicURL(info.Key),
		Size:      info.Size,
	}, nil
}

// GetObject opens a read stream for an object key.
func (s *seaweedFSStorageService) GetObject(ctx context.Context, objectName string) (io.ReadCloser, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object '%s' from seaweedfs: %w", objectName, err)
	}
	return obj, nil
}

// ObjectExists reports whether an object key exists in the bucket.
func (s *seaweedFSStorageService) ObjectExists(ctx context.Context, objectName string) (bool, error) {
	_, err := s.client.StatObject(ctx, s.bucket, objectName, minio.StatObjectOptions{})
	if err == nil {
		return true, nil
	}
	if minio.ToErrorResponse(err).Code == "NoSuchKey" {
		return false, nil
	}
	return false, fmt.Errorf("failed to stat object '%s' in seaweedfs: %w", objectName, err)
}

// DeleteFile removes an object key from the bucket.
func (s *seaweedFSStorageService) DeleteFile(ctx context.Context, objectName string) error {
	err := s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object '%s' from seaweedfs: %w", objectName, err)
	}
	s.logger.Info().Str("object", objectName).Msg("file deleted from seaweedfs")
	return nil
}

// GetPublicURL renders the externally reachable URL for an object key.
func (s *seaweedFSStorageService) GetPublicURL(objectName string) string {
	return fmt.Sprintf("%s/%s", s.publicURL, objectName)
}
