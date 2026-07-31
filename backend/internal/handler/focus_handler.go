package handler

import (
	"strconv"

	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/Ijon6k/Taskure/apps/api/internal/viewmodels"
	"github.com/gin-gonic/gin"
)

type FocusHandler struct {
	service service.TaskService
}

func NewFocusHandler(service service.TaskService) *FocusHandler {
	return &FocusHandler{service: service}
}

func (h *FocusHandler) GetFocusTask(c *gin.Context) {
	projectID := c.Query("project_id")
	limitStr := c.Query("limit")
	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	focus, err := h.service.GetFocusTask(projectID, limit)
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}

	vm := viewmodels.NewFocusViewModel(*focus)
	response.OK(c, vm)
}

func (h *FocusHandler) GetFocusOverview(c *gin.Context) {
	overview, err := h.service.GetFocusOverview()
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, overview)
}
