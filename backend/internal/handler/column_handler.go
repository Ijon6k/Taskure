package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ColumnHandler struct {
	service service.ColumnService
}

// NewColumnHandler wires the column HTTP handlers to the column service.
func NewColumnHandler(service service.ColumnService) *ColumnHandler {
	return &ColumnHandler{service: service}
}

// CreateColumn handles POST /projects/:id/columns — creates a column in a project.
func (h *ColumnHandler) CreateColumn(c *gin.Context) {
	projectIDParam := c.Param("id")
	var input service.CreateColumnInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	col, err := h.service.CreateColumn(projectIDParam, input)
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}

	response.Created(c, col)
}

// UpdateColumn handles PATCH /columns/:id — renames/reorders a column.
func (h *ColumnHandler) UpdateColumn(c *gin.Context) {
	id := c.Param("id")
	var input models.UpdateColumnInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	updates := make(map[string]interface{})
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Color != nil {
		updates["color"] = *input.Color
	}
	if input.Position != nil {
		updates["position"] = *input.Position
	}
	if input.Behavior != nil {
		updates["behavior"] = *input.Behavior
	}

	col, err := h.service.UpdateColumn(id, updates)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Column not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.OK(c, col)
}

// DeleteColumn handles DELETE /columns/:id — removes a column with its tasks.
func (h *ColumnHandler) DeleteColumn(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteColumn(id); err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Column not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.Message(c, "Resource deleted")
}
