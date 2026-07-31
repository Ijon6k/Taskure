package service

import (
	"encoding/json"
	"testing"

	"gorm.io/datatypes"
)

func attsJSON(items []AttachmentItem) datatypes.JSON {
	b, _ := json.Marshal(items)
	return datatypes.JSON(b)
}

func TestExtractAttachmentKeys(t *testing.T) {
	withObjectKey := AttachmentItem{ID: "a1", ObjectKey: "tasks/1/x.jpg", URL: "https://s3.example/storage/kanban-uploads/tasks/1/x.jpg"}
	legacyOnly := AttachmentItem{ID: "a2", URL: "http://s3.example/storage/kanban-uploads/tasks/2/y.png"}
	linkOnly := AttachmentItem{ID: "a3", URL: "https://example.com/external", Type: "link"}
	empty := AttachmentItem{ID: "a4"}

	got := extractAttachmentKeys(attsJSON([]AttachmentItem{withObjectKey, legacyOnly, linkOnly, empty}))
	want := []string{"tasks/1/x.jpg", "tasks/2/y.png"}
	if len(got) != len(want) {
		t.Fatalf("got %d keys %v, want %d", len(got), got, len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("key[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestExtractAttachmentKeysNil(t *testing.T) {
	if got := extractAttachmentKeys(nil); got != nil {
		t.Errorf("expected nil, got %v", got)
	}
	if got := extractAttachmentKeys(datatypes.JSON("not-json")); got != nil {
		t.Errorf("expected nil on malformed json, got %v", got)
	}
	if got := extractAttachmentKeys(datatypes.JSON("[]")); got == nil || len(got) != 0 {
		t.Errorf("expected empty slice, got %v", got)
	}
}

func TestExtractResourceKeys(t *testing.T) {
	settings := map[string]interface{}{
		"target_goal": "ship it",
		"resources": []interface{}{
			map[string]interface{}{"id": "r1", "object_key": "projects/1/a.pdf", "url": "https://s3.example/storage/kanban-uploads/projects/1/a.pdf"},
			map[string]interface{}{"id": "r2", "url": "http://s3.example/storage/kanban-uploads/projects/2/b.jpg"},
			map[string]interface{}{"id": "r3", "url": "https://example.com/link", "type": "link"},
			map[string]interface{}{"id": "r4"},
		},
	}
	b, _ := json.Marshal(settings)
	got := extractResourceKeys(datatypes.JSON(b))
	want := []string{"projects/1/a.pdf", "projects/2/b.jpg"}
	if len(got) != len(want) {
		t.Fatalf("got %d keys %v, want %d", len(got), got, len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("key[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestExtractResourceKeysEdge(t *testing.T) {
	if got := extractResourceKeys(nil); got != nil {
		t.Errorf("expected nil, got %v", got)
	}
	if got := extractResourceKeys(datatypes.JSON(`{"target_goal":"x"}`)); len(got) != 0 {
		t.Errorf("expected empty without resources, got %v", got)
	}
}
