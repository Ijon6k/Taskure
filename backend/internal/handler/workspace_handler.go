package handler

import (
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
		response.InternalServerError(c, err)
		return
	}
	response.OK(c, ws)
}

func (h *WorkspaceHandler) UpdateDefaultWorkspace(c *gin.Context) {
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, err)
		return
	}

	ws, err := h.service.UpdateDefaultWorkspace(updates)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, ws)
}
