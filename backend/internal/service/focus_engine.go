package service

import (
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
)

// FocusScoreResult holds a task with its calculated score and English rationale.
type FocusScoreResult struct {
	Task         models.Task `json:"task"`
	ProjectName  string      `json:"project_name"`
	ProjectColor string      `json:"project_color"`
	Score        float64     `json:"score"`
	Reason       string      `json:"reason"`
	DaysRemaining *int       `json:"days_remaining,omitempty"`
}

// CalculateFocusTasks scores non-completed tasks across projects and returns the highest priority item.
func CalculateFocusTasks(tasks []models.Task, projectMap map[string]models.Project) []FocusScoreResult {
	var results []FocusScoreResult
	now := time.Now()

	for _, task := range tasks {
		// Ignore tasks in 'done' or completed status
		if task.Status == "done" {
			continue
		}

		score := 0.0
		var reasons []string
		var daysRem *int

		// 1. Deadline Proximity (0-40 pts)
		if task.DueDate != nil {
			diff := task.DueDate.Sub(now)
			days := int(math.Ceil(diff.Hours() / 24.0))
			daysRem = &days

			if days < 0 {
				score += 40.0
				reasons = append(reasons, fmt.Sprintf("%d days overdue", -days))
			} else if days == 0 {
				score += 38.0
				reasons = append(reasons, "Due today")
			} else if days <= 3 {
				score += 35.0 - float64(days*5)
				reasons = append(reasons, fmt.Sprintf("Due in %d days", days))
			} else if days <= 7 {
				score += 15.0
				reasons = append(reasons, fmt.Sprintf("Due in %d days", days))
			}
		}

		// 2. Priority Weight (0-30 pts)
		switch task.Priority {
		case "urgent":
			score += 30.0
			reasons = append(reasons, "Urgent Priority")
		case "high":
			score += 20.0
			reasons = append(reasons, "High Priority")
		case "medium":
			score += 10.0
		case "low":
			score += 5.0
		}

		// 3. Status Bonus (In Progress tasks take priority over untouched Todo tasks)
		if task.Status == "in_progress" {
			score += 15.0
			reasons = append(reasons, "In Progress")
		}

		// Default fallback reason
		reasonStr := "Top priority task"
		if len(reasons) > 0 {
			reasonStr = reasons[0]
			if len(reasons) > 1 {
				reasonStr = fmt.Sprintf("%s · %s", reasons[0], reasons[1])
			}
		}

		projName := "Personal Project"
		projColor := "#B4A0E5"
		if proj, ok := projectMap[task.ProjectID]; ok {
			projName = proj.Name
			if proj.Color != "" {
				projColor = proj.Color
			}
		}

		results = append(results, FocusScoreResult{
			Task:          task,
			ProjectName:   projName,
			ProjectColor:  projColor,
			Score:         score,
			Reason:        reasonStr,
			DaysRemaining: daysRem,
		})
	}

	// Sort descending by score
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	return results
}
