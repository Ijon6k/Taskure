package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ChecklistHandler struct {
	service service.TaskService
}

// NewChecklistHandler wires the checklist HTTP handlers to the task service.
func NewChecklistHandler(service service.TaskService) *ChecklistHandler {
	return &ChecklistHandler{service: service}
}

// AddChecklistItem handles POST /checklist — appends a subtask to a task.
func (h *ChecklistHandler) AddChecklistItem(c *gin.Context) {
	taskIDParam := c.Param("id")
	var input service.AddChecklistInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	item, err := h.service.AddChecklistItem(taskIDParam, input)
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}

	response.Created(c, item)
}

// UpdateChecklistItem handles PATCH /checklist/:id — updates a subtask (title/completion/position).
func (h *ChecklistHandler) UpdateChecklistItem(c *gin.Context) {
	id := c.Param("id")
	var input models.UpdateChecklistItemInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	updates := make(map[string]interface{})
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.IsCompleted != nil {
		updates["is_completed"] = *input.IsCompleted
	}
	if input.Position != nil {
		updates["position"] = *input.Position
	}

	item, err := h.service.UpdateChecklistItem(id, updates)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Checklist item not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.OK(c, item)
}

// DeleteChecklistItem handles DELETE /checklist/:id — removes a subtask.
func (h *ChecklistHandler) DeleteChecklistItem(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteChecklistItem(id); err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Checklist item not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.Message(c, "Resource deleted")
}
