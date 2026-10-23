package service

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/gorm"
)

// ToolExecutionService is the single entry point for AI-invoked tool calls.
// Each tool domain is implemented in its own file (tool_task.go, tool_project.go, …).
type ToolExecutionService interface {
	Execute(toolName string, params map[string]interface{}, projectID string) (interface{}, error)
}

type ToolExecutionRequest struct {
	Tool       string                 `json:"tool"`
	Parameters map[string]interface{} `json:"parameters"`
	ProjectID  string                 `json:"project_id"`
}

// toolExecutionService holds the shared dependencies used by every tool domain.
type toolExecutionService struct {
	db              *gorm.DB
	taskService     TaskService
	projectService  ProjectService
	columnService   ColumnService
	notebookService NotebookService
	memoryService   MemoryService
	journalService  JournalService
	aiService       AIService
	contextRepo     repository.ContextRepository
}

func NewToolExecutionService(
	db *gorm.DB,
	taskService TaskService,
	projectService ProjectService,
	columnService ColumnService,
	notebookService NotebookService,
	memoryService MemoryService,
	journalService JournalService,
	aiService AIService,
	contextRepo repository.ContextRepository,
) ToolExecutionService {
	return &toolExecutionService{
		db:              db,
		taskService:     taskService,
		projectService:  projectService,
		columnService:   columnService,
		notebookService: notebookService,
		memoryService:   memoryService,
		journalService:  journalService,
		aiService:       aiService,
		contextRepo:     contextRepo,
	}
}

// resolveProjectUUID converts a public nanoID (or UUID) into the internal UUID.
func (s *toolExecutionService) resolveProjectUUID(projectID string) (string, error) {
	if projectID == "" {
		return "", fmt.Errorf("project_id is required")
	}
	project, err := s.projectService.GetProject(projectID)
	if err != nil {
		return "", fmt.Errorf("project not found: %w", err)
	}
	return project.ID, nil
}

// Execute routes a tool name to its domain implementation.
func (s *toolExecutionService) Execute(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch {
	case strings.HasPrefix(toolName, "task_"):
		return s.executeTaskTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "project_"):
		return s.executeProjectTool(toolName, params)
	case strings.HasPrefix(toolName, "column_"):
		return s.executeColumnTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "notebook_"):
		return s.executeNotebookTool(toolName, params)
	case strings.HasPrefix(toolName, "journal_"):
		return s.executeJournalTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "memory_"):
		return s.executeMemoryTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "rag_"):
		return s.executeRagTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "plan_"):
		return s.executePlanTool(toolName, params, projectID)
	case toolName == "kanban_generate_plan":
		return s.executeGeneratePlanTool(params, projectID)
	case toolName == "index":
		return s.executeIndexTool(params)
	default:
		return nil, fmt.Errorf("unknown tool: %s", toolName)
	}
}

// ── shared helpers ───────────────────────────────────────────────────────────

func strParam(params map[string]interface{}, key string) string {
	if v, ok := params[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func numParam(params map[string]interface{}, key string) (float64, bool) {
	v, ok := params[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	default:
		return 0, false
	}
}

func jsonRawMessage(params map[string]interface{}, key string) json.RawMessage {
	if v, ok := params[key]; ok {
		data, err := json.Marshal(v)
		if err == nil {
			return data
		}
	}
	return json.RawMessage("[]")
}
