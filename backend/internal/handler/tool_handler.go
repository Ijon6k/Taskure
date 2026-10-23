package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ToolHandler struct {
	service service.ToolExecutionService
}

func NewToolHandler(service service.ToolExecutionService) *ToolHandler {
	return &ToolHandler{service: service}
}

func (h *ToolHandler) ExecuteTool(c *gin.Context) {
	var req service.ToolExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	result, err := h.service.Execute(req.Tool, req.Parameters, req.ProjectID)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, result)
}

func (h *ToolHandler) ExecuteBatch(c *gin.Context) {
	var req struct {
		Tools []service.ToolExecutionRequest `json:"tools" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	results := make([]map[string]interface{}, len(req.Tools))
	for i, tool := range req.Tools {
		result, err := h.service.Execute(tool.Tool, tool.Parameters, tool.ProjectID)
		if err != nil {
			results[i] = map[string]interface{}{
				"tool":   tool.Tool,
				"error":  err.Error(),
				"status": "failed",
			}
		} else {
			results[i] = map[string]interface{}{
				"tool":   tool.Tool,
				"result": result,
				"status": "success",
			}
		}
	}

	response.OK(c, map[string]interface{}{"results": results})
}
