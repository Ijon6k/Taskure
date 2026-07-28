package handler

import (
	"github.com/Ijon6k/kanbanproject/apps/api/internal/response"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/viewmodels"
	"github.com/gin-gonic/gin"
)

type FocusHandler struct {
	service service.TaskService
}

func NewFocusHandler(service service.TaskService) *FocusHandler {
	return &FocusHandler{service: service}
}

func (h *FocusHandler) GetFocusTask(c *gin.Context) {
	focus, err := h.service.GetFocusTask()
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	vm := viewmodels.NewFocusViewModel(*focus)
	response.OK(c, vm)
}

func (h *FocusHandler) GetFocusOverview(c *gin.Context) {
	overview, err := h.service.GetFocusOverview()
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, overview)
}
