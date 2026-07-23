package handler

import (
	"net/http"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.service.AddChecklistItem(taskIDParam, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *ChecklistHandler) UpdateChecklistItem(c *gin.Context) {
	id := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.service.UpdateChecklistItem(id, updates)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Checklist item not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *ChecklistHandler) DeleteChecklistItem(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteChecklistItem(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Checklist item deleted"})
}
