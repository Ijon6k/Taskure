package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
	"github.com/Ijon6k/kanbanproject/apps/api/pkg/nanoid"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type APIHandler struct {
	db *gorm.DB
}

func New(db *gorm.DB) *APIHandler {
	h := &APIHandler{db: db}
	h.backfillPublicIDs()
	return h
}

// backfillPublicIDs generates NanoIDs for any pre-existing records with missing public_id.
func (h *APIHandler) backfillPublicIDs() {
	var workspaces []models.Workspace
	if err := h.db.Where("public_id IS NULL OR public_id = ''").Find(&workspaces).Error; err == nil {
		for _, ws := range workspaces {
			if id, err := nanoid.Generate("ws"); err == nil {
				h.db.Model(&ws).Update("public_id", id)
			}
		}
	}

	var projects []models.Project
	if err := h.db.Where("public_id IS NULL OR public_id = ''").Find(&projects).Error; err == nil {
		for _, p := range projects {
			if id, err := nanoid.Generate("prj"); err == nil {
				h.db.Model(&p).Update("public_id", id)
			}
		}
	}

	var tasks []models.Task
	if err := h.db.Where("public_id IS NULL OR public_id = ''").Find(&tasks).Error; err == nil {
		for _, t := range tasks {
			if id, err := nanoid.Generate("tsk"); err == nil {
				h.db.Model(&t).Update("public_id", id)
			}
		}
	}
}

func isUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

// Helper to find a project by public_id or internal UUID
func (h *APIHandler) findProject(param string, project *models.Project) error {
	if isUUID(param) {
		return h.db.Where("id = ? OR public_id = ?", param, param).First(project).Error
	}
	return h.db.Where("public_id = ?", param).First(project).Error
}

// Helper to find a task by public_id or internal UUID
func (h *APIHandler) findTask(param string, task *models.Task) error {
	if isUUID(param) {
		return h.db.Where("id = ? OR public_id = ?", param, param).First(task).Error
	}
	return h.db.Where("public_id = ?", param).First(task).Error
}

// RegisterRoutes registers all /api endpoint handlers.
func (h *APIHandler) RegisterRoutes(r *gin.RouterGroup) {
	workspaces := r.Group("/workspaces")
	{
		workspaces.GET("/default", h.GetDefaultWorkspace)
		workspaces.PATCH("/default", h.UpdateDefaultWorkspace)
	}

	projects := r.Group("/projects")
	{
		projects.GET("", h.ListProjects)
		projects.POST("", h.CreateProject)
		projects.GET("/:id", h.GetProject)
		projects.PATCH("/:id", h.UpdateProject)
		projects.DELETE("/:id", h.DeleteProject)

		// Column & task nested routes
		projects.POST("/:id/columns", h.CreateColumn)
		projects.POST("/:id/tasks", h.CreateTask)
	}

	columns := r.Group("/columns")
	{
		columns.PATCH("/:id", h.UpdateColumn)
		columns.DELETE("/:id", h.DeleteColumn)
	}

	tasks := r.Group("/tasks")
	{
		tasks.GET("/:id", h.GetTask)
		tasks.PATCH("/:id", h.UpdateTask)
		tasks.PATCH("/:id/move", h.MoveTask)
		tasks.DELETE("/:id", h.DeleteTask)
		tasks.POST("/:id/checklist", h.AddChecklistItem)
	}

	checklist := r.Group("/checklist")
	{
		checklist.PATCH("/:id", h.UpdateChecklistItem)
		checklist.DELETE("/:id", h.DeleteChecklistItem)
	}

	r.GET("/focus", h.GetFocusTask)
	r.POST("/seed", h.SeedDemoData)
}

// EnsureDefaultWorkspace guarantees a default user and workspace exist.
func (h *APIHandler) EnsureDefaultWorkspace() (*models.Workspace, error) {
	var user models.User
	if err := h.db.First(&user).Error; err != nil {
		user = models.User{
			Name:  "Developer",
			Email: "developer@kanban.local",
		}
		if err := h.db.Create(&user).Error; err != nil {
			return nil, err
		}
	}

	var ws models.Workspace
	if err := h.db.Where("owner_id = ?", user.ID).First(&ws).Error; err != nil {
		ws = models.Workspace{
			Name:        "Personal Workspace",
			Slug:        "personal-workspace",
			Description: "Ruang kerja utama projek pribadi Anda",
			OwnerID:     user.ID,
		}
		if err := h.db.Create(&ws).Error; err != nil {
			return nil, err
		}
	}

	return &ws, nil
}

// GetDefaultWorkspace returns the active workspace.
func (h *APIHandler) GetDefaultWorkspace(c *gin.Context) {
	ws, err := h.EnsureDefaultWorkspace()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ws)
}

// UpdateDefaultWorkspace updates default workspace settings or metadata.
func (h *APIHandler) UpdateDefaultWorkspace(c *gin.Context) {
	ws, err := h.EnsureDefaultWorkspace()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Model(ws).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ws)
}

// ListProjects lists active projects with optional query params: status, search, pinned.
func (h *APIHandler) ListProjects(c *gin.Context) {
	ws, err := h.EnsureDefaultWorkspace()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	query := h.db.Where("workspace_id = ?", ws.ID)

	statusParam := c.Query("status")
	if statusParam != "" && statusParam != "all" {
		if statusParam == "archived" {
			query = query.Where("is_archived = ? OR status = ?", true, "archived")
		} else {
			query = query.Where("status = ?", statusParam)
		}
	}

	searchParam := c.Query("search")
	if searchParam != "" {
		s := "%" + strings.ToLower(searchParam) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", s, s)
	}

	pinnedParam := c.Query("pinned")
	if pinnedParam == "true" {
		query = query.Where("is_pinned = ?", true)
	}

	var projects []models.Project
	if err := query.Preload("Columns").
		Preload("Tasks").
		Order("is_pinned desc, created_at desc").
		Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, projects)
}

type CreateProjectInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	Status      string `json:"status"`
	IsPinned    bool   `json:"is_pinned"`
}

// CreateProject creates a new project and populates 3 default columns ("Todo", "In Progress", "Done").
func (h *APIHandler) CreateProject(c *gin.Context) {
	var input CreateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ws, err := h.EnsureDefaultWorkspace()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if input.Color == "" {
		input.Color = "#B4A0E5"
	}
	if input.Status == "" {
		input.Status = "active"
	}

	project := models.Project{
		Name:        input.Name,
		Description: input.Description,
		Color:       input.Color,
		Icon:        input.Icon,
		Status:      input.Status,
		IsPinned:    input.IsPinned,
		WorkspaceID: ws.ID,
		OwnerID:     ws.OwnerID,
	}

	if err := h.db.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create 3 default columns
	columns := []models.Column{
		{Name: "Todo", Position: 0, ProjectID: project.ID, Color: "#6B7280"},
		{Name: "In Progress", Position: 1, ProjectID: project.ID, Color: "#3B82F6"},
		{Name: "Done", Position: 2, ProjectID: project.ID, Color: "#22C55E"},
	}

	for _, col := range columns {
		h.db.Create(&col)
	}

	// Reload with columns
	h.db.Preload("Columns").First(&project, "id = ?", project.ID)
	c.JSON(http.StatusCreated, project)
}

// GetProject returns a single project by public_id or internal ID with nested columns and tasks.
func (h *APIHandler) GetProject(c *gin.Context) {
	idParam := c.Param("id")
	var project models.Project

	query := h.db.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Columns.Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc").Preload("ChecklistItems").Preload("Labels")
	})

	if isUUID(idParam) {
		query = query.Where("id = ? OR public_id = ?", idParam, idParam)
	} else {
		query = query.Where("public_id = ?", idParam)
	}

	if err := query.First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, project)
}

// UpdateProject updates project fields.
func (h *APIHandler) UpdateProject(c *gin.Context) {
	idParam := c.Param("id")
	var project models.Project
	if err := h.findProject(idParam, &project); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}

// DeleteProject deletes a project by public_id or internal ID.
func (h *APIHandler) DeleteProject(c *gin.Context) {
	idParam := c.Param("id")
	var project models.Project
	if err := h.findProject(idParam, &project); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if err := h.db.Delete(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

type CreateColumnInput struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color"`
}

// CreateColumn creates a new column in a project.
func (h *APIHandler) CreateColumn(c *gin.Context) {
	idParam := c.Param("id")
	var project models.Project
	if err := h.findProject(idParam, &project); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var input CreateColumnInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var count int64
	h.db.Model(&models.Column{}).Where("project_id = ?", project.ID).Count(&count)

	col := models.Column{
		Name:      input.Name,
		Color:     input.Color,
		Position:  int(count),
		ProjectID: project.ID,
	}

	if err := h.db.Create(&col).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, col)
}

// UpdateColumn updates column name or color.
func (h *APIHandler) UpdateColumn(c *gin.Context) {
	id := c.Param("id")
	var col models.Column
	if err := h.db.First(&col, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Column not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.db.Model(&col).Updates(updates)
	c.JSON(http.StatusOK, col)
}

// DeleteColumn deletes a column.
func (h *APIHandler) DeleteColumn(c *gin.Context) {
	id := c.Param("id")
	h.db.Delete(&models.Column{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "Column deleted"})
}

type CreateTaskInput struct {
	Title       string     `json:"title" binding:"required"`
	ColumnID    string     `json:"column_id" binding:"required"`
	Priority    string     `json:"priority"`
	Description string     `json:"description"`
	DueDate     *time.Time `json:"due_date"`
}

// CreateTask creates a task inside a column.
func (h *APIHandler) CreateTask(c *gin.Context) {
	idParam := c.Param("id")
	var project models.Project
	if err := h.findProject(idParam, &project); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var input CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Priority == "" {
		input.Priority = "medium"
	}

	var count int64
	h.db.Model(&models.Task{}).Where("column_id = ?", input.ColumnID).Count(&count)

	task := models.Task{
		Title:       input.Title,
		Description: input.Description,
		ColumnID:    input.ColumnID,
		ProjectID:   project.ID,
		Priority:    input.Priority,
		Status:      "todo",
		Position:    int(count),
		DueDate:     input.DueDate,
	}

	if err := h.db.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

// GetTask returns a single task by public_id or internal ID with full relations.
func (h *APIHandler) GetTask(c *gin.Context) {
	idParam := c.Param("id")
	var task models.Task
	query := h.db.Preload("ChecklistItems", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Labels")

	if isUUID(idParam) {
		query = query.Where("id = ? OR public_id = ?", idParam, idParam)
	} else {
		query = query.Where("public_id = ?", idParam)
	}

	if err := query.First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, task)
}

// UpdateTask updates task fields.
func (h *APIHandler) UpdateTask(c *gin.Context) {
	idParam := c.Param("id")
	var task models.Task
	if err := h.findTask(idParam, &task); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Model(&task).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.db.Preload("ChecklistItems").Preload("Labels").First(&task, "id = ?", task.ID)
	c.JSON(http.StatusOK, task)
}

type MoveTaskInput struct {
	ColumnID string `json:"column_id" binding:"required"`
	Position int    `json:"position"`
	Status   string `json:"status"`
}

// MoveTask moves a task between columns or changes its order position.
func (h *APIHandler) MoveTask(c *gin.Context) {
	idParam := c.Param("id")
	var input MoveTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var task models.Task
	if err := h.findTask(idParam, &task); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	updates := map[string]interface{}{
		"column_id": input.ColumnID,
		"position":  input.Position,
	}

	if input.Status != "" {
		updates["status"] = input.Status
	}

	if err := h.db.Model(&task).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}

// DeleteTask deletes a task.
func (h *APIHandler) DeleteTask(c *gin.Context) {
	idParam := c.Param("id")
	var task models.Task
	if err := h.findTask(idParam, &task); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	h.db.Delete(&task)
	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

type AddChecklistInput struct {
	Title string `json:"title" binding:"required"`
}

// AddChecklistItem adds a item to a task's checklist.
func (h *APIHandler) AddChecklistItem(c *gin.Context) {
	idParam := c.Param("id")
	var task models.Task
	if err := h.findTask(idParam, &task); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var input AddChecklistInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var count int64
	h.db.Model(&models.ChecklistItem{}).Where("task_id = ?", task.ID).Count(&count)

	item := models.ChecklistItem{
		Title:       input.Title,
		IsCompleted: false,
		Position:    int(count),
		TaskID:      task.ID,
	}

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// UpdateChecklistItem updates a checklist item.
func (h *APIHandler) UpdateChecklistItem(c *gin.Context) {
	id := c.Param("id")
	var item models.ChecklistItem
	if err := h.db.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Checklist item not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.db.Model(&item).Updates(updates)
	c.JSON(http.StatusOK, item)
}

// DeleteChecklistItem deletes a checklist item.
func (h *APIHandler) DeleteChecklistItem(c *gin.Context) {
	id := c.Param("id")
	h.db.Delete(&models.ChecklistItem{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "Checklist item deleted"})
}

// GetFocusTask calculates and returns the top focus task for the user dashboard.
func (h *APIHandler) GetFocusTask(c *gin.Context) {
	var tasks []models.Task
	if err := h.db.Where("status != ?", "done").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(tasks) == 0 {
		c.JSON(http.StatusOK, gin.H{"focus": nil})
		return
	}

	var projects []models.Project
	h.db.Find(&projects)

	projectMap := make(map[string]models.Project)
	for _, p := range projects {
		projectMap[p.ID] = p
	}

	results := service.CalculateFocusTasks(tasks, projectMap)
	if len(results) == 0 {
		c.JSON(http.StatusOK, gin.H{"focus": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"focus": results[0]})
}

// SeedDemoData inserts rich initial demo projects, columns, tasks, and checklist items matching Figma references.
func (h *APIHandler) SeedDemoData(c *gin.Context) {
	ws, err := h.EnsureDefaultWorkspace()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
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
	h.db.Create(&p1)

	col1 := models.Column{Name: "Backlog", Position: 0, ProjectID: p1.ID, Color: "#8A8F98"}
	col2 := models.Column{Name: "Todo", Position: 1, ProjectID: p1.ID, Color: "#6B7280"}
	col3 := models.Column{Name: "In Progress", Position: 2, ProjectID: p1.ID, Color: "#7F9CF5"}
	col4 := models.Column{Name: "Done", Position: 3, ProjectID: p1.ID, Color: "#68D391"}
	h.db.Create(&col1)
	h.db.Create(&col2)
	h.db.Create(&col3)
	h.db.Create(&col4)

	t1 := models.Task{
		Title:       "Migrate pagination to cursor-based model",
		Description: "Refactor list endpoints to use opaque cursor tokens for improved scaling.",
		ColumnID:    col3.ID,
		ProjectID:   p1.ID,
		Priority:    "urgent",
		Status:      "in_progress",
		Position:    0,
		DueDate:     &dueInTwoDays,
	}
	h.db.Create(&t1)
	h.db.Create(&models.ChecklistItem{Title: "Implement cursor encoding", IsCompleted: true, Position: 0, TaskID: t1.ID})
	h.db.Create(&models.ChecklistItem{Title: "Update list endpoints", IsCompleted: true, Position: 1, TaskID: t1.ID})
	h.db.Create(&models.ChecklistItem{Title: "Update SDK helpers", IsCompleted: false, Position: 2, TaskID: t1.ID})

	t2 := models.Task{
		Title:       "Implement auth refresh token rotation",
		Description: "Add sliding expiration for session tokens.",
		ColumnID:    col1.ID,
		ProjectID:   p1.ID,
		Priority:    "high",
		Status:      "todo",
		Position:    0,
		DueDate:     &dueTomorrow,
	}
	h.db.Create(&t2)
	h.db.Create(&models.ChecklistItem{Title: "Design refresh token schema", IsCompleted: true, Position: 0, TaskID: t2.ID})
	h.db.Create(&models.ChecklistItem{Title: "Implement store & revocation", IsCompleted: false, Position: 1, TaskID: t2.ID})
	h.db.Create(&models.ChecklistItem{Title: "Unit tests", IsCompleted: false, Position: 2, TaskID: t2.ID})

	t3 := models.Task{
		Title:       "Add rate limiting to public endpoints",
		Description: "Enforce strict per-key rate limits with Redis token bucket.",
		ColumnID:    col1.ID,
		ProjectID:   p1.ID,
		Priority:    "urgent",
		Status:      "todo",
		Position:    1,
		DueDate:     &dueInTwoDays,
	}
	h.db.Create(&t3)
	h.db.Create(&models.ChecklistItem{Title: "Redis rate limit middleware", IsCompleted: true, Position: 0, TaskID: t3.ID})
	h.db.Create(&models.ChecklistItem{Title: "Test limit response headers", IsCompleted: false, Position: 1, TaskID: t3.ID})

	t4 := models.Task{
		Title:       "Write OpenAPI 3.1 spec for v2",
		Description: "Complete API specification doc.",
		ColumnID:    col1.ID,
		ProjectID:   p1.ID,
		Priority:    "low",
		Status:      "todo",
		Position:    2,
		DueDate:     &dueNextWeek,
	}
	h.db.Create(&t4)

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
	h.db.Create(&p2)
	colA := models.Column{Name: "Todo", Position: 0, ProjectID: p2.ID, Color: "#6B7280"}
	colB := models.Column{Name: "In Progress", Position: 1, ProjectID: p2.ID, Color: "#3B82F6"}
	colC := models.Column{Name: "Done", Position: 2, ProjectID: p2.ID, Color: "#22C55E"}
	h.db.Create(&colA)
	h.db.Create(&colB)
	h.db.Create(&colC)

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
	h.db.Create(&p3)

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
	h.db.Create(&p4)

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
	h.db.Create(&p5)

	c.JSON(http.StatusOK, gin.H{
		"message":  "Demo data seeded successfully",
		"projects": []string{p1.Name, p2.Name, p3.Name, p4.Name, p5.Name},
	})
}
