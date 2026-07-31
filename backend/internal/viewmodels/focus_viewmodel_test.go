package viewmodels

import (
	"testing"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/focusengine"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

func TestDeriveStateCode(t *testing.T) {
	tests := []struct {
		name         string
		result       focusengine.FocusResult
		expectedCode string
	}{
		{
			name: "FRESH state - 0 total projects",
			result: focusengine.FocusResult{
				TotalProjectsCount: 0,
			},
			expectedCode: "FRESH",
		},
		{
			name: "ARCHIVED state - total projects > 0 but 0 active projects",
			result: focusengine.FocusResult{
				TotalProjectsCount:    3,
				ActiveProjectsCount:   0,
				ArchivedProjectsCount: 3,
			},
			expectedCode: "ARCHIVED",
		},
		{
			name: "EMPTY state - active projects exist but 0 tasks",
			result: focusengine.FocusResult{
				TotalProjectsCount:       2,
				ActiveProjectsCount:      2,
				TotalWorkspaceTasksCount: 0,
			},
			expectedCode: "EMPTY",
		},
		{
			name: "PAUSED state - tasks exist but 0 participating tasks",
			result: focusengine.FocusResult{
				TotalProjectsCount:       2,
				ActiveProjectsCount:      2,
				TotalWorkspaceTasksCount: 5,
				ParticipatingTasksCount:  0,
			},
			expectedCode: "PAUSED",
		},
		{
			name: "CLEAR state - participating tasks exist but 0 actionable candidates",
			result: focusengine.FocusResult{
				TotalProjectsCount:        2,
				ActiveProjectsCount:       2,
				TotalWorkspaceTasksCount:  5,
				ParticipatingTasksCount:   5,
				ActionableCandidatesCount: 0,
			},
			expectedCode: "CLEAR",
		},
		{
			name: "ACTIVE state - actionable candidates exist",
			result: focusengine.FocusResult{
				TotalProjectsCount:        2,
				ActiveProjectsCount:       2,
				TotalWorkspaceTasksCount:  5,
				ParticipatingTasksCount:   5,
				ActionableCandidatesCount: 2,
				Hero:                      &focusengine.FocusItem{},
			},
			expectedCode: "ACTIVE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vm := NewFocusViewModel(tt.result, time.UTC)
			if vm.StateCode != tt.expectedCode {
				t.Errorf("expected StateCode '%s', got '%s'", tt.expectedCode, vm.StateCode)
			}
		})
	}
}

func TestDeriveReasonTag(t *testing.T) {
	now := time.Date(2026, 7, 28, 12, 0, 0, 0, time.UTC)
	yesterday := now.AddDate(0, 0, -1)
	today := now
	nearDeadline := now.AddDate(0, 0, 2)
	// Exactly the start of the third day is still inside the 3-day window.
	dayAfterStart := time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC)
	beyondWindow := dayAfterStart.Add(1)

	tests := []struct {
		name        string
		item        focusengine.FocusItem
		expectedTag string
	}{
		{
			name: "Overdue task",
			item: focusengine.FocusItem{
				Task: models.Task{DueDate: &yesterday},
			},
			expectedTag: "Overdue",
		},
		{
			name: "Due today task",
			item: focusengine.FocusItem{
				Task: models.Task{DueDate: &today},
			},
			expectedTag: "Due today",
		},
		{
			name: "Near deadline task",
			item: focusengine.FocusItem{
				Task: models.Task{DueDate: &nearDeadline},
			},
			expectedTag: "Near deadline",
		},
		{
			name: "Near deadline inclusive boundary",
			item: focusengine.FocusItem{
				Task: models.Task{DueDate: &dayAfterStart},
			},
			expectedTag: "Near deadline",
		},
		{
			name: "Beyond 3-day window falls through",
			item: focusengine.FocusItem{
				Task: models.Task{DueDate: &beyondWindow},
			},
			expectedTag: "Up next",
		},
		{
			name: "High priority task",
			item: focusengine.FocusItem{
				Task: models.Task{Priority: "high"},
			},
			expectedTag: "High priority",
		},
		{
			name: "Blocking progress task (uncompleted checklist)",
			item: focusengine.FocusItem{
				Task: models.Task{
					ChecklistItems: []models.ChecklistItem{
						{Title: "Subtask 1", IsCompleted: false},
					},
				},
			},
			expectedTag: "Blocking progress",
		},
		{
			name: "Recently active task",
			item: focusengine.FocusItem{
				Task: models.Task{
					PublicBase: models.PublicBase{Base: models.Base{UpdatedAt: now.Add(-10 * time.Hour)}},
				},
			},
			expectedTag: "Recently active",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tag := DeriveReasonTag(tt.item, now, time.UTC)
			if tag != tt.expectedTag {
				t.Errorf("expected ReasonTag '%s', got '%s'", tt.expectedTag, tag)
			}
		})
	}
}

func TestDeriveReasonTagRespectsClientTimezone(t *testing.T) {
	// UTC+7 (WIB) client at 19:00 local on Jul 31 picks "tomorrow" = Aug 1.
	// The drawer stores that as the UTC instant of local midnight (Jul 31
	// 17:00Z). Judged in the client zone it is tomorrow ("Near deadline"),
	// not "Due today" as a UTC-server would conclude.
	loc := time.FixedZone("client", 7*60*60)
	now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC) // 19:00 WIB, still Jul 31
	due := time.Date(2026, 7, 31, 17, 0, 0, 0, time.UTC) // Aug 1 00:00 WIB

	item := focusengine.FocusItem{Task: models.Task{DueDate: &due}}

	tag := DeriveReasonTag(item, now, loc)
	if tag != "Near deadline" {
		t.Errorf("expected 'Near deadline' in client tz, got '%s'", tag)
	}
}
