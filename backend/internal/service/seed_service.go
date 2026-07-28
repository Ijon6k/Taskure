package service

import (
	"encoding/json"
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/repository"
	"gorm.io/datatypes"
)

type SeedService interface {
	SeedDemoData() ([]string, error)
}

type seedService struct {
	workspaceRepo repository.WorkspaceRepository
	projectRepo   repository.ProjectRepository
	columnRepo    repository.ColumnRepository
	taskRepo      repository.TaskRepository
	taskService   TaskService
}

func NewSeedService(
	workspaceRepo repository.WorkspaceRepository,
	projectRepo repository.ProjectRepository,
	columnRepo repository.ColumnRepository,
	taskRepo repository.TaskRepository,
	taskService TaskService,
) SeedService {
	return &seedService{
		workspaceRepo: workspaceRepo,
		projectRepo:   projectRepo,
		columnRepo:    columnRepo,
		taskRepo:      taskRepo,
		taskService:   taskService,
	}
}

func jsonRaw(v interface{}) datatypes.JSON {
	b, err := json.Marshal(v)
	if err != nil {
		return datatypes.JSON([]byte("{}"))
	}
	return datatypes.JSON(b)
}

func (s *seedService) SeedDemoData() ([]string, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}

	today := time.Now()
	tomorrow := time.Now().AddDate(0, 0, 1)
	nextWeek := time.Now().AddDate(0, 0, 7)

	// ============================================================
	// DEMO PROJECT 1: Welcome & Getting Started (Intro Project)
	// ============================================================
	p1Settings := map[string]interface{}{
		"target_goal":    "Master all Kanban features and set up your team workflow in 5 minutes.",
		"target_date":    today.AddDate(0, 3, 0).Format("2006-01-02"),
		"tags":           []string{"guide", "onboarding", "tips"},
		"resources": []map[string]string{
			{"title": "Keyboard Shortcuts Guide", "url": "https://github.com"},
			{"title": "Kanban Best Practices", "url": "https://kanbanize.com"},
		},
		"strategy_notes": "Use this intro project as a sandbox to test task creation, column reordering, tag filtering, and focus mode.",
	}

	p1 := models.Project{
		Name:         "Welcome & Getting Started",
		Description:  "Interactive guide to explore all Kanban features: columns, tasks, checklists, tags, shortcuts, and focus mode.",
		Color:        "#6366F1",
		Icon:         "🚀",
		Status:       "active",
		IsPinned:     true,
		FocusEnabled: true,
		WorkspaceID:  ws.ID,
		OwnerID:      ws.OwnerID,
		Settings:     jsonRaw(p1Settings),
	}
	_ = s.projectRepo.CreateProject(&p1)

	col1_1 := models.Column{Name: "Getting Started", Behavior: models.ColumnBehaviorActive, Position: 0, ProjectID: p1.ID, Color: "#6366F1"}
	col1_2 := models.Column{Name: "In Progress", Behavior: models.ColumnBehaviorActive, Position: 1, ProjectID: p1.ID, Color: "#3B82F6"}
	col1_3 := models.Column{Name: "Completed", Behavior: models.ColumnBehaviorCompleted, Position: 2, ProjectID: p1.ID, Color: "#22C55E"}
	_ = s.columnRepo.CreateColumn(&col1_1)
	_ = s.columnRepo.CreateColumn(&col1_2)
	_ = s.columnRepo.CreateColumn(&col1_3)

	// Task 1: Explore Board
	t1_1 := models.Task{
		Title:       "Explore the Kanban Board",
		Description: "Drag tasks between columns, click to open task details drawer, add subtask checklists, and assign tags.",
		ColumnID:    col1_1.ID,
		ProjectID:   p1.ID,
		Priority:    "high",
		Status:      "todo",
		Position:    0,
		Tags:        jsonRaw([]string{"guide", "interactive"}),
	}
	_ = s.taskRepo.CreateTask(&t1_1)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Try dragging this task to In Progress", IsCompleted: true, Position: 0, TaskID: t1_1.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Click this task to view drawer details", IsCompleted: true, Position: 1, TaskID: t1_1.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Add a new subtask checklist item", IsCompleted: false, Position: 2, TaskID: t1_1.ID})

	// Task 2: Keyboard Shortcuts
	t1_2 := models.Task{
		Title:       "Try Keyboard Shortcuts",
		Description: "Press 'N' for new project modal, Shift+'?' for shortcuts guide, and Esc to cancel or close dialogs.",
		ColumnID:    col1_1.ID,
		ProjectID:   p1.ID,
		Priority:    "medium",
		Status:      "todo",
		Position:    1,
		Tags:        jsonRaw([]string{"shortcuts", "tips"}),
	}
	_ = s.taskRepo.CreateTask(&t1_2)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Press 'N' to open New Project modal", IsCompleted: false, Position: 0, TaskID: t1_2.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Press '?' to open Keyboard Shortcuts guide", IsCompleted: false, Position: 1, TaskID: t1_2.ID})

	// Task 3: Today's Focus
	t1_3 := models.Task{
		Title:       "Review Today's Focus Task",
		Description: "Urgent tasks due today appear directly on your Home Dashboard Today's Focus card.",
		ColumnID:    col1_2.ID,
		ProjectID:   p1.ID,
		Priority:    "urgent",
		Status:      "in_progress",
		Position:    0,
		DueDate:     &today,
		Tags:        jsonRaw([]string{"focus", "urgent"}),
	}
	_ = s.taskRepo.CreateTask(&t1_3)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "View focus task on home dashboard", IsCompleted: true, Position: 0, TaskID: t1_3.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Complete focus task subitems", IsCompleted: false, Position: 1, TaskID: t1_3.ID})

	// Task 4: Custom Project
	t1_4 := models.Task{
		Title:       "Set up Your First Custom Project",
		Description: "Create a custom project with custom column colors, tag templates, and team member permissions.",
		ColumnID:    col1_3.ID,
		ProjectID:   p1.ID,
		Priority:    "medium",
		Status:      "done",
		Position:    0,
		Tags:        jsonRaw([]string{"setup"}),
	}
	_ = s.taskRepo.CreateTask(&t1_4)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Click + New Project in top bar", IsCompleted: true, Position: 0, TaskID: t1_4.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Choose custom project color & icon", IsCompleted: true, Position: 1, TaskID: t1_4.ID})

	// ============================================================
	// DEMO PROJECT 2: Product Roadmap 2026 (Generic Theme Project)
	// ============================================================
	p2Settings := map[string]interface{}{
		"target_goal":    "Ship core v2.0 features, 99.9% uptime, and sub-100ms response time.",
		"target_date":    today.AddDate(0, 6, 0).Format("2006-01-02"),
		"tags":           []string{"roadmap", "product", "q3-goals"},
		"resources": []map[string]string{
			{"title": "OpenAPI Spec Documentation", "url": "https://swagger.io"},
			{"title": "Figma Design System Tokens", "url": "https://figma.com"},
		},
		"strategy_notes": "Prioritize high-impact performance items, dark OLED theme, and token authentication security before release.",
	}

	p2 := models.Project{
		Name:         "Product Roadmap 2026",
		Description:  "Feature backlog, UI redesign, performance optimization, and release planning for Q3/Q4.",
		Color:        "#10B981",
		Icon:         "⚡",
		Status:       "active",
		IsPinned:     true,
		FocusEnabled: true,
		WorkspaceID:  ws.ID,
		OwnerID:      ws.OwnerID,
		Settings:     jsonRaw(p2Settings),
	}
	_ = s.projectRepo.CreateProject(&p2)

	col2_1 := models.Column{Name: "Backlog", Behavior: models.ColumnBehaviorActive, Position: 0, ProjectID: p2.ID, Color: "#6B7280"}
	col2_2 := models.Column{Name: "To Do", Behavior: models.ColumnBehaviorActive, Position: 1, ProjectID: p2.ID, Color: "#F59E0B"}
	col2_3 := models.Column{Name: "In Progress", Behavior: models.ColumnBehaviorActive, Position: 2, ProjectID: p2.ID, Color: "#3B82F6"}
	col2_4 := models.Column{Name: "Done", Behavior: models.ColumnBehaviorCompleted, Position: 3, ProjectID: p2.ID, Color: "#10B981"}
	_ = s.columnRepo.CreateColumn(&col2_1)
	_ = s.columnRepo.CreateColumn(&col2_2)
	_ = s.columnRepo.CreateColumn(&col2_3)
	_ = s.columnRepo.CreateColumn(&col2_4)

	// Task 1 (Backlog): OAuth 2.1
	t2_1 := models.Task{
		Title:       "OAuth 2.1 & Refresh Token Rotation",
		Description: "Implement secure refresh token sliding window and session revocation endpoint.",
		ColumnID:    col2_1.ID,
		ProjectID:   p2.ID,
		Priority:    "high",
		Status:      "todo",
		Position:    0,
		DueDate:     &nextWeek,
		Tags:        jsonRaw([]string{"backend", "security"}),
	}
	_ = s.taskRepo.CreateTask(&t2_1)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Design token revocation schema", IsCompleted: true, Position: 0, TaskID: t2_1.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Add refresh handler endpoint", IsCompleted: false, Position: 1, TaskID: t2_1.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Write integration test suite", IsCompleted: false, Position: 2, TaskID: t2_1.ID})

	// Task 2 (Backlog): Dark OLED
	t2_2 := models.Task{
		Title:       "Global Dark OLED & Theme Palette",
		Description: "Support OLED pitch black surface mode with high contrast slate typography tokens.",
		ColumnID:    col2_1.ID,
		ProjectID:   p2.ID,
		Priority:    "low",
		Status:      "todo",
		Position:    1,
		Tags:        jsonRaw([]string{"design", "ui"}),
	}
	_ = s.taskRepo.CreateTask(&t2_2)

	// Task 3 (To Do): Cursor Pagination
	t2_3 := models.Task{
		Title:       "Cursor-based Database Pagination",
		Description: "Replace offset pagination with opaque cursor tokens for scalable list queries.",
		ColumnID:    col2_2.ID,
		ProjectID:   p2.ID,
		Priority:    "urgent",
		Status:      "todo",
		Position:    0,
		DueDate:     &tomorrow,
		Tags:        jsonRaw([]string{"backend", "performance"}),
	}
	_ = s.taskRepo.CreateTask(&t2_3)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Encode base64 cursor token", IsCompleted: true, Position: 0, TaskID: t2_3.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Benchmark 100k records query", IsCompleted: false, Position: 1, TaskID: t2_3.ID})

	// Task 4 (In Progress): Board Drag & Drop
	t2_4 := models.Task{
		Title:       "Kanban Board Drag & Drop Performance",
		Description: "Optimize dnd-kit sensor delays and memoize column card renders for smooth 60fps dragging.",
		ColumnID:    col2_3.ID,
		ProjectID:   p2.ID,
		Priority:    "urgent",
		Status:      "in_progress",
		Position:    0,
		DueDate:     &today,
		Tags:        jsonRaw([]string{"frontend", "performance"}),
	}
	_ = s.taskRepo.CreateTask(&t2_4)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Memoize KanbanColumnInner props", IsCompleted: true, Position: 0, TaskID: t2_4.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Fix touch device drag sensor threshold", IsCompleted: true, Position: 1, TaskID: t2_4.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Verify 60fps card drag smooth animation", IsCompleted: false, Position: 2, TaskID: t2_4.ID})

	// Task 5 (Done): 6-Level Elevation
	t2_5 := models.Task{
		Title:       "6-Level Surface Elevation System",
		Description: "Implement CSS elevation variables --surface-l0 to --surface-l5 for layered UI hierarchy.",
		ColumnID:    col2_4.ID,
		ProjectID:   p2.ID,
		Priority:    "medium",
		Status:      "done",
		Position:    0,
		Tags:        jsonRaw([]string{"frontend", "design-system"}),
	}
	_ = s.taskRepo.CreateTask(&t2_5)
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Define CSS variables in globals.css", IsCompleted: true, Position: 0, TaskID: t2_5.ID})
	_ = s.taskRepo.AddChecklistItem(&models.ChecklistItem{Title: "Update cards, dropdowns, and modals", IsCompleted: true, Position: 1, TaskID: t2_5.ID})

	if s.taskService != nil {
		s.taskService.InvalidateFocusCache()
	}

	return []string{p1.Name, p2.Name}, nil
}
