package focusengine

import (
	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
)

// FocusItem represents a task evaluated with its associated project and calculated score.
type FocusItem struct {
	Task    models.Task    `json:"task"`
	Project models.Project `json:"project"`
	Score   float64        `json:"score"`
}

// FocusResult holds the pure domain output of the Focus Engine (Hero & Recommendations).
type FocusResult struct {
	Hero            *FocusItem  `json:"hero"`
	Recommendations []FocusItem `json:"recommendations"`
}
