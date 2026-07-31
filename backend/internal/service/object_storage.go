package service

import (
	"context"

	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
)

// expandRelatedKeys expands original object keys into the full set of keys that
// need deleting (original + every derived variant).
func expandRelatedKeys(keys []string) []string {
	out := make([]string, 0, len(keys)*(len(storage.ThumbWidths)+1))
	for _, key := range keys {
		if key == "" {
			continue
		}
		out = append(out, key)
		out = append(out, storage.RelatedKeys(key)...)
	}
	return out
}

// deleteObjects best-effort removes the given object keys and every derived
// variant from object storage.
func deleteObjects(ctx context.Context, storageSvc storage.StorageService, keys []string) {
	if storageSvc == nil {
		return
	}
	for _, key := range expandRelatedKeys(keys) {
		if key != "" {
			_ = storageSvc.DeleteFile(ctx, key)
		}
	}
}
