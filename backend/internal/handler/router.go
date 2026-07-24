package handler

import (
	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
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
}

func NewContainer(
	workspaceService service.WorkspaceService,
	projectService service.ProjectService,
	columnService service.ColumnService,
	taskService service.TaskService,
	seedService service.SeedService,
) *Container {
	return &Container{
		WorkspaceHandler: NewWorkspaceHandler(workspaceService),
		ProjectHandler:   NewProjectHandler(projectService),
		ColumnHandler:    NewColumnHandler(columnService),
		TaskHandler:      NewTaskHandler(taskService),
		ChecklistHandler: NewChecklistHandler(taskService),
		FocusHandler:     NewFocusHandler(taskService),
		SeedHandler:      NewSeedHandler(seedService),
	}
}

// RegisterRoutes registers all /api endpoints onto the Gin RouterGroup.
func (c *Container) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/hello", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello World! Kanban Go API Backend is running smoothly.",
			"status":  "ok",
			"service": "kanban-api",
		})
	})

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
		tasks.PATCH("/:id", c.TaskHandler.UpdateTask)
		tasks.PATCH("/:id/move", c.TaskHandler.MoveTask)
		tasks.DELETE("/:id", c.TaskHandler.DeleteTask)
		tasks.POST("/:id/checklist", c.ChecklistHandler.AddChecklistItem)
	}

	checklist := r.Group("/checklist")
	{
		checklist.PATCH("/:id", c.ChecklistHandler.UpdateChecklistItem)
		checklist.DELETE("/:id", c.ChecklistHandler.DeleteChecklistItem)
	}

	r.GET("/focus", c.FocusHandler.GetFocusTask)
	r.POST("/seed", c.SeedHandler.SeedDemoData)
}
