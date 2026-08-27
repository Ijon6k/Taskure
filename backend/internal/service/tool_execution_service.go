package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ToolExecutionService interface {
	Execute(toolName string, params map[string]interface{}, projectID string) (interface{}, error)
}

type ToolExecutionRequest struct {
	Tool       string                 `json:"tool"`
	Parameters map[string]interface{} `json:"parameters"`
	ProjectID  string                 `json:"project_id"`
}

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

func (s *toolExecutionService) Execute(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch {
	case strings.HasPrefix(toolName, "task."):
		return s.executeTaskTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "project."):
		return s.executeProjectTool(toolName, params)
	case strings.HasPrefix(toolName, "column."):
		return s.executeColumnTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "notebook."):
		return s.executeNotebookTool(toolName, params)
	case strings.HasPrefix(toolName, "journal."):
		return s.executeJournalTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "memory."):
		return s.executeMemoryTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "rag."):
		return s.executeRagTool(toolName, params, projectID)
	case strings.HasPrefix(toolName, "plan."):
		return s.executePlanTool(toolName, params, projectID)
	case toolName == "index":
		return s.executeIndexTool(params)
	default:
		return nil, fmt.Errorf("unknown tool: %s", toolName)
	}
}

// ── Task ────────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executeTaskTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch toolName {
	case "task.search":
		query, _ := params["query"].(string)
		return s.searchTasks(projectID, query)
	case "task.get":
		taskID := strParam(params, "task_id")
		if taskID == "" {
			return nil, fmt.Errorf("task.get requires task_id")
		}
		return s.taskService.GetTask(taskID)
	case "task.create":
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		input := CreateTaskInput{
			Title:       strParam(params, "title"),
			Description: strParam(params, "description"),
			ColumnID:    strParam(params, "column_id"),
			Priority:    strParam(params, "priority"),
		}
		if input.Title == "" {
			return nil, fmt.Errorf("task.create requires title")
		}
		if input.ColumnID == "" {
			// Default to the first column of the project.
			project, err := s.projectService.GetProjectBoard(projectUUID)
			if err != nil {
				return nil, err
			}
			if len(project.Columns) == 0 {
				return nil, fmt.Errorf("project has no columns; create a column first")
			}
			input.ColumnID = project.Columns[0].ID
		}
		task, err := s.taskService.CreateTask(projectUUID, input)
		if err != nil {
			return nil, err
		}
		return task, nil
	case "task.update":
		taskID := strParam(params, "task_id")
		if taskID == "" {
			return nil, fmt.Errorf("task.update requires task_id")
		}
		updates := map[string]interface{}{}
		if v, ok := params["title"]; ok && v != nil {
			updates["title"] = v
		}
		if v, ok := params["description"]; ok && v != nil {
			updates["description"] = v
		}
		if v, ok := params["priority"]; ok && v != nil {
			updates["priority"] = v
		}
		if len(updates) == 0 {
			return nil, fmt.Errorf("task.update requires at least one field to update")
		}
		return s.taskService.UpdateTask(taskID, updates)
	case "task.move":
		taskID := strParam(params, "task_id")
		targetColumnID := strParam(params, "target_column_id")
		if taskID == "" || targetColumnID == "" {
			return nil, fmt.Errorf("task.move requires task_id and target_column_id")
		}
		return s.taskService.MoveTask(taskID, MoveTaskInput{ColumnID: targetColumnID})
	case "task.delete":
		taskID := strParam(params, "task_id")
		if taskID == "" {
			return nil, fmt.Errorf("task.delete requires task_id")
		}
		return map[string]string{"status": "deleted"}, s.taskService.DeleteTask(taskID)
	default:
		return nil, fmt.Errorf("unknown task tool: %s", toolName)
	}
}

func (s *toolExecutionService) searchTasks(projectID string, query string) ([]interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	var tasks []models.Task
	tx := s.db.Where("project_id = ?", projectUUID)
	if query != "" {
		tx = tx.Where("title ILIKE ? OR description ILIKE ?", "%"+query+"%", "%"+query+"%")
	}
	err = tx.Order("position asc").Limit(20).Find(&tasks).Error
	if err != nil {
		return nil, err
	}

	result := make([]interface{}, len(tasks))
	for i := range tasks {
		result[i] = tasks[i]
	}
	return result, nil
}

// ── Project ─────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executeProjectTool(toolName string, params map[string]interface{}) (interface{}, error) {
	switch toolName {
	case "project.search":
		query, _ := params["query"].(string)
		return s.projectService.ListProjects("", query, false)
	case "project.get":
		projectID := strParam(params, "project_id")
		if projectID == "" {
			return nil, fmt.Errorf("project.get requires project_id")
		}
		return s.projectService.GetProjectOverview(projectID)
	case "project.get_board":
		projectID := strParam(params, "project_id")
		if projectID == "" {
			return nil, fmt.Errorf("project.get_board requires project_id")
		}
		return s.projectService.GetProjectBoard(projectID)
	case "project.update":
		projectID := strParam(params, "project_id")
		if projectID == "" {
			return nil, fmt.Errorf("project.update requires project_id")
		}
		input := &UpdateProjectInput{}
		if v, ok := params["name"]; ok {
			name := v.(string)
			input.Name = &name
		}
		if v, ok := params["description"]; ok {
			desc := v.(string)
			input.Description = &desc
		}
		return s.projectService.UpdateProject(projectID, input)
	default:
		return nil, fmt.Errorf("unknown project tool: %s", toolName)
	}
}

// ── Column ──────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executeColumnTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch toolName {
	case "column.search":
		query, _ := params["query"].(string)
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		project, err := s.projectService.GetProjectBoard(projectUUID)
		if err != nil {
			return nil, err
		}
		cols := project.Columns
		if query != "" {
			filtered := make([]models.Column, 0, len(cols))
			for _, c := range cols {
				if strings.Contains(strings.ToLower(c.Name), strings.ToLower(query)) {
					filtered = append(filtered, c)
				}
			}
			cols = filtered
		}
		return cols, nil
	case "column.get":
		columnID := strParam(params, "column_id")
		if columnID == "" {
			return nil, fmt.Errorf("column.get requires column_id")
		}
		return s.columnService.GetColumn(columnID)
	case "column.create":
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		name := strParam(params, "name")
		if name == "" {
			return nil, fmt.Errorf("column.create requires name")
		}
		return s.columnService.CreateColumn(projectUUID, CreateColumnInput{Name: name})
	case "column.update":
		columnID := strParam(params, "column_id")
		if columnID == "" {
			return nil, fmt.Errorf("column.update requires column_id")
		}
		updates := map[string]interface{}{}
		if v, ok := params["name"]; ok && v != nil {
			updates["name"] = v
		}
		if v, ok := params["position"]; ok && v != nil {
			updates["position"] = v
		}
		if len(updates) == 0 {
			return nil, fmt.Errorf("column.update requires a field to update")
		}
		return s.columnService.UpdateColumn(columnID, updates)
	case "column.delete":
		columnID := strParam(params, "column_id")
		if columnID == "" {
			return nil, fmt.Errorf("column.delete requires column_id")
		}
		return map[string]string{"status": "deleted"}, s.columnService.DeleteColumn(columnID)
	default:
		return nil, fmt.Errorf("unknown column tool: %s", toolName)
	}
}

// ── Notebook ────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executeNotebookTool(toolName string, params map[string]interface{}) (interface{}, error) {
	switch toolName {
	case "notebook.search":
		projectID := strParam(params, "project_id")
		query, _ := params["query"].(string)
		pages, err := s.notebookService.ListPages(projectID)
		if err != nil {
			return nil, err
		}
		if query != "" {
			filtered := make([]models.NotebookPage, 0, len(pages))
			for _, p := range pages {
				if strings.Contains(strings.ToLower(p.Title), strings.ToLower(query)) {
					filtered = append(filtered, p)
				}
			}
			pages = filtered
		}
		return pages, nil
	case "notebook.get":
		notebookID := strParam(params, "notebook_id")
		if notebookID == "" {
			return nil, fmt.Errorf("notebook.get requires notebook_id")
		}
		return s.notebookService.GetPage(notebookID)
	case "notebook.create":
		projectID := strParam(params, "project_id")
		title := strParam(params, "title")
		if projectID == "" || title == "" {
			return nil, fmt.Errorf("notebook.create requires project_id and title")
		}
		return s.notebookService.CreatePage(projectID, CreateNotebookPageInput{Title: title})
	case "notebook.update":
		notebookID := strParam(params, "notebook_id")
		if notebookID == "" {
			return nil, fmt.Errorf("notebook.update requires notebook_id")
		}
		input := UpdateNotebookPageInput{}
		if v, ok := params["title"]; ok {
			t := v.(string)
			input.Title = &t
		}
		if v, ok := params["content"]; ok {
			c := v.(string)
			input.Content = &c
		}
		return s.notebookService.UpdatePage(notebookID, input)
	default:
		return nil, fmt.Errorf("unknown notebook tool: %s", toolName)
	}
}

// ── Journal ─────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executeJournalTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	switch toolName {
	case "journal.get_recent":
		limit := 10
		if l, ok := numParam(params, "limit"); ok && l > 0 {
			limit = int(l)
		}
		return s.journalService.GetRecentEntries(projectUUID, limit)
	case "journal.get_synthesis":
		return s.journalService.GetSyntheses(projectUUID)
	case "journal.search":
		query, _ := params["query"].(string)
		limit := 30
		if l, ok := numParam(params, "limit"); ok && l > 0 {
			limit = int(l)
		}
		return s.journalService.SearchEntries(projectUUID, query, limit)
	case "journal.create_entry":
		eventType, _ := params["event_type"].(string)
		summary, _ := params["summary"].(string)
		meta := jsonRawMessage(params, "metadata")
		return s.journalService.CreateEntry(projectUUID, eventType, summary, meta)
	case "journal.create_synthesis":
		ps, _ := params["period_start"].(string)
		pe, _ := params["period_end"].(string)
		st, _ := params["synthesis_text"].(string)
		ms := jsonRawMessage(params, "key_milestones")
		periodStart, _ := time.Parse(time.RFC3339, ps)
		periodEnd, _ := time.Parse(time.RFC3339, pe)
		return s.journalService.CreateSynthesis(projectUUID, periodStart, periodEnd, st, ms)
	default:
		return nil, fmt.Errorf("unknown journal tool: %s", toolName)
	}
}

// ── Memory ──────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executeMemoryTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	switch toolName {
	case "memory.get":
		return s.memoryService.GetProjectMemory(projectUUID)
	case "memory.update":
		var updates map[string]interface{}
		if raw, ok := params["updates"]; ok {
			if m, ok := raw.(map[string]interface{}); ok {
				updates = m
			}
		}
		if len(updates) == 0 {
			return nil, fmt.Errorf("memory.update requires an 'updates' object")
		}
		summary, _ := updates["summary"].(string)
		goals := jsonRawMessage(updates, "goals")
		decisions := jsonRawMessage(updates, "decisions")
		blockers := jsonRawMessage(updates, "blockers")
		pinned := jsonRawMessage(updates, "pinned_fields")
		return s.memoryService.UpsertMemory(projectUUID, summary, goals, decisions, blockers, pinned)
	case "memory.history":
		limit := 10
		if l, ok := numParam(params, "limit"); ok && l > 0 {
			limit = int(l)
		}
		return s.memoryService.GetHistory(projectUUID, limit)
	case "memory.save_history":
		snapshot := jsonRawMessage(params, "snapshot")
		trigger, _ := params["trigger_event"].(string)
		return s.memoryService.SaveHistory(projectUUID, snapshot, trigger)
	case "memory.count_events":
		var count int64
		if err := s.db.Model(&models.OutboxEvent{}).
			Where("processed = ?", false).
			Count(&count).Error; err != nil {
			return nil, err
		}
		return map[string]interface{}{"count": count}, nil
	default:
		return nil, fmt.Errorf("unknown memory tool: %s", toolName)
	}
}

// ── RAG ─────────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executeRagTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch toolName {
	case "rag.search":
		query, _ := params["query"].(string)
		if query == "" {
			return nil, fmt.Errorf("rag.search requires query")
		}
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		// Embedding is produced by the AI service (provider SDK); Go owns the
		// vector-store access — no circular proxy, no direct DB from Python.
		embedding, err := s.aiService.ProxyEmbed(query)
		if err != nil {
			return nil, fmt.Errorf("embedding failed: %w", err)
		}
		embJSON, err := json.Marshal(embedding)
		if err != nil {
			return nil, err
		}
		topK := 5
		if k, ok := numParam(params, "top_k"); ok && k > 0 {
			topK = int(k)
		}
		chunks, err := s.contextRepo.HybridSearch(projectUUID, query, datatypes.JSON(embJSON), topK, 0.7)
		if err != nil {
			return nil, err
		}
		results := make([]map[string]interface{}, 0, len(chunks))
		for _, ch := range chunks {
			results = append(results, map[string]interface{}{
				"id":           ch.ID,
				"content":      ch.Content,
				"context_type": ch.ContextType,
				"chunk_index":  ch.ChunkIndex,
			})
		}
		return map[string]interface{}{"results": results, "total": len(results)}, nil
	case "rag.get_chunk":
		chunkID := strParam(params, "chunk_id")
		if chunkID == "" {
			return nil, fmt.Errorf("rag.get_chunk requires chunk_id")
		}
		chunk, err := s.contextRepo.FindByID(chunkID)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"id":           chunk.ID,
			"content":      chunk.Content,
			"context_type": chunk.ContextType,
			"chunk_index":  chunk.ChunkIndex,
			"metadata":     chunk.Metadata,
		}, nil
	default:
		return nil, fmt.Errorf("unknown rag tool: %s", toolName)
	}
}

// ── Plan ────────────────────────────────────────────────────────────────────

func (s *toolExecutionService) executePlanTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	switch toolName {
	case "plan.get_cache":
		key := strParam(params, "cache_key")
		if key == "" {
			key = "default"
		}
		var cache models.PlanCache
		err := s.db.Where("project_id = ? AND cache_key = ? AND expires_at > ?", projectUUID, key, time.Now()).
			First(&cache).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, fmt.Errorf("no cached plan found for this project")
			}
			return nil, err
		}
		return cache, nil
	case "plan.save_cache":
		key := strParam(params, "cache_key")
		if key == "" {
			key = "default"
		}
		result := jsonRawMessage(params, "plan")
		now := time.Now()
		cache := models.PlanCache{
			CacheKey:         key,
			ProjectID:        projectUUID,
			RequestHash:      "tool",
			ProjectStateHash: "tool",
			Result:           datatypes.JSON(result),
			ExpiresAt:        now.Add(24 * time.Hour),
		}
		// Upsert: delete any existing cache for this project+key, then insert.
		if err := s.db.Where("project_id = ? AND cache_key = ?", projectUUID, key).
			Delete(&models.PlanCache{}).Error; err != nil {
			return nil, err
		}
		if err := s.db.Create(&cache).Error; err != nil {
			return nil, err
		}
		return cache, nil
	default:
		return nil, fmt.Errorf("unknown plan tool: %s", toolName)
	}
}

// ── Index (worker) ──────────────────────────────────────────────────────────

func (s *toolExecutionService) executeIndexTool(params map[string]interface{}) (interface{}, error) {
	projectID, _ := params["project_id"].(string)
	if projectID == "" {
		return nil, fmt.Errorf("index requires project_id")
	}
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}

	sourceType, _ := params["source_type"].(string)
	sourceID, _ := params["source_id"].(string)
	rawChunks, ok := params["chunks"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("index requires a 'chunks' array")
	}

	chunks := make([]models.ProjectContext, 0, len(rawChunks))
	for i, raw := range rawChunks {
		chunk, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		content, _ := chunk["content"].(string)
		embedding, _ := json.Marshal(chunk["embedding"])
		metadata, _ := json.Marshal(chunk["metadata"])
		chunks = append(chunks, models.ProjectContext{
			ProjectID:   projectUUID,
			Content:     content,
			ContextType: sourceType,
			ChunkIndex:  i,
			TotalChunks: len(rawChunks),
			Embedding:   datatypes.JSON(embedding),
			Metadata:    datatypes.JSON(metadata),
		})
	}
	if len(chunks) == 0 {
		return map[string]interface{}{"indexed": 0}, nil
	}

	if err := s.contextRepo.BatchCreate(chunks); err != nil {
		return nil, err
	}
	return map[string]interface{}{"indexed": len(chunks), "source_id": sourceID}, nil
}

// ── helpers ─────────────────────────────────────────────────────────────────

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
