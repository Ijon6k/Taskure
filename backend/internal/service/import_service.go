package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/datatypes"
)

const (
	maxImportColumns        = 100
	maxImportTasks          = 2000
	maxImportChecklistItems = 5000
)

// Shared enum whitelists (see task_service.go / project_service.go) — invalid
// values fall back to defaults, never rejected, so imports tolerate any input.
// ImportChecklistInput is a single checklist item inside an import payload.
type ImportChecklistInput struct {
	Title       string `json:"title" binding:"required"`
	IsCompleted bool   `json:"is_completed"`
}

// ImportTaskInput is a single task inside an import payload. Only Title is
// required; everything else is optional and tolerated like the client-side
// parser (invalid enum values fall back to defaults, never rejected).
type ImportTaskInput struct {
	Title       string                 `json:"title" binding:"required"`
	Description string                 `json:"description"`
	Priority    string                 `json:"priority"`
	DueDate     string                 `json:"due_date"`
	Tags        []string               `json:"tags"`
	Checklist   []ImportChecklistInput `json:"checklist"`
}

type ImportColumnInput struct {
	Name  string            `json:"name" binding:"required"`
	Color string            `json:"color"`
	Tasks []ImportTaskInput `json:"tasks"`
}

type ImportBoardInput struct {
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Color       string              `json:"color"`
	Icon        string              `json:"icon"`
	Status      string              `json:"status"`
	Columns     []ImportColumnInput `json:"columns"`
}

type ImportCounts struct {
	ColumnsAdded        int `json:"columns_added"`
	ColumnsRemoved      int `json:"columns_removed"`
	TasksAdded          int `json:"tasks_added"`
	TasksRemoved        int `json:"tasks_removed"`
	ChecklistItemsAdded int `json:"checklist_items_added"`
}

type ImportResult struct {
	Counts  ImportCounts
	Project *models.Project
}

type ImportService interface {
	ImportProject(input ImportBoardInput) (*ImportResult, error)
	ReplaceBoard(projectIDOrPublicID string, input ImportBoardInput) (*ImportCounts, error)
}

type importService struct {
	workspaceRepo repository.WorkspaceRepository
	projectRepo   repository.ProjectRepository
	importRepo    repository.ImportRepository
}

func NewImportService(
	workspaceRepo repository.WorkspaceRepository,
	projectRepo repository.ProjectRepository,
	importRepo repository.ImportRepository,
) ImportService {
	return &importService{
		workspaceRepo: workspaceRepo,
		projectRepo:   projectRepo,
		importRepo:    importRepo,
	}
}

func normalizeImportKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func importPriority(value string) string {
	priority := strings.ToLower(strings.TrimSpace(value))
	if !validTaskPriorities[priority] {
		return "none"
	}
	return priority
}

func importDueDate(value string) *time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	// RFC3339 is canonical; tolerate date-only and tz-less datetime shorthands
	// the AI template advertises. Missing zones parse as UTC.
	for _, layout := range []string{time.RFC3339, "2006-01-02", "2006-01-02T15:04:05", "2006-01-02 15:04:05"} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return &parsed
		}
	}
	return nil
}

func importTags(tags []string) datatypes.JSON {
	clean := make([]string, 0, len(tags))
	for _, tag := range tags {
		if tag = strings.TrimSpace(tag); tag != "" {
			clean = append(clean, tag)
		}
	}
	if len(clean) == 0 {
		return nil
	}
	jsonBytes, err := json.Marshal(clean)
	if err != nil {
		return nil
	}
	return datatypes.JSON(jsonBytes)
}

// ErrImportValidation marks payload validation failures so handlers can answer
// 400 instead of 500.
var ErrImportValidation = errors.New("invalid import payload")

func importValidationError(format string, args ...interface{}) error {
	return fmt.Errorf("%w: %s", ErrImportValidation, fmt.Sprintf(format, args...))
}

// buildBoardTree validates the input and maps it onto the repository tree.
// Mirrors the client-side parser: duplicate column/task names are rejected,
// invalid values fall back to defaults, and size limits protect the server.
func (s *importService) buildBoardTree(input ImportBoardInput) (*repository.ImportBoardData, error) {
	if len(input.Columns) > maxImportColumns {
		return nil, importValidationError("too many columns (max %d)", maxImportColumns)
	}

	totalTasks := 0
	totalChecklist := 0
	seenColumns := make(map[string]bool, len(input.Columns))
	columns := make([]repository.ImportColumnData, 0, len(input.Columns))

	for ci, columnIn := range input.Columns {
		columnName := strings.TrimSpace(columnIn.Name)
		if columnName == "" {
			return nil, importValidationError("column %d has no name", ci)
		}
		key := normalizeImportKey(columnName)
		if seenColumns[key] {
			return nil, importValidationError("duplicate column name %q in import payload", columnName)
		}
		seenColumns[key] = true

		totalTasks += len(columnIn.Tasks)
		if totalTasks > maxImportTasks {
			return nil, importValidationError("too many tasks (max %d)", maxImportTasks)
		}

		tasks := make([]repository.ImportTaskData, 0, len(columnIn.Tasks))
		seenTaskTitles := make(map[string]bool, len(columnIn.Tasks))
		for ti, taskIn := range columnIn.Tasks {
			taskTitle := strings.TrimSpace(taskIn.Title)
			if taskTitle == "" {
				return nil, importValidationError("column %q has a task with no title", columnName)
			}
			titleKey := normalizeImportKey(taskTitle)
			if seenTaskTitles[titleKey] {
				return nil, importValidationError("duplicate task title %q in column %q", taskTitle, columnName)
			}
			seenTaskTitles[titleKey] = true

			totalChecklist += len(taskIn.Checklist)
			if totalChecklist > maxImportChecklistItems {
				return nil, importValidationError("too many checklist items (max %d)", maxImportChecklistItems)
			}

			checklist := make([]models.ChecklistItem, 0, len(taskIn.Checklist))
			for pos, itemIn := range taskIn.Checklist {
				itemTitle := strings.TrimSpace(itemIn.Title)
				if itemTitle == "" {
					return nil, importValidationError("task %q has a checklist item with no title", taskTitle)
				}
				checklist = append(checklist, models.ChecklistItem{
					Title:       itemTitle,
					IsCompleted: itemIn.IsCompleted,
					Position:    pos,
				})
			}

			task := models.Task{
				Title:       taskTitle,
				Description: taskIn.Description,
				Priority:    importPriority(taskIn.Priority),
				Status:      "todo",
				Position:    ti,
				DueDate:     importDueDate(taskIn.DueDate),
				Tags:        importTags(taskIn.Tags),
			}
			tasks = append(tasks, repository.ImportTaskData{Task: task, Checklist: checklist})
		}

		columns = append(columns, repository.ImportColumnData{
			Column: models.Column{
				Name:     columnName,
				Color:    strings.TrimSpace(columnIn.Color),
				Behavior: models.ColumnBehaviorActive,
				Position: ci,
			},
			Tasks: tasks,
		})
	}

	return &repository.ImportBoardData{Columns: columns}, nil
}

func countBoardTree(tree *repository.ImportBoardData) ImportCounts {
	var counts ImportCounts
	for _, column := range tree.Columns {
		counts.ColumnsAdded++
		for _, task := range column.Tasks {
			counts.TasksAdded++
			counts.ChecklistItemsAdded += len(task.Checklist)
		}
	}
	return counts
}

func (s *importService) ImportProject(input ImportBoardInput) (*ImportResult, error) {
	ws, err := s.workspaceRepo.EnsureUserAndWorkspace()
	if err != nil {
		return nil, err
	}

	tree, err := s.buildBoardTree(input)
	if err != nil {
		return nil, err
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		name = "Imported Board"
	}
	status := strings.TrimSpace(input.Status)
	if !validProjectStatuses[status] {
		status = "active"
	}
	color := strings.TrimSpace(input.Color)
	if color == "" {
		color = "#7F9CF5"
	}
	icon := strings.TrimSpace(input.Icon)
	if icon == "" {
		icon = "📌"
	}

	tree.Project = models.Project{
		Name:         name,
		Description:  input.Description,
		Color:        color,
		Icon:         icon,
		Status:       status,
		WorkspaceID:  ws.ID,
		OwnerID:      ws.OwnerID,
		FocusEnabled: true,
	}

	if err := s.importRepo.CreateProjectBoard(tree); err != nil {
		return nil, err
	}

	// Light payload suffices: the caller navigates by id/name and the heavy
	// board is fetched separately.
	project, err := s.projectRepo.FindProjectLight(tree.Project.ID)
	if err != nil {
		return nil, err
	}

	return &ImportResult{Counts: countBoardTree(tree), Project: project}, nil
}

func (s *importService) ReplaceBoard(projectIDOrPublicID string, input ImportBoardInput) (*ImportCounts, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	tree, err := s.buildBoardTree(input)
	if err != nil {
		return nil, err
	}

	// A replace with no columns would wipe the whole board; require at least
	// one column so an accidental empty/{} payload cannot be destructive.
	if len(tree.Columns) == 0 {
		return nil, importValidationError("board requires at least one column")
	}

	existingColumns := project.Columns
	existingByName := make(map[string]models.Column, len(existingColumns))
	for _, column := range existingColumns {
		existingByName[normalizeImportKey(column.Name)] = column
	}

	parsedNames := make(map[string]bool, len(tree.Columns))
	for _, column := range tree.Columns {
		parsedNames[normalizeImportKey(column.Column.Name)] = true
	}

	data := &repository.ReplaceBoardData{
		ColumnPositions: make(map[string]int),
		TaskPositions:   make(map[string]int),
	}
	counts := &ImportCounts{}

	// Sync each parsed column against its title-matched existing column:
	// kept tasks keep their rows (content, checklist, attachments survive),
	// absent titles are deleted, missing titles are created, and everything is
	// repositioned to match the JSON order.
	for ci, parsedColumn := range tree.Columns {
		key := normalizeImportKey(parsedColumn.Column.Name)
		existing, found := existingByName[key]

		if !found {
			parsedColumn.Column.Position = ci
			data.NewColumns = append(data.NewColumns, parsedColumn)
			counts.ColumnsAdded++
			for _, task := range parsedColumn.Tasks {
				counts.TasksAdded++
				counts.ChecklistItemsAdded += len(task.Checklist)
			}
			continue
		}

		data.ColumnPositions[existing.ID] = ci

		existingByTitle := make(map[string]models.Task, len(existing.Tasks))
		for _, task := range existing.Tasks {
			existingByTitle[normalizeImportKey(task.Title)] = task
		}

		parsedTitles := make(map[string]bool, len(parsedColumn.Tasks))
		for _, task := range parsedColumn.Tasks {
			parsedTitles[normalizeImportKey(task.Task.Title)] = true
		}

		for _, task := range existing.Tasks {
			if !parsedTitles[normalizeImportKey(task.Title)] {
				data.DeleteTaskIDs = append(data.DeleteTaskIDs, task.ID)
				counts.TasksRemoved++
			}
		}

		for pi, parsedTask := range parsedColumn.Tasks {
			titleKey := normalizeImportKey(parsedTask.Task.Title)
			if kept, ok := existingByTitle[titleKey]; ok {
				// Reposition an existing kept task to its JSON index.
				data.TaskPositions[kept.ID] = pi
				continue
			}
			// New task for an existing column: create with position pre-set.
			parsedTask.Task.ColumnID = existing.ID
			parsedTask.Task.Position = pi
			data.NewTasks = append(data.NewTasks, parsedTask)
			counts.TasksAdded++
			counts.ChecklistItemsAdded += len(parsedTask.Checklist)
		}
	}

	// Columns absent from the JSON are deleted with their tasks, explicitly
	// first (soft-delete does not cascade).
	for _, existing := range existingColumns {
		if parsedNames[normalizeImportKey(existing.Name)] {
			continue
		}
		data.DeleteColumnIDs = append(data.DeleteColumnIDs, existing.ID)
		for _, task := range existing.Tasks {
			data.DeleteTaskIDs = append(data.DeleteTaskIDs, task.ID)
			counts.TasksRemoved++
		}
		counts.ColumnsRemoved++
	}

	if err := s.importRepo.ReplaceBoard(project.ID, data); err != nil {
		return nil, err
	}

	return counts, nil
}
