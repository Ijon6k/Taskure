package handler

import (
	"net/http"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/Ijon6k/Taskure/apps/api/internal/util"
	"github.com/gin-gonic/gin"
)

type TaskHandler struct {
	service service.TaskService
}

// NewTaskHandler wires the task HTTP handlers to the task service.
func NewTaskHandler(service service.TaskService) *TaskHandler {
	return &TaskHandler{service: service}
}

// CreateTask handles POST /projects/:id/tasks — creates a task in a column.
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

// GetTask handles GET /tasks/:id — full task detail with checklist and labels.
func (h *TaskHandler) GetTask(c *gin.Context) {
	idParam := c.Param("id")
	task, err := h.service.GetTask(idParam)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Task not found")
		} else {
			response.SafeError(c, http.StatusInternalServerError, err)
		}
		return
	}

	response.OK(c, task)
}

// UpdateTask handles PATCH /tasks/:id — partial update (title, description, tags, due date, ...).
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	idParam := c.Param("id")
	var input models.UpdateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	updates := make(map[string]interface{})
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.Priority != nil {
		updates["priority"] = *input.Priority
	}
	if input.Status != nil {
		updates["status"] = *input.Status
	}
	if input.DueDate != nil {
		updates["due_date"] = *input.DueDate
	}
	if input.Tags != nil {
		updates["tags"] = input.Tags
	}
	if input.Attachments != nil {
		updates["attachments"] = input.Attachments
	}

	task, err := h.service.UpdateTask(idParam, updates)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Task not found")
		} else {
			response.SafeError(c, http.StatusInternalServerError, err)
		}
		return
	}
	response.OK(c, task)
}

// MoveTask handles PATCH /tasks/:id/move — moves a task between columns or repositions it.
func (h *TaskHandler) MoveTask(c *gin.Context) {
	idParam := c.Param("id")
	var input service.MoveTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err)
		return
	}

	task, err := h.service.MoveTask(idParam, input)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Task not found")
		} else {
			response.SafeError(c, http.StatusInternalServerError, err)
		}
		return
	}

	response.OK(c, task)
}

// DeleteTask handles DELETE /tasks/:id — deletes a task and its attachments.
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	idParam := c.Param("id")
	if err := h.service.DeleteTask(idParam); err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Task not found")
		} else {
			response.SafeError(c, http.StatusInternalServerError, err)
		}
		return
	}

	response.Message(c, "Task deleted")
}

// UploadTaskAttachment handles POST /tasks/:id/attachments — stores a file in MinIO and attaches it to the task.
func (h *TaskHandler) UploadTaskAttachment(c *gin.Context) {
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

	task, err := h.service.UploadAttachment(c.Request.Context(), idParam, fileHeader.Filename, reader, fileHeader.Size, contentType)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, task)
}

// DeleteTaskAttachment handles DELETE /tasks/:id/attachments/:attachmentId — removes an attachment and its object.
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

// GetSuggestedTags handles GET /projects/:id/suggested-tags — tag suggestions from usage history.
func (h *TaskHandler) GetSuggestedTags(c *gin.Context) {
	projectIDParam := c.Param("id")
	tags, err := h.service.GetSuggestedTags(projectIDParam, 10)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, tags)
}
