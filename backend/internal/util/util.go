package util

import (
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrFileTooLarge    = errors.New("file size exceeds maximum allowed limit of 50MB")
	ErrInvalidMimeType = errors.New("file type not allowed. Allowed types: PNG, JPEG, WebP, GIF, SVG, PDF")
)

var AllowedMimeTypes = map[string]bool{
	"image/png":       true,
	"image/jpeg":      true,
	"image/webp":      true,
	"image/gif":       true,
	"image/svg+xml":  true,
	"application/pdf": true,
}

func IsUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

func FormatFileSize(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

var ErrExecutableNotAllowed = errors.New("executable files are not allowed for security reasons")

func ValidateUploadHeader(header *multipart.FileHeader) error {
	const MaxSize = 500 * 1024 * 1024 // 500MB
	if header.Size > MaxSize {
		return ErrFileTooLarge
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	blockedExts := map[string]bool{
		".exe": true, ".sh": true, ".bat": true, ".cmd": true,
		".msi": true, ".php": true, ".py": true, ".elf": true,
		".dll": true, ".so": true, ".dylib": true,
	}
	if blockedExts[ext] {
		return ErrExecutableNotAllowed
	}
	return nil
}
