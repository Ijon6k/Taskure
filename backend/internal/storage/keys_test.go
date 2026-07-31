package storage

import "testing"

func TestPreviewKey(t *testing.T) {
	tests := []struct {
		objectKey string
		want      string
	}{
		{"tasks/1/20260731_123456_abc.jpg", "tasks/1/20260731_123456_abc_preview.webp"},
		{"projects/2/20260731_123456_def.png", "projects/2/20260731_123456_def_preview.webp"},
		{"tasks/1/20260731_123456_abc.webp", "tasks/1/20260731_123456_abc_preview.webp"},
		{"tasks/1/noext", "tasks/1/noext_preview.webp"},
	}
	for _, tt := range tests {
		if got := PreviewKey(tt.objectKey); got != tt.want {
			t.Errorf("PreviewKey(%q) = %q, want %q", tt.objectKey, got, tt.want)
		}
	}
}

func TestThumbKey(t *testing.T) {
	got := ThumbKey("tasks/1/20260731_123456_abc.jpg", 400)
	if want := "tasks/1/20260731_123456_abc_400.webp"; got != want {
		t.Errorf("ThumbKey = %q, want %q", got, want)
	}
}

func TestIsThumbWidth(t *testing.T) {
	for _, w := range ThumbWidths {
		if !IsThumbWidth(w) {
			t.Errorf("IsThumbWidth(%d) = false, want true", w)
		}
	}
	if IsThumbWidth(250) || IsThumbWidth(0) {
		t.Error("IsThumbWidth(250) should be false")
	}
}

func TestRelatedKeys(t *testing.T) {
	keys := RelatedKeys("tasks/1/20260731_123456_abc.jpg")
	if len(keys) != len(ThumbWidths)+1 {
		t.Fatalf("RelatedKeys returned %d keys, want %d", len(keys), len(ThumbWidths)+1)
	}
	if keys[0] != "tasks/1/20260731_123456_abc_preview.webp" {
		t.Errorf("first related key = %q, want preview", keys[0])
	}
	seen := map[string]bool{}
	for _, k := range keys {
		if seen[k] {
			t.Errorf("duplicate related key %q", k)
		}
		seen[k] = true
	}
	for _, w := range ThumbWidths {
		want := ThumbKey("tasks/1/20260731_123456_abc.jpg", w)
		if !seen[want] {
			t.Errorf("related keys missing %q", want)
		}
	}
}
