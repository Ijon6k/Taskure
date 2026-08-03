package service

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/datatypes"
)

func TestBuildProjectAssets(t *testing.T) {
	settings := map[string]interface{}{
		"target_goal": "ship it",
		"resources": []interface{}{
			map[string]interface{}{
				"id": "r1", "title": "Design Spec", "type": "file", "url": "https://example.com/spec.pdf",
				"mime_type": "application/pdf", "size": "1.2 MB", "created_at": "2026-08-01T10:00:00Z",
			},
			map[string]interface{}{
				"id": "r2", "title": "Mockup", "type": "image", "url": "https://example.com/mockup.png",
				"preview_url": "https://example.com/mockup-preview.png",
			},
		},
	}
	settingsJSON, _ := json.Marshal(settings)

	rows := []repository.TaskAttachmentRow{
		{
			ID:        "tsk-1",
			Title:     "Write docs",
			CreatedAt: time.Now(),
			AttachmentsJSON: attsJSON([]AttachmentItem{
				{ID: "a1", Type: "link", Title: "Docs link", URL: "https://docs.example.com"},
				{ID: "a2", Type: "file", Title: "research.pdf", URL: "https://s3.example/f.pdf", Size: "200 KB", MimeType: "application/pdf"},
			}),
		},
		{ID: "tsk-2", Title: "Broken task", AttachmentsJSON: datatypes.JSON("not-json")},
	}

	got := buildProjectAssets(settingsJSON, rows)

	if len(got.Resources) != 2 {
		t.Fatalf("got %d resources, want 2", len(got.Resources))
	}
	r1 := got.Resources[0]
	if r1.ID != "r1" || r1.SourceKind != "overview" || r1.SourceLabel != "Overview" || r1.Kind != "file" || r1.MimeType != "application/pdf" || r1.Size != "1.2 MB" {
		t.Errorf("resource r1 mapped wrong: %+v", r1)
	}
	if got.Resources[1].PreviewURL != "https://example.com/mockup-preview.png" {
		t.Errorf("resource r2 preview_url lost: %+v", got.Resources[1])
	}

	if len(got.Attachments) != 2 {
		t.Fatalf("got %d attachments, want 2 (malformed row skipped)", len(got.Attachments))
	}
	a1 := got.Attachments[0]
	if a1.ID != "a1" || a1.SourceKind != "task" || a1.SourceLabel != "Write docs" || a1.TaskID != "tsk-1" || a1.Kind != "link" {
		t.Errorf("attachment a1 mapped wrong: %+v", a1)
	}
	if got.Attachments[1].MimeType != "application/pdf" {
		t.Errorf("attachment a2 mime lost: %+v", got.Attachments[1])
	}
}

func TestBuildProjectAssetsEmpty(t *testing.T) {
	got := buildProjectAssets(nil, nil)
	if len(got.Resources) != 0 || len(got.Attachments) != 0 {
		t.Errorf("expected empty payload, got %+v", got)
	}

	got = buildProjectAssets(datatypes.JSON("not-json"), []repository.TaskAttachmentRow{
		{ID: "t1", Title: "x", AttachmentsJSON: datatypes.JSON("[]")},
	})
	if len(got.Resources) != 0 || len(got.Attachments) != 0 {
		t.Errorf("malformed settings should yield empty resources, got %+v", got)
	}
}
