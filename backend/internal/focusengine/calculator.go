package focusengine

import (
	"math"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

// CalculateDeadlineScore evaluates the nearness of a task's due date
// (0 - 50 pts). Overdue tasks escalate with lateness, capped at +10.
// Calendar days are resolved in loc (the client's timezone) so a date the
// user picked locally is never judged against the server's own timezone.
func CalculateDeadlineScore(dueDate *time.Time, now time.Time, loc *time.Location) float64 {
	if dueDate == nil {
		return 0.0
	}
	if loc == nil {
		loc = time.UTC
	}

	nowInTz := now.In(loc)
	dueInTz := dueDate.In(loc)

	// Normalize to calendar day boundaries for robust comparison
	nowDate := time.Date(nowInTz.Year(), nowInTz.Month(), nowInTz.Day(), 0, 0, 0, 0, loc)
	targetDate := time.Date(dueInTz.Year(), dueInTz.Month(), dueInTz.Day(), 0, 0, 0, 0, loc)

	diffDays := int(math.Round(targetDate.Sub(nowDate).Hours() / 24.0))

	switch {
	case diffDays < 0:
		overdueDays := -diffDays
		if overdueDays > 10 {
			overdueDays = 10
		}
		return 40.0 + float64(overdueDays)
	case diffDays == 0:
		return 38.0
	case diffDays == 1:
		return 35.0
	case diffDays == 2:
		return 30.0
	case diffDays == 3:
		return 25.0
	case diffDays >= 4 && diffDays <= 7:
		return 15.0
	default:
		return 0.0
	}
}

// CalculatePriorityScore returns the priority weight score (0 - 30 pts).
func CalculatePriorityScore(priority string) float64 {
	p := strings.ToLower(strings.TrimSpace(priority))
	switch p {
	case "urgent":
		return 30.0
	case "high":
		return 20.0
	case "medium":
		return 10.0
	case "low":
		return 5.0
	default:
		return 0.0
	}
}

// CalculateRecencyScore rewards tasks that have not been touched for a while
// (0 or 5 or 10 pts). A zero UpdatedAt (e.g. freshly created rows) stays
// neutral so it never dominates relative ranking.
func CalculateRecencyScore(updatedAt time.Time, now time.Time) float64 {
	if updatedAt.IsZero() {
		return 0.0
	}
	elapsed := now.Sub(updatedAt)
	switch {
	case elapsed >= 7*24*time.Hour:
		return 10.0
	case elapsed >= 3*24*time.Hour:
		return 5.0
	default:
		return 0.0
	}
}

// CalculateChecklistScore gives a small bump to tasks whose subtasks are not
// all completed yet (0 or 5 pts).
func CalculateChecklistScore(checklist []models.ChecklistItem) float64 {
	if len(checklist) == 0 {
		return 0.0
	}
	for _, item := range checklist {
		if !item.IsCompleted {
			return 5.0
		}
	}
	return 0.0
}

// EvaluateScore computes the total composite Focus Score
// (Deadline + Priority + Recency + Checklist).
func EvaluateScore(task models.Task, now time.Time, loc *time.Location) float64 {
	return CalculateDeadlineScore(task.DueDate, now, loc) +
		CalculatePriorityScore(task.Priority) +
		CalculateRecencyScore(task.UpdatedAt, now) +
		CalculateChecklistScore(task.ChecklistItems)
}
