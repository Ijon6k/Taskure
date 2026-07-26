package focusengine

import (
	"sort"
	"strings"
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
)

// priorityRank converts priority string to integer rank for sorting comparison.
func priorityRank(priority string) int {
	switch strings.ToLower(strings.TrimSpace(priority)) {
	case "urgent":
		return 4
	case "high":
		return 3
	case "medium":
		return 2
	case "low":
		return 1
	default:
		return 0
	}
}

// Evaluate evaluates a list of tasks across projects using pure domain Focus Engine rules.
func Evaluate(tasks []models.Task, projectMap map[string]models.Project, now time.Time) FocusResult {
	var items []FocusItem

	for _, task := range tasks {
		// Ignore completed tasks
		if task.Status == "done" {
			continue
		}

		score := EvaluateScore(task, now)
		proj := projectMap[task.ProjectID]

		items = append(items, FocusItem{
			Task:    task,
			Project: proj,
			Score:   score,
		})
	}

	if len(items) == 0 {
		return FocusResult{
			Hero:            nil,
			Recommendations: []FocusItem{},
		}
	}

	// Strict Deterministic Sorting (6-level tie-breaker)
	sort.SliceStable(items, func(i, j int) bool {
		// 1. Focus Score DESC
		if items[i].Score != items[j].Score {
			return items[i].Score > items[j].Score
		}

		// 2. Due Date ASC (Tasks with due dates first, earlier due dates first)
		iDue := items[i].Task.DueDate
		jDue := items[j].Task.DueDate
		if iDue != nil || jDue != nil {
			if iDue != nil && jDue == nil {
				return true
			}
			if iDue == nil && jDue != nil {
				return false
			}
			if !iDue.Equal(*jDue) {
				return iDue.Before(*jDue)
			}
		}

		// 3. Priority DESC
		iPrio := priorityRank(items[i].Task.Priority)
		jPrio := priorityRank(items[j].Task.Priority)
		if iPrio != jPrio {
			return iPrio > jPrio
		}

		// 4. Updated At ASC (Older untouched tasks higher attention)
		if !items[i].Task.UpdatedAt.Equal(items[j].Task.UpdatedAt) {
			return items[i].Task.UpdatedAt.Before(items[j].Task.UpdatedAt)
		}

		// 5. Created At ASC
		if !items[i].Task.CreatedAt.Equal(items[j].Task.CreatedAt) {
			return items[i].Task.CreatedAt.Before(items[j].Task.CreatedAt)
		}

		// 6. Task ID ASC (Deterministic fallback)
		idI := items[i].Task.PublicID
		if idI == "" {
			idI = items[i].Task.ID
		}
		idJ := items[j].Task.PublicID
		if idJ == "" {
			idJ = items[j].Task.ID
		}
		return idI < idJ
	})

	// Rank #1 is Hero
	hero := &items[0]

	// Recommendations: Rank 2 onwards with Diversity Filtering (max 1 task per project, max 10 items)
	var recommendations []FocusItem
	seenProjects := make(map[string]bool)

	for _, item := range items[1:] {
		pID := item.Task.ProjectID
		if seenProjects[pID] {
			continue
		}

		recommendations = append(recommendations, item)
		seenProjects[pID] = true
		if len(recommendations) == 10 {
			break
		}
	}

	if recommendations == nil {
		recommendations = []FocusItem{}
	}

	return FocusResult{
		Hero:            hero,
		Recommendations: recommendations,
	}
}
