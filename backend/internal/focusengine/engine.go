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

// Evaluate evaluates workspace tasks and project metadata into quantitative domain facts.
// The Focus Engine is strictly isolated from presentation state codes (FRESH, ARCHIVED, EMPTY, etc.).
func Evaluate(tasks []models.Task, projectMap map[string]models.Project, now time.Time) FocusResult {
	var items []FocusItem

	totalProjectsCount := len(projectMap)
	uniqueActiveProjects := make(map[string]models.Project)
	archivedProjectsCount := 0
	pausedProjectsCount := 0

	for _, proj := range projectMap {
		if proj.IsArchived || strings.EqualFold(proj.Status, "archived") || strings.EqualFold(proj.Status, "completed") {
			if proj.IsArchived || strings.EqualFold(proj.Status, "archived") {
				archivedProjectsCount++
			}
			continue
		}
		key := proj.ID
		if key == "" {
			key = proj.PublicID
		}
		if key == "" {
			continue
		}
		uniqueActiveProjects[key] = proj
	}

	activeProjectsCount := len(uniqueActiveProjects)

	// Collect participating (non-paused) projects
	var focusParticipatingProjects []models.Project
	for _, proj := range uniqueActiveProjects {
		if strings.EqualFold(proj.Status, "paused") {
			pausedProjectsCount++
			continue
		}
		focusParticipatingProjects = append(focusParticipatingProjects, proj)
	}

	// Build map of participating and active project IDs
	participatingMap := make(map[string]bool)
	for _, proj := range focusParticipatingProjects {
		if proj.ID != "" {
			participatingMap[proj.ID] = true
		}
		if proj.PublicID != "" {
			participatingMap[proj.PublicID] = true
		}
	}

	activeProjectsMap := make(map[string]bool)
	for _, proj := range uniqueActiveProjects {
		if proj.ID != "" {
			activeProjectsMap[proj.ID] = true
		}
		if proj.PublicID != "" {
			activeProjectsMap[proj.PublicID] = true
		}
	}

	var totalTasksParticipating int
	var totalTasksWorkspace int
	var completedTasksTodayCount int

	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	for _, task := range tasks {
		if activeProjectsMap[task.ProjectID] {
			totalTasksWorkspace++
			if participatingMap[task.ProjectID] {
				totalTasksParticipating++
			}
		}
	}

	if totalTasksWorkspace == 0 {
		for _, proj := range uniqueActiveProjects {
			for _, col := range proj.Columns {
				totalTasksWorkspace += len(col.Tasks)
				if !strings.EqualFold(proj.Status, "paused") {
					totalTasksParticipating += len(col.Tasks)
				}
			}
		}
	}

	// Evaluate candidate tasks for focus scoring
	for _, task := range tasks {
		proj, exists := projectMap[task.ProjectID]
		if !exists || (proj.ID == "" && proj.PublicID == "") {
			continue
		}

		colBehavior := models.ColumnBehaviorActive
		if task.Column.ID != "" && task.Column.Behavior != "" {
			colBehavior = task.Column.Behavior
		} else {
			for _, col := range proj.Columns {
				if col.ID == task.ColumnID || (col.ID != "" && col.ID == task.Column.ID) {
					if col.Behavior != "" {
						colBehavior = col.Behavior
					}
					break
				}
			}
		}

		if colBehavior == models.ColumnBehaviorCompleted || task.Status == "done" {
			if !task.UpdatedAt.Before(todayStart) {
				completedTasksTodayCount++
			}
			continue
		}

		if strings.EqualFold(proj.Status, "paused") || strings.EqualFold(proj.Status, "completed") || proj.IsArchived || strings.EqualFold(proj.Status, "archived") {
			continue
		}

		score := EvaluateScore(task, now)
		items = append(items, FocusItem{
			Task:    task,
			Project: proj,
			Score:   score,
		})
	}

	actionableCandidatesCount := len(items)

	if actionableCandidatesCount == 0 {
		return FocusResult{
			TotalProjectsCount:        totalProjectsCount,
			ActiveProjectsCount:       activeProjectsCount,
			PausedProjectsCount:       pausedProjectsCount,
			ArchivedProjectsCount:     archivedProjectsCount,
			TotalWorkspaceTasksCount:  totalTasksWorkspace,
			ParticipatingTasksCount:   totalTasksParticipating,
			ActionableCandidatesCount: 0,
			CompletedTasksTodayCount:  completedTasksTodayCount,
			Hero:                      nil,
			Recommendations:           []FocusItem{},
		}
	}

	// Deterministic 6-level tie-breaker sorting
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Score != items[j].Score {
			return items[i].Score > items[j].Score
		}
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
		iPrio := priorityRank(items[i].Task.Priority)
		jPrio := priorityRank(items[j].Task.Priority)
		if iPrio != jPrio {
			return iPrio > jPrio
		}
		if !items[i].Task.UpdatedAt.Equal(items[j].Task.UpdatedAt) {
			return items[i].Task.UpdatedAt.Before(items[j].Task.UpdatedAt)
		}
		if !items[i].Task.CreatedAt.Equal(items[j].Task.CreatedAt) {
			return items[i].Task.CreatedAt.Before(items[j].Task.CreatedAt)
		}
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

	hero := &items[0]

	// Top 3 Recommendations from items[1:] (Rank #2 onward)
	var recommendations []FocusItem
	addedTaskIDs := make(map[string]bool)
	seenProjects := make(map[string]bool)
	if hero != nil && hero.Task.ProjectID != "" {
		seenProjects[hero.Task.ProjectID] = true
	}

	// Pass 1: Prefer tasks from distinct projects
	for _, item := range items[1:] {
		pID := item.Task.ProjectID
		tID := item.Task.PublicID
		if tID == "" {
			tID = item.Task.ID
		}
		if seenProjects[pID] {
			continue
		}
		recommendations = append(recommendations, item)
		seenProjects[pID] = true
		addedTaskIDs[tID] = true
		if len(recommendations) == 3 {
			break
		}
	}

	// Pass 2: Fallback to next highest priority tasks
	if len(recommendations) < 3 {
		for _, item := range items[1:] {
			tID := item.Task.PublicID
			if tID == "" {
				tID = item.Task.ID
			}
			if addedTaskIDs[tID] {
				continue
			}
			recommendations = append(recommendations, item)
			addedTaskIDs[tID] = true
			if len(recommendations) == 3 {
				break
			}
		}
	}

	if recommendations == nil {
		recommendations = []FocusItem{}
	}

	return FocusResult{
		TotalProjectsCount:        totalProjectsCount,
		ActiveProjectsCount:       activeProjectsCount,
		PausedProjectsCount:       pausedProjectsCount,
		ArchivedProjectsCount:     archivedProjectsCount,
		TotalWorkspaceTasksCount:  totalTasksWorkspace,
		ParticipatingTasksCount:   totalTasksParticipating,
		ActionableCandidatesCount: actionableCandidatesCount,
		CompletedTasksTodayCount:  completedTasksTodayCount,
		Hero:                      hero,
		Recommendations:           recommendations,
	}
}
