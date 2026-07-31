package imageutil

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"image"
	"image/color"
	"image/png"
	"testing"
)

func pngBytes(w, h int) []byte {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

// fakePNGHeader builds a PNG whose IHDR advertises the given dimensions but
// carries no pixel data — enough for DecodeConfig, which only reads the header.
func fakePNGHeader(width, height uint32) []byte {
	var buf bytes.Buffer
	buf.WriteString("\x89PNG\r\n\x1a\n")
	ihdr := make([]byte, 13)
	binary.BigEndian.PutUint32(ihdr[0:4], width)
	binary.BigEndian.PutUint32(ihdr[4:8], height)
	ihdr[8] = 8 // bit depth
	ihdr[9] = 6 // color type: RGBA

	chunkType := []byte("IHDR")
	crc := crc32.NewIEEE()
	crc.Write(chunkType)
	crc.Write(ihdr)

	var chunk bytes.Buffer
	_ = binary.Write(&chunk, binary.BigEndian, uint32(len(ihdr)))
	chunk.Write(chunkType)
	chunk.Write(ihdr)
	_ = binary.Write(&chunk, binary.BigEndian, crc.Sum32())
	return append(buf.Bytes(), chunk.Bytes()...)
}

func TestIsPreviewableImage(t *testing.T) {
	cases := []struct {
		contentType string
		want        bool
	}{
		{"image/jpeg", true},
		{"image/png", true},
		{"image/webp", true},
		{"image/gif", false},
		{"image/svg+xml", false},
		{"application/pdf", false},
		{"", false},
	}
	for _, c := range cases {
		if got := IsPreviewableImage(c.contentType); got != c.want {
			t.Errorf("IsPreviewableImage(%q) = %v, want %v", c.contentType, got, c.want)
		}
	}
}

func TestBuildVariants(t *testing.T) {
	src := pngBytes(3000, 2000)
	widths := []int{100, 200, 400, 800, 1600, 2000}
	wantDims := map[int][2]int{
		100:  {100, 66},
		200:  {200, 133},
		400:  {400, 266},
		800:  {800, 533},
		1600: {1600, 1066},
		2000: {2000, 1333},
	}

	variants, err := BuildVariants(src, PreviewQuality, widths)
	if err != nil {
		t.Fatalf("BuildVariants failed: %v", err)
	}
	if len(variants) != len(widths) {
		t.Fatalf("BuildVariants returned %d variants, want %d", len(variants), len(widths))
	}
	for _, w := range widths {
		encoded, ok := variants[w]
		if !ok || len(encoded) == 0 {
			t.Errorf("missing or empty variant for width %d", w)
			continue
		}
		cfg, _, err := image.DecodeConfig(bytes.NewReader(encoded))
		if err != nil {
			t.Fatalf("variant %d is not decodable: %v", w, err)
		}
		want := wantDims[w]
		if cfg.Width != want[0] || cfg.Height != want[1] {
			t.Errorf("variant %d = %dx%d, want %dx%d", w, cfg.Width, cfg.Height, want[0], want[1])
		}
	}
}

func TestBuildVariantsSmallSource(t *testing.T) {
	src := pngBytes(500, 300)
	variants, err := BuildVariants(src, PreviewQuality, []int{2000, 100})
	if err != nil {
		t.Fatalf("BuildVariants failed: %v", err)
	}

	cfg, _, err := image.DecodeConfig(bytes.NewReader(variants[2000]))
	if err != nil {
		t.Fatalf("2000 variant not decodable: %v", err)
	}
	if cfg.Width != 500 || cfg.Height != 300 {
		t.Errorf("largest variant should keep the source size, got %dx%d", cfg.Width, cfg.Height)
	}

	cfg, _, err = image.DecodeConfig(bytes.NewReader(variants[100]))
	if err != nil {
		t.Fatalf("100 variant not decodable: %v", err)
	}
	if cfg.Width != 100 || cfg.Height != 60 {
		t.Errorf("100 variant = %dx%d, want 100x60", cfg.Width, cfg.Height)
	}
}

func TestBuildVariantsSkipsInvalidWidths(t *testing.T) {
	variants, err := BuildVariants(pngBytes(100, 100), PreviewQuality, []int{200, 200, 0, -5})
	if err != nil {
		t.Fatalf("BuildVariants failed: %v", err)
	}
	if len(variants) != 1 {
		t.Fatalf("BuildVariants returned %d variants, want 1", len(variants))
	}
	if _, ok := variants[200]; !ok {
		t.Error("expected only the 200 width variant")
	}
}

func TestBuildVariantsNonImage(t *testing.T) {
	if _, err := BuildVariants([]byte("not an image"), PreviewQuality, []int{200}); err == nil {
		t.Error("expected error for non-image input")
	}
}

func TestConfigRejectsOversizedSource(t *testing.T) {
	hdr := fakePNGHeader(6000, 5000) // 30MP > 24MP budget
	if _, err := Config(bytes.NewReader(hdr)); err != ErrTooLarge {
		t.Errorf("expected ErrTooLarge, got %v", err)
	}
	ok := fakePNGHeader(100, 100)
	cfg, err := Config(bytes.NewReader(ok))
	if err != nil {
		t.Fatalf("Config failed: %v", err)
	}
	if cfg.Width != 100 || cfg.Height != 100 {
		t.Errorf("unexpected config %dx%d", cfg.Width, cfg.Height)
	}
}

func TestResizeKeepsSmallImages(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 100, 50))
	out := Resize(src, 400)
	if out != image.Image(src) {
		t.Error("Resize should return the original when narrower than width")
	}
}

func TestResizeScalesDown(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 4000, 2000))
	out := Resize(src, 400)
	b := out.Bounds()
	if b.Dx() != 400 || b.Dy() != 200 {
		t.Errorf("expected 400x200, got %dx%d", b.Dx(), b.Dy())
	}
}
