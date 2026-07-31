package imageutil

import (
	"bytes"
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"sort"
	"strings"

	"github.com/chai2010/webp"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

// MaxDecodePixels caps the source-image area we are willing to fully decode
// into memory (decompression-bomb guard). Uploads already downscale to 4K
// (~8MP), so anything larger is a direct API upload or a crafted image.
const MaxDecodePixels = 24 * 1000 * 1000

// MaxVariantSourceBytes caps the compressed source size eligible for variant
// generation. The worker buffers the full object before decoding, so skipping
// oversized uploads keeps memory well under the container limit. Files above
// this threshold are still uploaded and served at original size.
const MaxVariantSourceBytes = 128 * 1024 * 1024

// PreviewQuality is the WebP encode quality used for all generated variants.
const PreviewQuality = 80

// ErrTooLarge is returned when a source image exceeds MaxDecodePixels.
var ErrTooLarge = errors.New("image exceeds maximum pixel budget")

// IsPreviewableImage reports whether a file with the given content type gets a
// generated WebP preview. GIFs (animation) and SVGs (vector) are kept as-is.
func IsPreviewableImage(contentType string) bool {
	ct := strings.ToLower(contentType)
	if !strings.HasPrefix(ct, "image/") {
		return false
	}
	return !strings.Contains(ct, "svg") && !strings.Contains(ct, "gif")
}

// Config reads only the image header and rejects sources that are not
// decodable or exceed MaxDecodePixels, before any full-bitmap allocation.
func Config(r io.Reader) (image.Config, error) {
	cfg, _, err := image.DecodeConfig(r)
	if err != nil {
		return image.Config{}, err
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || int64(cfg.Width)*int64(cfg.Height) > MaxDecodePixels {
		return image.Config{}, ErrTooLarge
	}
	return cfg, nil
}

// Decode fully decodes an image. Call Config on a separate reader first to
// enforce the pixel budget before allocating the bitmap.
func Decode(r io.Reader) (image.Image, error) {
	img, _, err := image.Decode(r)
	return img, err
}

// Resize returns img scaled to fit the given width (preserving aspect ratio).
// Returns the original when it is already narrower than width.
func Resize(img image.Image, width int) image.Image {
	if width <= 0 {
		return img
	}
	bounds := img.Bounds()
	origW := bounds.Dx()
	origH := bounds.Dy()
	if origW == 0 || origH == 0 || origW <= width {
		return img
	}
	targetH := (origH * width) / origW
	if targetH <= 0 {
		targetH = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, width, targetH))
	draw.BiLinear.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
	return dst
}

// EncodeWebP encodes img as WebP at the given quality.
func EncodeWebP(img image.Image, quality float32) ([]byte, error) {
	var buf bytes.Buffer
	if err := webp.Encode(&buf, img, &webp.Options{Quality: quality}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BuildVariants decodes the source once and encodes a WebP copy at each of the
// given widths. Widths are scaled down in descending order so every resize
// draws from the previously produced (smaller) image, keeping the cascade
// cheap. The source must already be in memory so its header can be inspected
// before the full decode. Returns an error for non-images, sources exceeding
// MaxDecodePixels, or encode failures. Non-positive or duplicate widths are
// skipped.
func BuildVariants(data []byte, quality float32, widths []int) (map[int][]byte, error) {
	if _, err := Config(bytes.NewReader(data)); err != nil {
		return nil, err
	}
	src, err := Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	ordered := append([]int(nil), widths...)
	sort.Sort(sort.Reverse(sort.IntSlice(ordered)))

	variants := make(map[int][]byte, len(ordered))
	canvas := src
	sourceReleased := false
	for _, w := range ordered {
		if w <= 0 {
			continue
		}
		if _, dup := variants[w]; dup {
			continue
		}
		if w < canvas.Bounds().Dx() {
			canvas = Resize(canvas, w)
			if !sourceReleased {
				// The cascade now draws from resized canvases, so the
				// full-size source bitmap is dead weight. Drop the reference
				// so the GC can reclaim it while the remaining encodes run.
				src = nil
				sourceReleased = true
			}
		}
		encoded, err := EncodeWebP(canvas, quality)
		if err != nil {
			return nil, err
		}
		variants[w] = encoded
	}
	return variants, nil
}
