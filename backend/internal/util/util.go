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
	ErrFileTooLarge         = errors.New("file size exceeds maximum allowed limit of 500MB")
	ErrExecutableNotAllowed = errors.New("executable files are not allowed for security reasons")
)

// IsUUID reports whether s is a valid v4 UUID string (vs a NanoID public id).
func IsUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

// FormatFileSize renders a byte count as a human-readable string (e.g. "1.2 MB").
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

// ValidateUploadHeader enforces content-type and size limits for uploads.
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
