package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type AIHandler struct {
	aiService       service.AIService
	convService     service.ConversationService
	toolService     service.ToolExecutionService
	memoryService   service.MemoryService
	journalService  service.JournalService
	projectService  service.ProjectService
	taskService     service.TaskService
	providerService service.ProviderService
	contextRepo     repository.ContextRepository
	outboxRepo      repository.OutboxRepository
}

func NewAIHandler(
	aiService service.AIService,
	convService service.ConversationService,
	toolService service.ToolExecutionService,
	memoryService service.MemoryService,
	journalService service.JournalService,
	projectService service.ProjectService,
	taskService service.TaskService,
	providerService service.ProviderService,
	contextRepo repository.ContextRepository,
	outboxRepo repository.OutboxRepository,
) *AIHandler {
	return &AIHandler{
		aiService:       aiService,
		convService:     convService,
		toolService:     toolService,
		memoryService:   memoryService,
		journalService:  journalService,
		projectService:  projectService,
		taskService:     taskService,
		providerService: providerService,
		contextRepo:     contextRepo,
		outboxRepo:      outboxRepo,
	}
}

func (h *AIHandler) Chat(c *gin.Context) {
	var req struct {
		Messages   []service.ChatMessage `json:"messages" binding:"required"`
		Mode       string                `json:"mode"`
		ProjectID  string                `json:"project_id" binding:"required"`
		ProviderID string                `json:"provider_id"`
		Title      string                `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}
	if req.Mode == "" {
		req.Mode = "thinking"
	}

	providerConfig := map[string]interface{}{}
	var fullProvider *service.DecryptedProvider
	if req.ProviderID != "" {
		if p, err := h.providerService.GetDecryptedFull(req.ProviderID); err == nil {
			fullProvider = p
		}
	} else {
		// No explicit provider → fall back to the default provider so the chat
		// works out-of-the-box without requiring the user to select a model.
		if p, err := h.providerService.GetDefaultFull(); err == nil {
			fullProvider = p
		}
	}

	if fullProvider != nil {
		providerConfig["api_key"] = fullProvider.APIKey
		providerConfig["model"] = fullProvider.Model
		providerConfig["provider"] = service.NormalizeProviderName(fullProvider.Provider)
		if fullProvider.Endpoint != "" {
			providerConfig["endpoint"] = fullProvider.Endpoint
		}
		if len(fullProvider.Config) > 0 {
			var adv map[string]interface{}
			if err := json.Unmarshal(fullProvider.Config, &adv); err == nil {
				for k, v := range adv {
					providerConfig[k] = v
				}
			}
		}
	}

	resp, err := h.aiService.ProxyChat(req.Messages, req.Mode, req.ProjectID, providerConfig)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		response.Error(c, resp.StatusCode, string(body))
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	c.Stream(func(w io.Writer) bool {
		buf := make([]byte, 1024)
		n, err := resp.Body.Read(buf)
		if n > 0 {
			w.Write(buf[:n])
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
		return err == nil
	})
}

func (h *AIHandler) GetContextBudget(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		response.BadRequest(c, nil)
		return
	}

	result, err := h.aiService.GetContextBudget(projectID)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, result)
}

func (h *AIHandler) GetProjectMemory(c *gin.Context) {
	project, err := h.projectService.GetProject(c.Param("id"))
	if err != nil {
		response.OK(c, map[string]interface{}{})
		return
	}
	memory, err := h.memoryService.GetProjectMemory(project.ID)
	if err != nil {
		response.OK(c, map[string]interface{}{})
		return
	}
	response.OK(c, memory)
}

func (h *AIHandler) GetProjectJournal(c *gin.Context) {
	project, err := h.projectService.GetProject(c.Param("id"))
	if err != nil {
		response.OK(c, []interface{}{})
		return
	}
	limit := 10
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	entries, err := h.journalService.GetRecentEntries(project.ID, limit)
	if err != nil {
		response.OK(c, []interface{}{})
		return
	}
	if entries == nil {
		entries = []models.JournalEntry{}
	}
	response.OK(c, entries)
}

func (h *AIHandler) GetProjectTasks(c *gin.Context) {
	project, err := h.projectService.GetProjectBoard(c.Param("id"))
	if err != nil {
		response.OK(c, []interface{}{})
		return
	}
	tasks := []models.Task{}
	for _, col := range project.Columns {
		tasks = append(tasks, col.Tasks...)
	}
	response.OK(c, tasks)
}

func (h *AIHandler) GetProjectColumns(c *gin.Context) {
	project, err := h.projectService.GetProjectBoard(c.Param("id"))
	if err != nil {
		response.OK(c, []interface{}{})
		return
	}
	cols := project.Columns
	if cols == nil {
		cols = []models.Column{}
	}
	response.OK(c, cols)
}

func (h *AIHandler) GetProjectDiscussions(c *gin.Context) {
	// Discussions are not modeled in the backend yet; return an empty list so
	// the AI orchestrator can degrade gracefully instead of erroring.
	response.OK(c, []interface{}{})
}

func (h *AIHandler) GetAIContext(c *gin.Context) {
	project, err := h.projectService.GetProject(c.Param("id"))
	if err != nil {
		response.OK(c, map[string]interface{}{})
		return
	}
	result := map[string]interface{}{}

	memory, err := h.memoryService.GetProjectMemory(project.ID)
	if err == nil && memory != nil {
		result["memory"] = memory
	}

	entries, err := h.journalService.GetRecentEntries(project.ID, 10)
	if err == nil && len(entries) > 0 {
		result["journal"] = entries
	}

	if project != nil {
		result["project"] = project
	}

	response.OK(c, result)
}

func (h *AIHandler) ListPendingApprovals(c *gin.Context) {
	response.OK(c, []interface{}{})
}

func (h *AIHandler) ApproveAction(c *gin.Context) {
	id := c.Param("id")
	response.OK(c, map[string]string{"status": "approved", "id": id})
}

func (h *AIHandler) RejectAction(c *gin.Context) {
	id := c.Param("id")
	response.OK(c, map[string]string{"status": "rejected", "id": id})
}

type assembleContextRequest struct {
	ProjectID string `json:"project_id" binding:"required"`
	Query     string `json:"query"`
}

func (h *AIHandler) AssembleContext(c *gin.Context) {
	var req assembleContextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	project, err := h.projectService.GetProject(req.ProjectID)
	if err != nil {
		response.BadRequest(c, fmt.Errorf("project not found: %w", err))
		return
	}

	result := map[string]interface{}{}

	memory, err := h.memoryService.GetProjectMemory(project.ID)
	if err == nil && memory != nil {
		result["memory"] = memory
	}

	entries, err := h.journalService.GetRecentEntries(project.ID, 10)
	if err == nil && len(entries) > 0 {
		result["journal"] = entries
	}

	result["project"] = project

	if req.Query != "" {
		ragResp, err := h.aiService.ProxySearch(req.Query, project.ID)
		if err == nil {
			defer ragResp.Body.Close()
			var ragResult interface{}
			json.NewDecoder(ragResp.Body).Decode(&ragResult)
			result["rag_results"] = ragResult
		}
	}

	response.OK(c, result)
}

type indexChunk struct {
	Content   string         `json:"content"`
	Embedding datatypes.JSON `json:"embedding"`
	Metadata  datatypes.JSON `json:"metadata"`
}

type indexRequest struct {
	ProjectID string       `json:"project_id" binding:"required"`
	Chunks    []indexChunk `json:"chunks" binding:"required"`
}

func (h *AIHandler) Index(c *gin.Context) {
	var req indexRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	// Resolve public nanoID → internal project UUID before persisting chunks.
	project, err := h.projectService.GetProject(req.ProjectID)
	if err != nil {
		response.BadRequest(c, fmt.Errorf("project not found: %w", err))
		return
	}

	chunks := make([]models.ProjectContext, len(req.Chunks))
	for i, ch := range req.Chunks {
		chunks[i] = models.ProjectContext{
			ProjectID:   project.ID,
			Content:     ch.Content,
			ContextType: "indexed",
			ChunkIndex:  i,
			TotalChunks: len(req.Chunks),
			Embedding:   ch.Embedding,
			Metadata:    ch.Metadata,
		}
	}

	if err := h.contextRepo.BatchCreate(chunks); err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Created(c, map[string]interface{}{
		"indexed": len(chunks),
	})
}

// SearchRAG runs a hybrid vector+FTS search. The query embedding is produced by
// the AI service (provider SDK); Go owns the vector-store access.
func (h *AIHandler) SearchRAG(c *gin.Context) {
	var req struct {
		ProjectID string         `json:"project_id" binding:"required"`
		Query     string         `json:"query"`
		Embedding datatypes.JSON `json:"embedding" binding:"required"`
		TopK      int            `json:"top_k"`
		Threshold float64        `json:"similarity_threshold"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	project, err := h.projectService.GetProject(req.ProjectID)
	if err != nil {
		response.BadRequest(c, fmt.Errorf("project not found: %w", err))
		return
	}

	chunks, err := h.contextRepo.HybridSearch(project.ID, req.Query, req.Embedding, req.TopK, req.Threshold)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	results := make([]map[string]interface{}, 0, len(chunks))
	for _, ch := range chunks {
		results = append(results, map[string]interface{}{
			"id":           ch.ID,
			"content":      ch.Content,
			"context_type": ch.ContextType,
			"chunk_index":  ch.ChunkIndex,
			"similarity":   ch.Embedding, // fusion score is computed in SQL; keep payload simple
		})
	}

	response.OK(c, map[string]interface{}{"results": results, "total": len(results)})
}

// PollOutbox returns unprocessed outbox events for the AI workers to consume.
func (h *AIHandler) PollOutbox(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	events, err := h.outboxRepo.ListUnprocessed(limit)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}
	if events == nil {
		events = []models.OutboxEvent{}
	}
	response.OK(c, events)
}

// AckOutbox marks an outbox event processed (or records a failure for retry).
func (h *AIHandler) AckOutbox(c *gin.Context) {
	var req struct {
		Success bool   `json:"success"`
		Error   string `json:"error"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	id := c.Param("id")
	if req.Success {
		if err := h.outboxRepo.MarkProcessed(id); err != nil {
			response.InternalServerError(c, err)
			return
		}
	} else {
		if err := h.outboxRepo.IncrementRetry(id, req.Error); err != nil {
			response.InternalServerError(c, err)
			return
		}
	}

	response.Message(c, "ok")
}
