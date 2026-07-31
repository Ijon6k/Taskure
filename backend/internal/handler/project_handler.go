package handler

import (
	"errors"

	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/Ijon6k/Taskure/apps/api/internal/util"
	"github.com/gin-gonic/gin"
)

type ProjectHandler struct {
	service service.ProjectService
}

func NewProjectHandler(service service.ProjectService) *ProjectHandler {
	return &ProjectHandler{service: service}
}

func (h *ProjectHandler) ListProjects(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	pinned := c.Query("pinned") == "true"

	projects, err := h.service.ListProjects(status, search, pinned)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, projects)
}

func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var input service.CreateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	project, err := h.service.CreateProject(input)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Created(c, project)
}

func (h *ProjectHandler) GetProject(c *gin.Context) {
	idParam := c.Param("id")
	project, err := h.service.GetProject(idParam)
	if err != nil {
		response.NotFound(c, "Project not found")
		return
	}

	response.OK(c, project)
}

func (h *ProjectHandler) GetProjectBoard(c *gin.Context) {
	idParam := c.Param("id")
	project, err := h.service.GetProjectBoard(idParam)
	if err != nil {
		response.NotFound(c, "Project not found")
		return
	}

	response.OK(c, project)
}

func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	idParam := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, err)
		return
	}

	project, err := h.service.UpdateProject(idParam, updates)
	if err != nil {
		response.NotFound(c, "Project not found")
		return
	}

	response.OK(c, project)
}

func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	idParam := c.Param("id")
	if err := h.service.DeleteProject(idParam); err != nil {
		response.NotFound(c, "Project not found")
		return
	}

	response.Message(c, "Project deleted successfully")
}

func (h *ProjectHandler) DeleteProjectResource(c *gin.Context) {
	idParam := c.Param("id")
	resourceIDParam := c.Param("resourceId")

	project, err := h.service.DeleteResource(c.Request.Context(), idParam, resourceIDParam)
	if err != nil {
		if response.IsNotFound(err) || errors.Is(err, service.ErrResourceNotFound) {
			response.NotFound(c, "Resource not found")
			return
		}
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, project)
}

func (h *ProjectHandler) UploadProjectResource(c *gin.Context) {
	idParam := c.Param("id")
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, err)
		return
	}

	if err := util.ValidateUploadHeader(fileHeader); err != nil {
		response.BadRequest(c, err)
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		response.InternalServerError(c, err)
		return
	}
	defer file.Close()

	declared := fileHeader.Header.Get("Content-Type")
	reader, contentType, err := prepareUpload(file, declared)
	if err != nil {
		response.BadRequest(c, err)
		return
	}

	project, err := h.service.UploadResource(c.Request.Context(), idParam, fileHeader.Filename, reader, fileHeader.Size, contentType)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, project)
}
