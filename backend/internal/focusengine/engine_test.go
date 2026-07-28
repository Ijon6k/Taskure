package focusengine

import (
	"fmt"
	"testing"
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
)

func TestCalculateDeadlineScore(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name          string
		dueDate       *time.Time
		expectedScore float64
	}{
		{
			name:          "Overdue 2 days",
			dueDate:       timePtr(now.AddDate(0, 0, -2)),
			expectedScore: 40.0,
		},
		{
			name:          "Overdue 1 day",
			dueDate:       timePtr(now.AddDate(0, 0, -1)),
			expectedScore: 40.0,
		},
		{
			name:          "Due Today",
			dueDate:       timePtr(now),
			expectedScore: 38.0,
		},
		{
			name:          "Due Tomorrow",
			dueDate:       timePtr(now.AddDate(0, 0, 1)),
			expectedScore: 35.0,
		},
		{
			name:          "Due in 2 Days",
			dueDate:       timePtr(now.AddDate(0, 0, 2)),
			expectedScore: 30.0,
		},
		{
			name:          "Due in 3 Days",
			dueDate:       timePtr(now.AddDate(0, 0, 3)),
			expectedScore: 25.0,
		},
		{
			name:          "Due in 5 Days",
			dueDate:       timePtr(now.AddDate(0, 0, 5)),
			expectedScore: 15.0,
		},
		{
			name:          "Due in 10 Days (No Score)",
			dueDate:       timePtr(now.AddDate(0, 0, 10)),
			expectedScore: 0.0,
		},
		{
			name:          "No Due Date",
			dueDate:       nil,
			expectedScore: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := CalculateDeadlineScore(tt.dueDate, now)
			if score != tt.expectedScore {
				t.Errorf("expected score %.1f, got %.1f", tt.expectedScore, score)
			}
		})
	}
}

func TestCalculatePriorityScore(t *testing.T) {
	tests := []struct {
		priority      string
		expectedScore float64
	}{
		{"urgent", 30.0},
		{"URGENT ", 30.0},
		{"high", 20.0},
		{"medium", 10.0},
		{"low", 5.0},
		{"none", 0.0},
		{"", 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.priority, func(t *testing.T) {
			score := CalculatePriorityScore(tt.priority)
			if score != tt.expectedScore {
				t.Errorf("expected score %.1f for priority '%s', got %.1f", tt.expectedScore, tt.priority, score)
			}
		})
	}
}

func TestEvaluate_EmptyAndSingleTask(t *testing.T) {
	now := time.Now()
	projectMap := map[string]models.Project{
		"prj-1": {PublicBase: models.PublicBase{PublicID: "prj-1"}, Name: "Backend", FocusEnabled: true},
	}

	// 1. Empty tasks
	resEmpty := Evaluate([]models.Task{}, projectMap, now)
	if resEmpty.Hero != nil {
		t.Errorf("expected Hero to be nil for empty tasks")
	}
	if len(resEmpty.Recommendations) != 0 {
		t.Errorf("expected Recommendations to be empty for empty tasks")
	}

	// 2. Single Task
	task := models.Task{
		PublicBase: models.PublicBase{PublicID: "tsk-1"},
		Title:      "Setup Database",
		ProjectID:  "prj-1",
		Priority:   "high",
		Status:     "todo",
	}
	resSingle := Evaluate([]models.Task{task}, projectMap, now)
	if resSingle.Hero == nil {
		t.Fatalf("expected Hero to be present")
	}
	if resSingle.Hero.Task.PublicID != "tsk-1" {
		t.Errorf("expected Hero Task PublicID to be tsk-1, got %s", resSingle.Hero.Task.PublicID)
	}
	if resSingle.Hero.Project.Name != "Backend" {
		t.Errorf("expected Project Name Backend, got %s", resSingle.Hero.Project.Name)
	}
	if len(resSingle.Recommendations) != 0 {
		t.Errorf("expected Recommendations to be empty for single task")
	}
}

func TestEvaluate_DeterministicSorting(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	projectMap := map[string]models.Project{
		"prj-1": {PublicBase: models.PublicBase{PublicID: "prj-1"}, Name: "Test Proj 1", FocusEnabled: true},
		"prj-2": {PublicBase: models.PublicBase{PublicID: "prj-2"}, Name: "Test Proj 2", FocusEnabled: true},
		"prj-3": {PublicBase: models.PublicBase{PublicID: "prj-3"}, Name: "Test Proj 3", FocusEnabled: true},
	}

	// Create 3 tasks with SAME Focus Score (Medium priority = 10 pts, No due date)
	// Tie breaker should rely on UpdatedAt ASC -> CreatedAt ASC -> TaskID ASC
	t1 := models.Task{
		PublicBase: models.PublicBase{
			PublicID:  "tsk-3",
			Base:      models.Base{UpdatedAt: now.Add(-1 * time.Hour), CreatedAt: now.Add(-10 * time.Hour)},
		},
		ProjectID: "prj-1",
		Title:     "Task C (Recently Updated)",
		Priority:  "medium",
	}
	t2 := models.Task{
		PublicBase: models.PublicBase{
			PublicID:  "tsk-1",
			Base:      models.Base{UpdatedAt: now.Add(-5 * time.Hour), CreatedAt: now.Add(-10 * time.Hour)},
		},
		ProjectID: "prj-2",
		Title:     "Task A (Older Updated)",
		Priority:  "medium",
	}
	t3 := models.Task{
		PublicBase: models.PublicBase{
			PublicID:  "tsk-2",
			Base:      models.Base{UpdatedAt: now.Add(-1 * time.Hour), CreatedAt: now.Add(-10 * time.Hour)},
		},
		ProjectID: "prj-3",
		Title:     "Task B (Urgent Priority - Higher Score)",
		Priority:  "urgent",
	}

	res := Evaluate([]models.Task{t1, t2, t3}, projectMap, now)

	// t3 has Urgent priority (score 30), so t3 MUST be Hero (#1)
	if res.Hero == nil {
		t.Fatalf("expected Hero to be present")
	}
	if res.Hero.Task.PublicID != "tsk-2" {
		t.Fatalf("expected Hero to be tsk-2 (higher score), got %s", res.Hero.Task.PublicID)
	}

	// Recommendations: t2 (UpdatedAt 5h ago) should come before t1 (UpdatedAt 1h ago)
	if len(res.Recommendations) != 2 {
		t.Fatalf("expected 2 recommendations, got %d", len(res.Recommendations))
	}
	if res.Recommendations[0].Task.PublicID != "tsk-1" {
		t.Errorf("expected 1st recommendation to be tsk-1 (older UpdatedAt), got %s", res.Recommendations[0].Task.PublicID)
	}
	if res.Recommendations[1].Task.PublicID != "tsk-3" {
		t.Errorf("expected 2nd recommendation to be tsk-3, got %s", res.Recommendations[1].Task.PublicID)
	}
}

func TestEvaluate_DiversityFiltering(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	projectMap := map[string]models.Project{
		"prj-1": {PublicBase: models.PublicBase{PublicID: "prj-1"}, Name: "AI Service", FocusEnabled: true},
		"prj-2": {PublicBase: models.PublicBase{PublicID: "prj-2"}, Name: "Roadmap", FocusEnabled: true},
		"prj-3": {PublicBase: models.PublicBase{PublicID: "prj-3"}, Name: "Study", FocusEnabled: true},
	}

	tasks := []models.Task{
		{PublicBase: models.PublicBase{PublicID: "tsk-1"}, ProjectID: "prj-1", Priority: "urgent", Title: "AI Task 1"},
		{PublicBase: models.PublicBase{PublicID: "tsk-2"}, ProjectID: "prj-1", Priority: "high", Title: "AI Task 2"},
		{PublicBase: models.PublicBase{PublicID: "tsk-3"}, ProjectID: "prj-1", Priority: "medium", Title: "AI Task 3"},
		{PublicBase: models.PublicBase{PublicID: "tsk-4"}, ProjectID: "prj-2", Priority: "high", Title: "Roadmap Task 1"},
		{PublicBase: models.PublicBase{PublicID: "tsk-5"}, ProjectID: "prj-3", Priority: "medium", Title: "Study Task 1"},
	}

	res := Evaluate(tasks, projectMap, now)

	// Hero should be tsk-1 (AI Service)
	if res.Hero == nil {
		t.Fatalf("expected Hero to be present")
	}
	if res.Hero.Task.PublicID != "tsk-1" {
		t.Errorf("expected Hero to be tsk-1, got %s", res.Hero.Task.PublicID)
	}

	// Top recommendations must prioritize distinct projects (prj-2 and prj-3 first)
	if len(res.Recommendations) != 3 {
		t.Fatalf("expected 3 recommendations, got %d", len(res.Recommendations))
	}

	if res.Recommendations[0].Task.ProjectID != "prj-2" {
		t.Errorf("expected 1st recommendation to be prj-2 (distinct project), got %s", res.Recommendations[0].Task.ProjectID)
	}
	if res.Recommendations[1].Task.ProjectID != "prj-3" {
		t.Errorf("expected 2nd recommendation to be prj-3 (distinct project), got %s", res.Recommendations[1].Task.ProjectID)
	}
	if res.Recommendations[2].Task.PublicID != "tsk-2" {
		t.Errorf("expected 3rd recommendation fallback to be tsk-2, got %s", res.Recommendations[2].Task.PublicID)
	}
}

func TestEvaluate_MaxThreeRecommendations(t *testing.T) {
	now := time.Now()
	projectMap := map[string]models.Project{}
	var tasks []models.Task

	// Create 10 tasks across 10 different projects
	for i := 1; i <= 10; i++ {
		pID := fmt.Sprintf("prj-%d", i)
		projectMap[pID] = models.Project{
			PublicBase: models.PublicBase{PublicID: pID},
			Name:       fmt.Sprintf("Project %d", i),
			Status:     "active",
		}
		tasks = append(tasks, models.Task{
			PublicBase: models.PublicBase{PublicID: fmt.Sprintf("tsk-%d", i)},
			ProjectID:  pID,
			Priority:   "high",
			Title:      fmt.Sprintf("Task %d", i),
		})
	}

	res := Evaluate(tasks, projectMap, now)

	// Hero = 1 task
	if res.Hero == nil {
		t.Fatalf("expected Hero to be non-nil")
	}

	// Recommendations must be capped at 3 items maximum
	if len(res.Recommendations) != 3 {
		t.Errorf("expected exactly 3 recommendations, got %d", len(res.Recommendations))
	}
}

func TestEvaluate_ColumnBehavior(t *testing.T) {
	now := time.Now()
	projectMap := map[string]models.Project{
		"prj-1": {
			PublicBase:   models.PublicBase{PublicID: "prj-1"},
			Name:         "Project with Completed Column",
			FocusEnabled: true,
			Columns: []models.Column{
				{InternalBase: models.InternalBase{ID: "col-active"}, Behavior: models.ColumnBehaviorActive},
				{InternalBase: models.InternalBase{ID: "col-done"}, Behavior: models.ColumnBehaviorCompleted},
				{InternalBase: models.InternalBase{ID: "col-archive"}, Behavior: models.ColumnBehaviorCompleted},
			},
		},
		"prj-2": {
			PublicBase:   models.PublicBase{PublicID: "prj-2"},
			Name:         "Project without Completed Column",
			FocusEnabled: true,
			Columns: []models.Column{
				{InternalBase: models.InternalBase{ID: "col-todo"}, Behavior: models.ColumnBehaviorActive},
				{InternalBase: models.InternalBase{ID: "col-progress"}, Behavior: models.ColumnBehaviorActive},
			},
		},
	}

	tasks := []models.Task{
		{
			PublicBase: models.PublicBase{PublicID: "tsk-active-1"},
			ProjectID:  "prj-1",
			ColumnID:   "col-active",
			Column:     models.Column{InternalBase: models.InternalBase{ID: "col-active"}, Behavior: models.ColumnBehaviorActive},
			Priority:   "high",
			Title:      "Active Task",
		},
		{
			PublicBase: models.PublicBase{PublicID: "tsk-completed-1"},
			ProjectID:  "prj-1",
			ColumnID:   "col-done",
			Column:     models.Column{InternalBase: models.InternalBase{ID: "col-done"}, Behavior: models.ColumnBehaviorCompleted},
			Priority:   "urgent",
			Title:      "Done Task (Should be ignored)",
		},
		{
			PublicBase: models.PublicBase{PublicID: "tsk-archive-1"},
			ProjectID:  "prj-1",
			ColumnID:   "col-archive",
			Column:     models.Column{InternalBase: models.InternalBase{ID: "col-archive"}, Behavior: models.ColumnBehaviorCompleted},
			Priority:   "urgent",
			Title:      "Archived Task (Should be ignored)",
		},
		{
			PublicBase: models.PublicBase{PublicID: "tsk-no-completed-col"},
			ProjectID:  "prj-2",
			ColumnID:   "col-todo",
			Column:     models.Column{InternalBase: models.InternalBase{ID: "col-todo"}, Behavior: models.ColumnBehaviorActive},
			Priority:   "medium",
			Title:      "Task in project without completed column (Fallback active)",
		},
	}

	res := Evaluate(tasks, projectMap, now)

	if res.Hero == nil {
		t.Fatalf("expected Hero to be present")
	}
	if res.Hero.Task.PublicID != "tsk-active-1" {
		t.Errorf("expected Hero to be tsk-active-1, got %s", res.Hero.Task.PublicID)
	}

	if len(res.Recommendations) != 1 {
		t.Fatalf("expected 1 recommendation, got %d", len(res.Recommendations))
	}
	if res.Recommendations[0].Task.PublicID != "tsk-no-completed-col" {
		t.Errorf("expected recommendation to be tsk-no-completed-col, got %s", res.Recommendations[0].Task.PublicID)
	}
}

func TestEvaluate_FocusParticipation(t *testing.T) {
	now := time.Now()
	projectMap := map[string]models.Project{
		"prj-active": {
			PublicBase: models.PublicBase{PublicID: "prj-active"},
			Name:       "Active Project",
			Status:     "active",
		},
		"prj-paused": {
			PublicBase: models.PublicBase{PublicID: "prj-paused"},
			Name:       "Paused Project",
			Status:     "paused",
		},
		"prj-archived": {
			PublicBase: models.PublicBase{PublicID: "prj-archived"},
			Name:       "Archived Project",
			Status:     "archived",
		},
	}

	tasks := []models.Task{
		{
			PublicBase: models.PublicBase{PublicID: "tsk-active"},
			ProjectID:  "prj-active",
			Priority:   "high",
			Title:      "Active Focus Task",
		},
		{
			PublicBase: models.PublicBase{PublicID: "tsk-paused"},
			ProjectID:  "prj-paused",
			Priority:   "urgent",
			Title:      "Urgent Task in Paused Project (Excluded)",
		},
		{
			PublicBase: models.PublicBase{PublicID: "tsk-archived"},
			ProjectID:  "prj-archived",
			Priority:   "urgent",
			Title:      "Urgent Task in Archived Project (Excluded)",
		},
	}

	res := Evaluate(tasks, projectMap, now)

	if res.Hero == nil {
		t.Fatalf("expected Hero to be present")
	}
	if res.Hero.Task.PublicID != "tsk-active" {
		t.Errorf("expected Hero to be tsk-active, got %s", res.Hero.Task.PublicID)
	}
	if len(res.Recommendations) != 0 {
		t.Errorf("expected 0 recommendations, got %d", len(res.Recommendations))
	}
}

func timePtr(t time.Time) *time.Time {
	return &t
}
