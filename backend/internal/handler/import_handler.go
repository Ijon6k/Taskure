package handler

import (
	"errors"

	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ImportHandler struct {
	service service.ImportService
}

// NewImportHandler wires the import HTTP handlers to the import service.
func NewImportHandler(service service.ImportService) *ImportHandler {
	return &ImportHandler{service: service}
}

// ImportProject handles POST /projects/import — creates a brand-new project from a JSON board.
func (h *ImportHandler) ImportProject(c *gin.Context) {
	var input service.ImportBoardInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	result, err := h.service.ImportProject(input)
	if err != nil {
		if errors.Is(err, service.ErrImportValidation) {
			response.BadRequest(c, err)
			return
		}
		response.SafeError(c, 500, err)
		return
	}

	response.Created(c, gin.H{
		"project": result.Project,
		"counts":  result.Counts,
	})
}

// ReplaceBoard handles POST /projects/:id/import — atomically replaces a project's board from JSON.
func (h *ImportHandler) ReplaceBoard(c *gin.Context) {
	idParam := c.Param("id")
	var input service.ImportBoardInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	counts, err := h.service.ReplaceBoard(idParam, input)
	if err != nil {
		if errors.Is(err, service.ErrImportValidation) {
			response.BadRequest(c, err)
			return
		}
		if response.IsNotFound(err) {
			response.NotFound(c, "Project not found")
			return
		}
		response.SafeError(c, 500, err)
		return
	}

	response.OK(c, gin.H{"counts": counts})
}
