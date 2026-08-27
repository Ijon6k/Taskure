package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/middleware"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/gin-gonic/gin"
)

type Container struct {
	WorkspaceHandler    *WorkspaceHandler
	ProjectHandler      *ProjectHandler
	ColumnHandler       *ColumnHandler
	TaskHandler         *TaskHandler
	ChecklistHandler    *ChecklistHandler
	FocusHandler        *FocusHandler
	ImportHandler       *ImportHandler
	SeedHandler         *SeedHandler
	StorageHandler      *StorageHandler
	NotebookHandler     *NotebookHandler
	ProviderHandler     *ProviderHandler
	AIHandler           *AIHandler
	ConversationHandler *ConversationHandler
	ToolHandler         *ToolHandler
}

// NewContainer bundles all services and storage into the handler container used by route registration.
func NewContainer(
	workspaceService service.WorkspaceService,
	projectService service.ProjectService,
	columnService service.ColumnService,
	taskService service.TaskService,
	importService service.ImportService,
	seedService service.SeedService,
	storageSvc storage.StorageService,
	notebookService service.NotebookService,
	providerService service.ProviderService,
	aiService service.AIService,
	conversationService service.ConversationService,
	toolService service.ToolExecutionService,
	memoryService service.MemoryService,
	journalService service.JournalService,
	contextRepo repository.ContextRepository,
	outboxRepo repository.OutboxRepository,
) *Container {
	return &Container{
		WorkspaceHandler:    NewWorkspaceHandler(workspaceService),
		ProjectHandler:      NewProjectHandler(projectService),
		ColumnHandler:       NewColumnHandler(columnService),
		TaskHandler:         NewTaskHandler(taskService),
		ChecklistHandler:    NewChecklistHandler(taskService),
		FocusHandler:        NewFocusHandler(taskService),
		ImportHandler:       NewImportHandler(importService),
		SeedHandler:         NewSeedHandler(seedService),
		StorageHandler:      NewStorageHandler(storageSvc),
		NotebookHandler:     NewNotebookHandler(notebookService),
		ProviderHandler:     NewProviderHandler(providerService),
		AIHandler:           NewAIHandler(aiService, conversationService, toolService, memoryService, journalService, projectService, taskService, providerService, contextRepo, outboxRepo),
		ConversationHandler: NewConversationHandler(conversationService),
		ToolHandler:         NewToolHandler(toolService),
	}
}

// RegisterRoutes registers all /api endpoints onto the Gin RouterGroup.
func (c *Container) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/storage/*filepath", c.StorageHandler.ServeStorageFile)

	workspaces := r.Group("/workspaces")
	{
		workspaces.GET("/default", c.WorkspaceHandler.GetDefaultWorkspace)
		workspaces.PATCH("/default", c.WorkspaceHandler.UpdateDefaultWorkspace)
	}

	projects := r.Group("/projects")
	{
		projects.GET("", c.ProjectHandler.ListProjects)
		projects.GET("/summary", c.ProjectHandler.ListProjectsSummary)
		projects.POST("", c.ProjectHandler.CreateProject)
		projects.GET("/:id", c.ProjectHandler.GetProject)
		projects.GET("/:id/board", c.ProjectHandler.GetProjectBoard)
		projects.GET("/:id/assets", c.ProjectHandler.ListProjectAssets)
		projects.GET("/:id/overview", c.ProjectHandler.GetProjectOverview)
		projects.PATCH("/:id", c.ProjectHandler.UpdateProject)
		projects.DELETE("/:id", c.ProjectHandler.DeleteProject)

		// Column & Task creation scoped under project
		projects.POST("/:id/columns", c.ColumnHandler.CreateColumn)
		projects.POST("/:id/tasks", c.TaskHandler.CreateTask)
		projects.GET("/:id/suggested-tags", c.TaskHandler.GetSuggestedTags)

		// Notebook pages scoped under project
		projects.GET("/:id/notebook", c.NotebookHandler.ListPages)
		projects.POST("/:id/notebook", c.NotebookHandler.CreatePage)

		// AI context endpoints (used by the AI orchestrator's GoAPIClient)
		projects.GET("/:id/memory", c.AIHandler.GetProjectMemory)
		projects.GET("/:id/journal", c.AIHandler.GetProjectJournal)
		projects.GET("/:id/tasks", c.AIHandler.GetProjectTasks)
		projects.GET("/:id/columns", c.AIHandler.GetProjectColumns)
		projects.GET("/:id/discussions", c.AIHandler.GetProjectDiscussions)
		projects.GET("/:id/ai-context", c.AIHandler.GetAIContext)

		// Bulk import: one request creates/replaces an entire board atomically.
		projects.POST("/import", c.ImportHandler.ImportProject)
		projects.POST("/:id/import", c.ImportHandler.ReplaceBoard)
	}

	columns := r.Group("/columns")
	{
		columns.PATCH("/:id", c.ColumnHandler.UpdateColumn)
		columns.DELETE("/:id", c.ColumnHandler.DeleteColumn)
	}

	tasks := r.Group("/tasks")
	{
		tasks.GET("/:id", c.TaskHandler.GetTask)
		tasks.PATCH("/:id/move", c.TaskHandler.MoveTask)
		tasks.PATCH("/:id", c.TaskHandler.UpdateTask)
		tasks.DELETE("/:id", c.TaskHandler.DeleteTask)
		tasks.POST("/:id/checklist", c.ChecklistHandler.AddChecklistItem)
	}

	// Upload routes with rate limiting
	projectUpload := r.Group("/projects")
	projectUpload.Use(middleware.UploadRateLimiter())
	{
		projectUpload.POST("/:id/resources/upload", c.ProjectHandler.UploadProjectResource)
		projectUpload.DELETE("/:id/resources/:resourceId", c.ProjectHandler.DeleteProjectResource)
	}

	taskUpload := r.Group("/tasks")
	taskUpload.Use(middleware.UploadRateLimiter())
	{
		taskUpload.POST("/:id/attachments", c.TaskHandler.UploadTaskAttachment)
		taskUpload.DELETE("/:id/attachments/:attachmentId", c.TaskHandler.DeleteTaskAttachment)
	}

	checklist := r.Group("/checklist")
	{
		checklist.PATCH("/:id", c.ChecklistHandler.UpdateChecklistItem)
		checklist.DELETE("/:id", c.ChecklistHandler.DeleteChecklistItem)
	}

	notebook := r.Group("/notebook")
	{
		notebook.GET("/:id", c.NotebookHandler.GetPage)
		notebook.PATCH("/:id", c.NotebookHandler.UpdatePage)
		notebook.DELETE("/:id", c.NotebookHandler.DeletePage)
	}

	r.GET("/focus", c.FocusHandler.GetFocusTask)
	r.GET("/focus/overview", c.FocusHandler.GetFocusOverview)
	seed := r.Group("/seed")
	seed.Use(middleware.SeedRateLimiter())
	{
		seed.POST("", c.SeedHandler.SeedDemoData)
	}

	providers := r.Group("/providers")
	{
		providers.GET("", c.ProviderHandler.ListProviders)
		providers.POST("", c.ProviderHandler.CreateProvider)
		providers.PUT("/:id", c.ProviderHandler.UpdateProvider)
		providers.DELETE("/:id", c.ProviderHandler.DeleteProvider)
		providers.POST("/:id/test", c.ProviderHandler.TestProvider)
	}

	aiGroup := r.Group("/ai")
	{
		aiGroup.POST("/chat", c.AIHandler.Chat)
		aiGroup.GET("/context-budget", c.AIHandler.GetContextBudget)
		aiGroup.GET("/approvals/pending", c.AIHandler.ListPendingApprovals)
		aiGroup.POST("/approvals/:id/approve", c.AIHandler.ApproveAction)
		aiGroup.POST("/approvals/:id/reject", c.AIHandler.RejectAction)
		aiGroup.POST("/tools/execute", c.ToolHandler.ExecuteTool)
		aiGroup.POST("/tools/execute-batch", c.ToolHandler.ExecuteBatch)
		aiGroup.POST("/context/assemble", c.AIHandler.AssembleContext)
		aiGroup.POST("/index", c.AIHandler.Index)
		aiGroup.POST("/rag/search", c.AIHandler.SearchRAG)
		aiGroup.GET("/outbox/pending", c.AIHandler.PollOutbox)
		aiGroup.POST("/outbox/:id/ack", c.AIHandler.AckOutbox)
	}

	projectConversations := r.Group("/projects/:id/conversations")
	{
		projectConversations.POST("", c.ConversationHandler.CreateConversation)
		projectConversations.GET("", c.ConversationHandler.ListConversations)
	}

	conversations := r.Group("/conversations")
	{
		conversations.GET("/:id", c.ConversationHandler.GetConversation)
		conversations.GET("/:id/messages", c.ConversationHandler.ListMessages)
		conversations.POST("/:id/messages", c.ConversationHandler.AddMessage)
	}

	r.GET("/messages/:id/context", c.ConversationHandler.GetMessageContext)
}
