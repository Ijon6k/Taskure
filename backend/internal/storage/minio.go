package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/zerolog"
)

type minioStorageService struct {
	client    *minio.Client
	bucket    string
	publicURL string
	logger    zerolog.Logger
}

// NewMinIOStorage initializes MinIO client and returns a StorageService.
func NewMinIOStorage(cfg config.Config, logger zerolog.Logger) (StorageService, error) {
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOUser, cfg.MinIOPassword, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize minio client: %w", err)
	}

	return &minioStorageService{
		client:    client,
		bucket:    cfg.MinIOBucket,
		publicURL: strings.TrimRight(cfg.MinIOPublicURL, "/"),
		logger:    logger.With().Str("component", "minio-storage").Logger(),
	}, nil
}

func (s *minioStorageService) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("error checking minio bucket '%s': %w", s.bucket, err)
	}

	if !exists {
		err = s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create minio bucket '%s': %w", s.bucket, err)
		}
		s.logger.Info().Str("bucket", s.bucket).Msg("created minio bucket")
	}

	// Set anonymous public read policy for the bucket
	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}
		]
	}`, s.bucket)

	if err := s.client.SetBucketPolicy(ctx, s.bucket, policy); err != nil {
		s.logger.Warn().Err(err).Str("bucket", s.bucket).Msg("failed to set public bucket policy (bucket might already have custom policy)")
	}

	return nil
}

func (s *minioStorageService) UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (*UploadResult, error) {
	info, err := s.client.PutObject(ctx, s.bucket, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload object to minio: %w", err)
	}

	s.logger.Info().Str("object", info.Key).Int64("size", info.Size).Msg("file uploaded to minio")

	return &UploadResult{
		ObjectKey: info.Key,
		PublicURL: s.GetPublicURL(info.Key),
		Size:      info.Size,
	}, nil
}

func (s *minioStorageService) DeleteFile(ctx context.Context, objectName string) error {
	err := s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object '%s' from minio: %w", objectName, err)
	}
	s.logger.Info().Str("object", objectName).Msg("file deleted from minio")
	return nil
}

func (s *minioStorageService) GetPublicURL(objectName string) string {
	return fmt.Sprintf("%s/%s", s.publicURL, objectName)
}
