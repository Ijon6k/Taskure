package handler

import (
	"net/http"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col, err := h.service.CreateColumn(projectIDParam, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, col)
}

func (h *ColumnHandler) UpdateColumn(c *gin.Context) {
	id := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col, err := h.service.UpdateColumn(id, updates)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Column not found"})
		return
	}

	c.JSON(http.StatusOK, col)
}

func (h *ColumnHandler) DeleteColumn(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteColumn(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Column deleted"})
}
