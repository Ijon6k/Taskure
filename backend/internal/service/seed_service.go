package service

import (
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/repository"
)

type SeedService interface {
	SeedDemoData() ([]string, error)
}

type seedService struct {
	workspaceRepo repository.WorkspaceRepository
	projectRepo   repository.ProjectRepository
	columnRepo    repository.ColumnRepository
	taskRepo      repository.TaskRepository
}

func NewSeedService(
	workspaceRepo repository.WorkspaceRepository,
	projectRepo repository.ProjectRepository,
	columnRepo repository.ColumnRepository,
	taskRepo repository.TaskRepository,
) SeedService {
	return &seedService{
		workspaceRepo: workspaceRepo,
		projectRepo:   projectRepo,
		columnRepo:    columnRepo,
		taskRepo:      taskRepo,
	}
}

func (s *seedService) SeedDemoData() ([]string, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}

	dueInTwoDays := time.Now().AddDate(0, 0, 2)
	dueTomorrow := time.Now().AddDate(0, 0, 1)
	dueNextWeek := time.Now().AddDate(0, 0, 7)

	// 1. Project: Q3 API Redesign
	p1 := models.Project{
		Name:        "Q3 API Redesign",
		Description: "Redesign the public REST API to support the v2 schema and OAuth 2.1.",
		Color:       "#7F9CF5",
		Icon:        "⚡",
		Status:      "active",
		IsPinned:    true,
		WorkspaceID: ws.ID,
		OwnerID:     ws.OwnerID,
	}
	_ = s.projectRepo.CreateProject(&p1)

	col1 := models.Column{Name: "Backlog", Position: 0, ProjectID: p1.ID, Color: "#8A8F98"}
	col2 := models.Column{Name: "Todo", Position: 1, ProjectID: p1.ID, Color: "#6B7280"}
	col3 := models.Column{Name: "In Progress", Position: 2, ProjectID: p1.ID, Color: "#7F9CF5"}
	col4 := models.Column{Name: "Done", Position: 3, ProjectID: p1.ID, Color: "#68D391"}
	_ = s.columnRepo.CreateColumn(&col1)
	_ = s.columnRepo.CreateColumn(&col2)
	_ = s.columnRepo.CreateColumn(&col3)
	_ = s.columnRepo.CreateColumn(&col4)

	lblFeature := models.Label{Name: "Feature", Color: "#7F9CF5", WorkspaceID: ws.ID}
	lblRefactor := models.Label{Name: "Refactor", Color: "#B794F6", WorkspaceID: ws.ID}
	lblBug := models.Label{Name: "Bug", Color: "#F6685E", WorkspaceID: ws.ID}
	lblDocs := models.Label{Name: "Docs", Color: "#68D391", WorkspaceID: ws.ID}

	t1 := models.Task{
		Title:       "Migrate pagination to cursor-based model",
		Description: "Refactor list endpoints to use opaque cursor tokens for improved scaling.",
		ColumnID:    col3.ID,
		ProjectID:   p1.ID,
		Priority:    "urgent",
		Status:      "in_progress",
		Position:    0,
		DueDate:     &dueInTwoDays,
		Labels:      []models.Label{lblRefactor},
	}
	_ = s.taskRepo.CreateTask(&t1)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Implement cursor encoding", IsCompleted: true, Position: 0, TaskID: t1.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Update list endpoints", IsCompleted: true, Position: 1, TaskID: t1.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Update SDK helpers", IsCompleted: false, Position: 2, TaskID: t1.ID})

	t2 := models.Task{
		Title:       "Implement auth refresh token rotation",
		Description: "Add sliding expiration for session tokens.",
		ColumnID:    col1.ID,
		ProjectID:   p1.ID,
		Priority:    "high",
		Status:      "todo",
		Position:    0,
		DueDate:     &dueTomorrow,
		Labels:      []models.Label{lblFeature},
	}
	_ = s.taskRepo.CreateTask(&t2)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Design refresh token schema", IsCompleted: true, Position: 0, TaskID: t2.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Implement store & revocation", IsCompleted: false, Position: 1, TaskID: t2.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Unit tests", IsCompleted: false, Position: 2, TaskID: t2.ID})

	t3 := models.Task{
		Title:       "Add rate limiting to public endpoints",
		Description: "Enforce strict per-key rate limits with Redis token bucket.",
		ColumnID:    col1.ID,
		ProjectID:   p1.ID,
		Priority:    "urgent",
		Status:      "todo",
		Position:    1,
		DueDate:     &dueInTwoDays,
		Labels:      []models.Label{lblBug},
	}
	_ = s.taskRepo.CreateTask(&t3)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Redis rate limit middleware", IsCompleted: true, Position: 0, TaskID: t3.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Test limit response headers", IsCompleted: false, Position: 1, TaskID: t3.ID})

	t4 := models.Task{
		Title:       "Write OpenAPI 3.1 spec for v2",
		Description: "Complete API specification doc.",
		ColumnID:    col1.ID,
		ProjectID:   p1.ID,
		Priority:    "low",
		Status:      "todo",
		Position:    2,
		DueDate:     &dueNextWeek,
		Labels:      []models.Label{lblDocs},
	}
	_ = s.taskRepo.CreateTask(&t4)

	// 2. Project: Mobile App Redesign
	p2 := models.Project{
		Name:        "Mobile App Redesign",
		Description: "Complete visual refresh of the iOS and Android apps for the 3.0 release.",
		Color:       "#B794F6",
		Icon:        "📱",
		Status:      "active",
		IsPinned:    true,
		WorkspaceID: ws.ID,
		OwnerID:     ws.OwnerID,
	}
	_ = s.projectRepo.CreateProject(&p2)
	_ = s.columnRepo.CreateColumn(&models.Column{Name: "Todo", Position: 0, ProjectID: p2.ID, Color: "#6B7280"})
	_ = s.columnRepo.CreateColumn(&models.Column{Name: "In Progress", Position: 1, ProjectID: p2.ID, Color: "#3B82F6"})
	_ = s.columnRepo.CreateColumn(&models.Column{Name: "Done", Position: 2, ProjectID: p2.ID, Color: "#22C55E"})

	// 3. Project: Design System v2
	p3 := models.Project{
		Name:        "Design System v2",
		Description: "A unified, token-based component library across all product surfaces.",
		Color:       "#68D391",
		Icon:        "🎨",
		Status:      "active",
		IsPinned:    false,
		WorkspaceID: ws.ID,
		OwnerID:     ws.OwnerID,
	}
	_ = s.projectRepo.CreateProject(&p3)

	// 4. Project: Content Calendar
	p4 := models.Project{
		Name:        "Content Calendar",
		Description: "Plan and schedule editorial content for the next quarter.",
		Color:       "#F6AD8A",
		Icon:        "📅",
		Status:      "paused",
		IsPinned:    false,
		WorkspaceID: ws.ID,
		OwnerID:     ws.OwnerID,
	}
	_ = s.projectRepo.CreateProject(&p4)

	// 5. Project: Onboarding Flow
	p5 := models.Project{
		Name:        "Onboarding Flow",
		Description: "Streamline user activation from signup to first meaningful action.",
		Color:       "#F6A5C0",
		Icon:        "🚀",
		Status:      "active",
		IsPinned:    false,
		WorkspaceID: ws.ID,
		OwnerID:     ws.OwnerID,
	}
	_ = s.projectRepo.CreateProject(&p5)

	return []string{p1.Name, p2.Name, p3.Name, p4.Name, p5.Name}, nil
}
