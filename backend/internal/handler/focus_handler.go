package handler

import (
	"net/http"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type FocusHandler struct {
	service service.TaskService
}

func NewFocusHandler(service service.TaskService) *FocusHandler {
	return &FocusHandler{service: service}
}

func (h *FocusHandler) GetFocusTask(c *gin.Context) {
	focus, err := h.service.GetFocusTask()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"focus": focus})
}
