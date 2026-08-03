package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type NotebookHandler struct {
	service service.NotebookService
}

// NewNotebookHandler wires the notebook HTTP handlers to the notebook service.
func NewNotebookHandler(service service.NotebookService) *NotebookHandler {
	return &NotebookHandler{service: service}
}

// ListPages handles GET /projects/:id/notebook — page summaries for a project.
func (h *NotebookHandler) ListPages(c *gin.Context) {
	pages, err := h.service.ListPages(c.Param("id"))
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Project not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.OK(c, pages)
}

// CreatePage handles POST /projects/:id/notebook — creates a page in a project.
func (h *NotebookHandler) CreatePage(c *gin.Context) {
	var input service.CreateNotebookPageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	page, err := h.service.CreatePage(c.Param("id"), input)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Project not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.Created(c, page)
}

// GetPage handles GET /notebook/:id — a single page with its content.
func (h *NotebookHandler) GetPage(c *gin.Context) {
	page, err := h.service.GetPage(c.Param("id"))
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Page not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.OK(c, page)
}

// UpdatePage handles PATCH /notebook/:id — partial updates to a page.
func (h *NotebookHandler) UpdatePage(c *gin.Context) {
	var input service.UpdateNotebookPageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	page, err := h.service.UpdatePage(c.Param("id"), input)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Page not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.OK(c, page)
}

// DeletePage handles DELETE /notebook/:id — removes a page.
func (h *NotebookHandler) DeletePage(c *gin.Context) {
	if err := h.service.DeletePage(c.Param("id")); err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Page not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.Message(c, "Resource deleted")
}
