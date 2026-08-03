package viewmodels

import (
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

// ColumnSummary carries the per-column aggregate a distribution bar needs:
// identity, display name, color and how many tasks currently sit in it.
type ColumnSummary struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Behavior  string `json:"behavior"`
	Color     string `json:"color,omitempty"`
	TaskCount int    `json:"task_count"`
}

// ProjectSummary is the lightweight project list payload consumed by the
// sidebar, project switchers and cards. It deliberately excludes heavy
// metadata (settings JSONB, workspace/owner ids, timestamps) that those
// surfaces never read.
type ProjectSummary struct {
	ID           string          `json:"id"`
	Name         string          `json:"name"`
	Description  string          `json:"description,omitempty"`
	Color        string          `json:"color,omitempty"`
	Icon         string          `json:"icon,omitempty"`
	Status       string          `json:"status"`
	IsPinned     bool            `json:"is_pinned"`
	IsArchived   bool            `json:"is_archived"`
	FocusEnabled bool            `json:"focus_enabled"`
	UpdatedAt    time.Time       `json:"updated_at"`
	Columns      []ColumnSummary `json:"columns,omitempty"`
}

// MapProjectSummary converts a project (as loaded by the lightweight list
// query, i.e. with Columns + TaskCount populated) into its summary view.
func MapProjectSummary(p models.Project) ProjectSummary {
	id := p.PublicID
	if id == "" {
		id = p.ID
	}

	columns := make([]ColumnSummary, 0, len(p.Columns))
	for _, col := range p.Columns {
		columns = append(columns, ColumnSummary{
			ID:        col.ID,
			Name:      col.Name,
			Behavior:  col.Behavior,
			Color:     col.Color,
			TaskCount: col.TaskCount,
		})
	}

	return ProjectSummary{
		ID:           id,
		Name:         p.Name,
		Description:  p.Description,
		Color:        p.Color,
		Icon:         p.Icon,
		Status:       p.Status,
		IsPinned:     p.IsPinned,
		IsArchived:   p.IsArchived,
		FocusEnabled: p.FocusEnabled,
		UpdatedAt:    p.UpdatedAt,
		Columns:      columns,
	}
}
