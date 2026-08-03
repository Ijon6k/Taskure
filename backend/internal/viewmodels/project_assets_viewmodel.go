package viewmodels

// ProjectAssetItem is one asset row the Asset Explorer renders: an overview
// resource or a task attachment, flattened with enough source context for the
// client to route deletes (task attachments go through the task, resources
// through the project settings).
type ProjectAssetItem struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Kind        string `json:"kind"` // "link" | "image" | "file"
	URL         string `json:"url,omitempty"`
	PreviewURL  string `json:"preview_url,omitempty"`
	Size        string `json:"size,omitempty"`
	MimeType    string `json:"mime_type,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
	SourceKind  string `json:"source_kind"` // "overview" | "task"
	SourceLabel string `json:"source_label"`
	TaskID      string `json:"task_id,omitempty"`
}

// ProjectAssets is the lightweight Asset Explorer payload. Resources and task
// attachments are kept separate so the client can keep its existing dedup rule
// (overview resources win over attachments sharing a URL).
type ProjectAssets struct {
	Resources   []ProjectAssetItem `json:"resources"`
	Attachments []ProjectAssetItem `json:"attachments"`
}
