package focusengine

import (
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

func timePtr(t time.Time) *time.Time {
	return &t
}

func TestDeadlineUtility(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	lambda := 0.30

	tests := []struct {
		name          string
		dueDate       *time.Time
		expectedScore float64
	}{
		{
			name:          "No Due Date",
			dueDate:       nil,
			expectedScore: 0.0,
		},
		{
			name:          "Overdue Task",
			dueDate:       timePtr(now.AddDate(0, 0, -2)),
			expectedScore: 0.0,
		},
		{
			name:          "Due Today",
			dueDate:       timePtr(now),
			expectedScore: 1.00,
		},
		{
			name:          "Due Tomorrow",
			dueDate:       timePtr(now.AddDate(0, 0, 1)),
			expectedScore: math.Exp(-lambda * 1),
		},
		{
			name:          "Due in 3 Days",
			dueDate:       timePtr(now.AddDate(0, 0, 3)),
			expectedScore: math.Exp(-lambda * 3),
		},
		{
			name:          "Due in 7 Days",
			dueDate:       timePtr(now.AddDate(0, 0, 7)),
			expectedScore: math.Exp(-lambda * 7),
		},
		{
			name:          "Due in 30 Days",
			dueDate:       timePtr(now.AddDate(0, 0, 30)),
			expectedScore: math.Exp(-lambda * 30),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := DeadlineUtility(tt.dueDate, now, time.UTC, lambda)
			if math.Abs(score-tt.expectedScore) > 1e-4 {
				t.Errorf("expected score %.4f, got %.4f", tt.expectedScore, score)
			}
		})
	}
}

func TestDeadlineUtilityRespectsClientTimezone(t *testing.T) {
	loc := time.FixedZone("client", 7*60*60)
	now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	due := time.Date(2026, 7, 31, 17, 0, 0, 0, time.UTC)

	// In UTC+7, due is Aug 1 00:00 (1 day out -> remainingDays = 1)
	scoreClient := DeadlineUtility(&due, now, loc, 0.30)
	expectedClient := math.Exp(-0.30 * 1)
	if math.Abs(scoreClient-expectedClient) > 1e-4 {
		t.Errorf("expected score %.4f in client tz, got %.4f", expectedClient, scoreClient)
	}

	// In UTC, due is Jul 31 17:00 (same day -> remainingDays = 0)
	scoreUTC := DeadlineUtility(&due, now, time.UTC, 0.30)
	if scoreUTC != 1.00 {
		t.Errorf("expected score 1.00 in UTC, got %.4f", scoreUTC)
	}
}

func TestOverdueUtility(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	lambda := 0.35

	tests := []struct {
		name          string
		dueDate       *time.Time
		expectedScore float64
	}{
		{
			name:          "No Due Date",
			dueDate:       nil,
			expectedScore: 0.0,
		},
		{
			name:          "Due Today",
			dueDate:       timePtr(now),
			expectedScore: 0.0,
		},
		{
			name:          "Due Tomorrow",
			dueDate:       timePtr(now.AddDate(0, 0, 1)),
			expectedScore: 0.0,
		},
		{
			name:          "1 Day Overdue",
			dueDate:       timePtr(now.AddDate(0, 0, -1)),
			expectedScore: 1.0 + (1.0 - math.Exp(-lambda*1)),
		},
		{
			name:          "3 Days Overdue",
			dueDate:       timePtr(now.AddDate(0, 0, -3)),
			expectedScore: 1.0 + (1.0 - math.Exp(-lambda*3)),
		},
		{
			name:          "7 Days Overdue",
			dueDate:       timePtr(now.AddDate(0, 0, -7)),
			expectedScore: 1.0 + (1.0 - math.Exp(-lambda*7)),
		},
		{
			name:          "100 Days Overdue (Saturating)",
			dueDate:       timePtr(now.AddDate(0, 0, -100)),
			expectedScore: 1.0 + (1.0 - math.Exp(-lambda*100)),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := OverdueUtility(tt.dueDate, now, time.UTC, lambda)
			if math.Abs(score-tt.expectedScore) > 1e-4 {
				t.Errorf("expected score %.4f, got %.4f", tt.expectedScore, score)
			}
		})
	}
}

func TestPriorityUtility(t *testing.T) {
	mapping := DefaultConfig().PriorityMapping

	tests := []struct {
		priority      string
		expectedScore float64
	}{
		{"urgent", 1.00},
		{"URGENT ", 1.00},
		{"high", 0.75},
		{"medium", 0.50},
		{"low", 0.25},
		{"none", 0.00},
		{"", 0.00},
	}

	for _, tt := range tests {
		t.Run(tt.priority, func(t *testing.T) {
			score := PriorityUtility(tt.priority, mapping)
			if score != tt.expectedScore {
				t.Errorf("expected score %.2f for priority '%s', got %.2f", tt.expectedScore, tt.priority, score)
			}
		})
	}
}

func TestRecencyUtility(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	lambda := 0.15

	tests := []struct {
		name          string
		updatedAt     time.Time
		expectedScore float64
	}{
		{name: "Zero UpdatedAt stays neutral", updatedAt: time.Time{}, expectedScore: 0.0},
		{name: "Touched today", updatedAt: now, expectedScore: 0.0},
		{name: "Touched 2 days ago", updatedAt: now.Add(-2 * 24 * time.Hour), expectedScore: 1.0 - math.Exp(-lambda*2)},
		{name: "Touched 7 days ago", updatedAt: now.Add(-7 * 24 * time.Hour), expectedScore: 1.0 - math.Exp(-lambda*7)},
		{name: "Touched 30 days ago", updatedAt: now.Add(-30 * 24 * time.Hour), expectedScore: 1.0 - math.Exp(-lambda*30)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := RecencyUtility(tt.updatedAt, now, lambda)
			if math.Abs(score-tt.expectedScore) > 1e-4 {
				t.Errorf("expected score %.4f, got %.4f", tt.expectedScore, score)
			}
		})
	}
}

func TestChecklistUtility(t *testing.T) {
	tests := []struct {
		name          string
		checklist     []models.ChecklistItem
		expectedScore float64
	}{
		{name: "No checklist", checklist: nil, expectedScore: 0.0},
		{name: "0/10 complete", checklist: makeChecklist(10, 0), expectedScore: 1.00},
		{name: "5/10 complete", checklist: makeChecklist(10, 5), expectedScore: 0.50},
		{name: "9/10 complete", checklist: makeChecklist(10, 9), expectedScore: 0.10},
		{name: "10/10 complete", checklist: makeChecklist(10, 10), expectedScore: 0.00},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := ChecklistUtility(tt.checklist)
			if math.Abs(score-tt.expectedScore) > 1e-4 {
				t.Errorf("expected score %.4f, got %.4f", tt.expectedScore, score)
			}
		})
	}
}

func TestFinishBonus(t *testing.T) {
	tests := []struct {
		name          string
		checklist     []models.ChecklistItem
		expectedScore float64
	}{
		{name: "No checklist", checklist: nil, expectedScore: 0.0},
		{name: "0% complete", checklist: makeChecklist(4, 0), expectedScore: 0.0},
		{name: "25% complete (1/4)", checklist: makeChecklist(4, 1), expectedScore: 0.50},
		{name: "64% complete (16/25)", checklist: makeChecklist(25, 16), expectedScore: 0.80},
		{name: "100% complete (4/4)", checklist: makeChecklist(4, 4), expectedScore: 1.00},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := FinishBonus(tt.checklist)
			if math.Abs(score-tt.expectedScore) > 1e-4 {
				t.Errorf("expected score %.4f, got %.4f", tt.expectedScore, score)
			}
		})
	}
}

func makeChecklist(total, completed int) []models.ChecklistItem {
	items := make([]models.ChecklistItem, total)
	for i := 0; i < total; i++ {
		items[i] = models.ChecklistItem{IsCompleted: i < completed}
	}
	return items
}

func TestExtractFeaturesAndAggregate(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	cfg := DefaultConfig()

	dueDate := now.AddDate(0, 0, 1)
	task := models.Task{
		DueDate:        &dueDate,
		Priority:       "urgent",
		ChecklistItems: makeChecklist(4, 1),
	}
	task.UpdatedAt = now.Add(-2 * 24 * time.Hour)

	fv := ExtractFeatures(task, now, time.UTC, cfg)

	expectedDeadline := math.Exp(-0.30 * 1)
	expectedOverdue := 0.0
	expectedPriority := 1.00
	expectedRecency := 1.0 - math.Exp(-0.15*2)
	expectedChecklist := 0.75
	expectedFinish := 0.50

	if math.Abs(fv.Deadline-expectedDeadline) > 1e-4 {
		t.Errorf("Deadline feature mismatch: got %.4f, want %.4f", fv.Deadline, expectedDeadline)
	}
	if fv.Overdue != expectedOverdue {
		t.Errorf("Overdue feature mismatch: got %.4f, want %.4f", fv.Overdue, expectedOverdue)
	}
	if fv.Priority != expectedPriority {
		t.Errorf("Priority feature mismatch: got %.4f, want %.4f", fv.Priority, expectedPriority)
	}
	if math.Abs(fv.Recency-expectedRecency) > 1e-4 {
		t.Errorf("Recency feature mismatch: got %.4f, want %.4f", fv.Recency, expectedRecency)
	}
	if fv.Checklist != expectedChecklist {
		t.Errorf("Checklist feature mismatch: got %.4f, want %.4f", fv.Checklist, expectedChecklist)
	}
	if fv.FinishBonus != expectedFinish {
		t.Errorf("FinishBonus feature mismatch: got %.4f, want %.4f", fv.FinishBonus, expectedFinish)
	}

	score := Aggregate(fv, cfg.Weights)
	expectedScore := cfg.Weights.Deadline*expectedDeadline +
		cfg.Weights.Overdue*expectedOverdue +
		cfg.Weights.Priority*expectedPriority +
		cfg.Weights.Recency*expectedRecency +
		cfg.Weights.Checklist*expectedChecklist +
		cfg.Weights.FinishBonus*expectedFinish

	if math.Abs(score-expectedScore) > 1e-4 {
		t.Errorf("Aggregate score mismatch: got %.4f, want %.4f", score, expectedScore)
	}

	directScore := ComputeAggregateScore(task, now, time.UTC, cfg)
	if math.Abs(directScore-expectedScore) > 1e-4 {
		t.Errorf("ComputeAggregateScore mismatch: got %.4f, want %.4f", directScore, expectedScore)
	}
}

func TestEvaluate_EmptyAndSingleTask(t *testing.T) {
	now := time.Now()
	cfg := DefaultConfig()
	projectMap := map[string]models.Project{
		"prj-1": {PublicBase: models.PublicBase{PublicID: "prj-1"}, Name: "Backend", FocusEnabled: true},
	}

	// 1. Empty tasks
	resEmpty := Evaluate([]models.Task{}, projectMap, now, time.UTC, cfg)
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
	resSingle := Evaluate([]models.Task{task}, projectMap, now, time.UTC, cfg)
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

func TestEvaluate_FocusEnabledFiltersCandidates(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	cfg := DefaultConfig()
	projectMap := map[string]models.Project{
		"disabled": {PublicBase: models.PublicBase{PublicID: "disabled"}, Name: "Disabled", FocusEnabled: false},
		"enabled":  {PublicBase: models.PublicBase{PublicID: "enabled"}, Name: "Enabled", FocusEnabled: true},
	}
	tasks := []models.Task{
		{PublicBase: models.PublicBase{PublicID: "disabled-task"}, ProjectID: "disabled", Priority: "urgent"},
		{PublicBase: models.PublicBase{PublicID: "enabled-task"}, ProjectID: "enabled", Priority: "urgent"},
	}

	res := Evaluate(tasks, projectMap, now, time.UTC, cfg)
	if res.Hero == nil {
		t.Fatal("expected enabled urgent task to be selected")
	}
	if res.Hero.Task.PublicID != "enabled-task" {
		t.Errorf("expected enabled task to be Hero, got %s", res.Hero.Task.PublicID)
	}
	if res.ActionableCandidatesCount != 1 {
		t.Errorf("expected one actionable candidate, got %d", res.ActionableCandidatesCount)
	}
}

func TestEvaluate_DeterministicSorting(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.UTC)
	cfg := DefaultConfig()
	projectMap := map[string]models.Project{
		"prj-1": {PublicBase: models.PublicBase{PublicID: "prj-1"}, Name: "Test Proj 1", FocusEnabled: true},
		"prj-2": {PublicBase: models.PublicBase{PublicID: "prj-2"}, Name: "Test Proj 2", FocusEnabled: true},
		"prj-3": {PublicBase: models.PublicBase{PublicID: "prj-3"}, Name: "Test Proj 3", FocusEnabled: true},
	}

	t1 := models.Task{
		PublicBase: models.PublicBase{
			PublicID: "tsk-3",
			Base:     models.Base{UpdatedAt: now.Add(-1 * time.Hour), CreatedAt: now.Add(-10 * time.Hour)},
		},
		ProjectID: "prj-1",
		Title:     "Task C (Recently Updated)",
		Priority:  "medium",
	}
	t2 := models.Task{
		PublicBase: models.PublicBase{
			PublicID: "tsk-1",
			Base:     models.Base{UpdatedAt: now.Add(-5 * time.Hour), CreatedAt: now.Add(-10 * time.Hour)},
		},
		ProjectID: "prj-2",
		Title:     "Task A (Older Updated)",
		Priority:  "medium",
	}
	t3 := models.Task{
		PublicBase: models.PublicBase{
			PublicID: "tsk-2",
			Base:     models.Base{UpdatedAt: now.Add(-1 * time.Hour), CreatedAt: now.Add(-10 * time.Hour)},
		},
		ProjectID: "prj-3",
		Title:     "Task B (Urgent Priority - Higher Score)",
		Priority:  "urgent",
	}

	res := Evaluate([]models.Task{t1, t2, t3}, projectMap, now, time.UTC, cfg)

	if res.Hero == nil {
		t.Fatalf("expected Hero to be present")
	}
	if res.Hero.Task.PublicID != "tsk-2" {
		t.Fatalf("expected Hero to be tsk-2 (higher score), got %s", res.Hero.Task.PublicID)
	}

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
	cfg := DefaultConfig()
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

	res := Evaluate(tasks, projectMap, now, time.UTC, cfg)

	if res.Hero == nil {
		t.Fatalf("expected Hero to be present")
	}
	if res.Hero.Task.PublicID != "tsk-1" {
		t.Errorf("expected Hero to be tsk-1, got %s", res.Hero.Task.PublicID)
	}

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
	cfg := DefaultConfig()
	projectMap := map[string]models.Project{}
	var tasks []models.Task

	for i := 1; i <= 10; i++ {
		pID := fmt.Sprintf("prj-%d", i)
		projectMap[pID] = models.Project{
			PublicBase:   models.PublicBase{PublicID: pID},
			Name:         fmt.Sprintf("Project %d", i),
			Status:       "active",
			FocusEnabled: true,
		}
		tasks = append(tasks, models.Task{
			PublicBase: models.PublicBase{PublicID: fmt.Sprintf("tsk-%d", i)},
			ProjectID:  pID,
			Priority:   "high",
			Title:      fmt.Sprintf("Task %d", i),
		})
	}

	res := Evaluate(tasks, projectMap, now, time.UTC, cfg)

	if res.Hero == nil {
		t.Fatalf("expected Hero to be non-nil")
	}

	if len(res.Recommendations) != 3 {
		t.Errorf("expected exactly 3 recommendations, got %d", len(res.Recommendations))
	}
}

func TestEvaluate_ColumnBehavior(t *testing.T) {
	now := time.Now()
	cfg := DefaultConfig()
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

	res := Evaluate(tasks, projectMap, now, time.UTC, cfg)

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
	cfg := DefaultConfig()
	projectMap := map[string]models.Project{
		"prj-active": {
			PublicBase:   models.PublicBase{PublicID: "prj-active"},
			Name:         "Active Project",
			Status:       "active",
			FocusEnabled: true,
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

	res := Evaluate(tasks, projectMap, now, time.UTC, cfg)

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
