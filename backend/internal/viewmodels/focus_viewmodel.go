package viewmodels

import (
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/focusengine"
)

type FocusChecklistItemView struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	IsCompleted bool   `json:"is_completed"`
}

type FocusTaskView struct {
	ID               string                   `json:"id"`
	Title            string                   `json:"title"`
	Priority         string                   `json:"priority"`
	DueDate          *time.Time               `json:"due_date,omitempty"`
	ProjectID        string                   `json:"project_id"`
	ChecklistSummary *ChecklistSummary        `json:"checklist_summary,omitempty"`
	Checklist        []FocusChecklistItemView `json:"checklist"`
}

type ChecklistSummary struct {
	Completed int `json:"completed"`
	Total     int `json:"total"`
}

type FocusProjectView struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
	Icon  string `json:"icon,omitempty"`
}

type FocusItemView struct {
	Task      FocusTaskView    `json:"task"`
	Project   FocusProjectView `json:"project"`
	ReasonTag string           `json:"reason_tag"`
}

type WorkspaceSummary struct {
	ActiveProjectsCount   int `json:"active_projects_count"`
	PausedProjectsCount   int `json:"paused_projects_count"`
	ArchivedProjectsCount int `json:"archived_projects_count"`
	ActionableTasksCount  int `json:"actionable_tasks_count"`
	CompletedTasksToday   int `json:"completed_tasks_today"`
}

type FocusViewModel struct {
	StateCode           string           `json:"state_code"`
	ActiveProjectsCount int              `json:"active_projects_count"`
	Summary             WorkspaceSummary `json:"summary"`
	Hero                *FocusItemView   `json:"hero"`
	Recommendations     []FocusItemView  `json:"recommendations"`
}

// DeriveReasonTag picks a human-facing explanation for why a task surfaced.
// Deadline windows are resolved in loc (the client's timezone) so the tag
// always matches the date the user sees for the same task.
func DeriveReasonTag(item focusengine.FocusItem, now time.Time, loc *time.Location) string {
	task := item.Task

	// 1. Deadline Rules (Overdue, Due today, Near deadline)
	if task.DueDate != nil {
		if loc == nil {
			loc = time.UTC
		}
		nowInTz := now.In(loc)
		dueInTz := task.DueDate.In(loc)
		todayStart := time.Date(nowInTz.Year(), nowInTz.Month(), nowInTz.Day(), 0, 0, 0, 0, loc)
		tomorrowStart := todayStart.AddDate(0, 0, 1)
		dayAfterStart := todayStart.AddDate(0, 0, 3)

		switch {
		case dueInTz.Before(todayStart):
			return "Overdue"
		case dueInTz.Before(tomorrowStart):
			return "Due today"
		case !dueInTz.After(dayAfterStart):
			return "Near deadline"
		}
	}

	// 2. Priority Rules (High priority)
	prio := task.Priority
	if prio == "urgent" || prio == "high" {
		return "High priority"
	}

	// 3. Subtask / Checklist Rules (Blocking progress)
	if len(task.ChecklistItems) > 0 {
		uncompleted := 0
		for _, ch := range task.ChecklistItems {
			if !ch.IsCompleted {
				uncompleted++
			}
		}
		if uncompleted > 0 {
			return "Blocking progress"
		}
	}

	// 4. Recently Active Rules (Recently active)
	if !task.UpdatedAt.IsZero() && now.Sub(task.UpdatedAt) < 48*time.Hour {
		return "Recently active"
	}

	return "Up next"
}

func deriveStateCode(res focusengine.FocusResult) string {
	if res.TotalProjectsCount == 0 {
		return "FRESH"
	}
	if res.ActiveProjectsCount == 0 {
		return "ARCHIVED"
	}
	if res.TotalWorkspaceTasksCount == 0 {
		return "EMPTY"
	}
	if res.ParticipatingTasksCount == 0 {
		return "PAUSED"
	}
	if res.ActionableCandidatesCount == 0 {
		return "CLEAR"
	}
	return "ACTIVE"
}

func NewFocusViewModel(res focusengine.FocusResult, loc *time.Location) FocusViewModel {
	if loc == nil {
		loc = time.UTC
	}
	now := time.Now()
	vm := FocusViewModel{
		StateCode:           deriveStateCode(res),
		ActiveProjectsCount: res.ActiveProjectsCount,
		Summary: WorkspaceSummary{
			ActiveProjectsCount:   res.ActiveProjectsCount,
			PausedProjectsCount:   res.PausedProjectsCount,
			ArchivedProjectsCount: res.ArchivedProjectsCount,
			ActionableTasksCount:  res.ActionableCandidatesCount,
			CompletedTasksToday:   res.CompletedTasksTodayCount,
		},
		Recommendations: make([]FocusItemView, 0),
	}

	if res.Hero != nil {
		heroView := MapFocusItemView(*res.Hero, now, loc)
		vm.Hero = &heroView
	}

	for _, item := range res.Recommendations {
		vm.Recommendations = append(vm.Recommendations, MapFocusItemView(item, now, loc))
	}

	return vm
}

func MapFocusItemView(item focusengine.FocusItem, now time.Time, loc *time.Location) FocusItemView {
	taskID := item.Task.PublicID
	if taskID == "" {
		taskID = item.Task.ID
	}

	projectID := item.Project.PublicID
	if projectID == "" {
		projectID = item.Project.ID
	}

	var checklistSummary *ChecklistSummary
	checklistViews := make([]FocusChecklistItemView, 0)

	if len(item.Task.ChecklistItems) > 0 {
		completed := 0
		for _, ch := range item.Task.ChecklistItems {
			if ch.IsCompleted {
				completed++
			}
			chID := ch.ID
			checklistViews = append(checklistViews, FocusChecklistItemView{
				ID:          chID,
				Title:       ch.Title,
				IsCompleted: ch.IsCompleted,
			})
		}
		checklistSummary = &ChecklistSummary{
			Completed: completed,
			Total:     len(item.Task.ChecklistItems),
		}
	}

	return FocusItemView{
		Task: FocusTaskView{
			ID:               taskID,
			Title:            item.Task.Title,
			Priority:         item.Task.Priority,
			DueDate:          item.Task.DueDate,
			ProjectID:        projectID,
			ChecklistSummary: checklistSummary,
			Checklist:        checklistViews,
		},
		Project: FocusProjectView{
			ID:    projectID,
			Name:  item.Project.Name,
			Color: item.Project.Color,
			Icon:  item.Project.Icon,
		},
		ReasonTag: DeriveReasonTag(item, now, loc),
	}
}
