package handler

import (
	"github.com/Ijon6k/kanbanproject/apps/api/internal/response"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ColumnHandler struct {
	service service.ColumnService
}

func NewColumnHandler(service service.ColumnService) *ColumnHandler {
	return &ColumnHandler{service: service}
}

func (h *ColumnHandler) CreateColumn(c *gin.Context) {
	projectIDParam := c.Param("id")
	var input service.CreateColumnInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	col, err := h.service.CreateColumn(projectIDParam, input)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Created(c, col)
}

func (h *ColumnHandler) UpdateColumn(c *gin.Context) {
	id := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, err)
		return
	}

	col, err := h.service.UpdateColumn(id, updates)
	if err != nil {
		response.NotFound(c, "Column not found")
		return
	}

	response.OK(c, col)
}

func (h *ColumnHandler) DeleteColumn(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteColumn(id); err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Message(c, "Column deleted")
}
