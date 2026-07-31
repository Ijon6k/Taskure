package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type WorkspaceHandler struct {
	service service.WorkspaceService
}

func NewWorkspaceHandler(service service.WorkspaceService) *WorkspaceHandler {
	return &WorkspaceHandler{service: service}
}

func (h *WorkspaceHandler) GetDefaultWorkspace(c *gin.Context) {
	ws, err := h.service.GetDefaultWorkspace()
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}
	response.OK(c, ws)
}

func (h *WorkspaceHandler) UpdateDefaultWorkspace(c *gin.Context) {
	var input models.UpdateWorkspaceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	updates := make(map[string]interface{})
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}

	ws, err := h.service.UpdateDefaultWorkspace(updates)
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}

	response.OK(c, ws)
}
