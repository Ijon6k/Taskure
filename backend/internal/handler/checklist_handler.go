package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ChecklistHandler struct {
	service service.TaskService
}

func NewChecklistHandler(service service.TaskService) *ChecklistHandler {
	return &ChecklistHandler{service: service}
}

func (h *ChecklistHandler) AddChecklistItem(c *gin.Context) {
	taskIDParam := c.Param("id")
	var input service.AddChecklistInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	item, err := h.service.AddChecklistItem(taskIDParam, input)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Created(c, item)
}

func (h *ChecklistHandler) UpdateChecklistItem(c *gin.Context) {
	id := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, err)
		return
	}

	item, err := h.service.UpdateChecklistItem(id, updates)
	if err != nil {
		response.NotFound(c, "Checklist item not found")
		return
	}

	response.OK(c, item)
}

func (h *ChecklistHandler) DeleteChecklistItem(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteChecklistItem(id); err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Message(c, "Checklist item deleted")
}
