package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/middleware"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/gin-gonic/gin"
)

type Container struct {
	WorkspaceHandler *WorkspaceHandler
	ProjectHandler   *ProjectHandler
	ColumnHandler    *ColumnHandler
	TaskHandler      *TaskHandler
	ChecklistHandler *ChecklistHandler
	FocusHandler     *FocusHandler
	SeedHandler      *SeedHandler
	StorageHandler   *StorageHandler
}

func NewContainer(
	workspaceService service.WorkspaceService,
	projectService service.ProjectService,
	columnService service.ColumnService,
	taskService service.TaskService,
	seedService service.SeedService,
	storageSvc storage.StorageService,
) *Container {
	return &Container{
		WorkspaceHandler: NewWorkspaceHandler(workspaceService),
		ProjectHandler:   NewProjectHandler(projectService),
		ColumnHandler:    NewColumnHandler(columnService),
		TaskHandler:      NewTaskHandler(taskService),
		ChecklistHandler: NewChecklistHandler(taskService),
		FocusHandler:     NewFocusHandler(taskService),
		SeedHandler:      NewSeedHandler(seedService),
		StorageHandler:   NewStorageHandler(storageSvc),
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
		projects.POST("", c.ProjectHandler.CreateProject)
		projects.GET("/:id", c.ProjectHandler.GetProject)
		projects.GET("/:id/board", c.ProjectHandler.GetProjectBoard)
		projects.PATCH("/:id", c.ProjectHandler.UpdateProject)
		projects.DELETE("/:id", c.ProjectHandler.DeleteProject)

		// Column & Task creation scoped under project
		projects.POST("/:id/columns", c.ColumnHandler.CreateColumn)
		projects.POST("/:id/tasks", c.TaskHandler.CreateTask)
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

	r.GET("/focus", c.FocusHandler.GetFocusTask)
	r.GET("/focus/overview", c.FocusHandler.GetFocusOverview)
	seed := r.Group("/seed")
	seed.Use(middleware.SeedRateLimiter())
	{
		seed.POST("", c.SeedHandler.SeedDemoData)
	}
}
