package focusengine

import (
	"math"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

// CalculateDeadlineScore evaluates the nearness of a task's due date (0 - 40 pts).
func CalculateDeadlineScore(dueDate *time.Time, now time.Time) float64 {
	if dueDate == nil {
		return 0.0
	}

	// Normalize to calendar day boundaries for robust comparison
	nowDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	targetDate := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 0, 0, 0, 0, dueDate.Location())

	diffDays := int(math.Round(targetDate.Sub(nowDate).Hours() / 24.0))

	switch {
	case diffDays < 0:
		return 40.0
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

// EvaluateScore computes the total composite Focus Score (Deadline + Priority).
func EvaluateScore(task models.Task, now time.Time) float64 {
	return CalculateDeadlineScore(task.DueDate, now) + CalculatePriorityScore(task.Priority)
}
