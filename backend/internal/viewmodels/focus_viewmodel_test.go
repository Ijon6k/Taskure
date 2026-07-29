package viewmodels

import (
	"testing"
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/focusengine"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
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
			vm := NewFocusViewModel(tt.result)
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
			tag := DeriveReasonTag(tt.item, now)
			if tag != tt.expectedTag {
				t.Errorf("expected ReasonTag '%s', got '%s'", tt.expectedTag, tag)
			}
		})
	}
}
