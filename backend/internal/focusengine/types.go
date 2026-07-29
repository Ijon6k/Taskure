package focusengine

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

// FocusItem represents a task evaluated with its associated project and calculated score.
type FocusItem struct {
	Task    models.Task    `json:"task"`
	Project models.Project `json:"project"`
	Score   float64        `json:"score"`
}

// FocusResult holds the quantitative domain workspace facts produced by the Focus Engine.
type FocusResult struct {
	TotalProjectsCount        int         `json:"total_projects_count"`
	ActiveProjectsCount       int         `json:"active_projects_count"`
	PausedProjectsCount       int         `json:"paused_projects_count"`
	ArchivedProjectsCount     int         `json:"archived_projects_count"`
	TotalWorkspaceTasksCount  int         `json:"total_workspace_tasks_count"`
	ParticipatingTasksCount   int         `json:"participating_tasks_count"`
	ActionableCandidatesCount int         `json:"actionable_candidates_count"`
	CompletedTasksTodayCount  int         `json:"completed_tasks_today_count"`
	Hero                      *FocusItem  `json:"hero"`
	Recommendations           []FocusItem `json:"recommendations"`
}
