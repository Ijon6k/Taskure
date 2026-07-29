package handler

import (
	"github.com/Ijon6k/kanbanproject/apps/api/internal/response"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type TaskHandler struct {
	service service.TaskService
}

func NewTaskHandler(service service.TaskService) *TaskHandler {
	return &TaskHandler{service: service}
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	projectIDParam := c.Param("id")
	var input service.CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	task, err := h.service.CreateTask(projectIDParam, input)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Created(c, task)
}

func (h *TaskHandler) GetTask(c *gin.Context) {
	idParam := c.Param("id")
	task, err := h.service.GetTask(idParam)
	if err != nil {
		response.NotFound(c, "Task not found")
		return
	}

	response.OK(c, task)
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
	idParam := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, err)
		return
	}

	task, err := h.service.UpdateTask(idParam, updates)
	if err != nil {
		response.NotFound(c, "Task not found")
		return
	}

	response.OK(c, task)
}

func (h *TaskHandler) MoveTask(c *gin.Context) {
	idParam := c.Param("id")
	var input service.MoveTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	task, err := h.service.MoveTask(idParam, input)
	if err != nil {
		response.NotFound(c, "Task not found")
		return
	}

	response.OK(c, task)
}

func (h *TaskHandler) DeleteTask(c *gin.Context) {
	idParam := c.Param("id")
	if err := h.service.DeleteTask(idParam); err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Message(c, "Task deleted")
}

func (h *TaskHandler) UploadTaskAttachment(c *gin.Context) {
	idParam := c.Param("id")
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, err)
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		response.InternalServerError(c, err)
		return
	}
	defer file.Close()

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	task, err := h.service.UploadAttachment(c.Request.Context(), idParam, fileHeader.Filename, file, fileHeader.Size, contentType)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, task)
}

func (h *TaskHandler) DeleteTaskAttachment(c *gin.Context) {
	idParam := c.Param("id")
	attachmentIDParam := c.Param("attachmentId")

	task, err := h.service.DeleteAttachment(c.Request.Context(), idParam, attachmentIDParam)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, task)
}
