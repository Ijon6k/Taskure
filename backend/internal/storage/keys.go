package storage

import (
	"fmt"
	"path"
	"strings"
)

// PreviewWidth is the largest generated variant, used as the display image
// (lightbox/detail). It is just a thumbnail at the top of the width ladder.
const PreviewWidth = 2000

// ThumbWidths is the full set of widths generated at upload time. The largest
// entry doubles as the display preview; all keys follow the uniform
// "<base>_<w>.webp" scheme.
var ThumbWidths = []int{100, 200, 400, 800, 1600, PreviewWidth}

// IsThumbWidth reports whether width is one of the persisted thumbnail widths.
func IsThumbWidth(width int) bool {
	for _, w := range ThumbWidths {
		if w == width {
			return true
		}
	}
	return false
}

// baseKey strips the extension (e.g. ".jpg") from an object key.
func baseKey(objectKey string) string {
	return strings.TrimSuffix(objectKey, path.Ext(objectKey))
}

// PreviewKey returns the legacy display-preview key ("<base>_preview.webp").
// Kept for backward compatibility: files uploaded before the uniform
// "<base>_<w>.webp" scheme carry this key and must still be cleaned up.
func PreviewKey(objectKey string) string {
	return baseKey(objectKey) + "_preview.webp"
}

// ThumbKey returns the key of the generated variant at the given width for the
// given original object key.
func ThumbKey(objectKey string, width int) string {
	return fmt.Sprintf("%s_%d.webp", baseKey(objectKey), width)
}

// RelatedKeys returns every key that may derive from the given original object
// key (legacy preview + all generated widths). Used to cascade deletion.
func RelatedKeys(objectKey string) []string {
	keys := make([]string, 0, len(ThumbWidths)+1)
	keys = append(keys, PreviewKey(objectKey))
	for _, w := range ThumbWidths {
		keys = append(keys, ThumbKey(objectKey, w))
	}
	return keys
}
