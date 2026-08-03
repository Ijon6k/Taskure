package handler

import (
	"strconv"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/Ijon6k/Taskure/apps/api/internal/viewmodels"
	"github.com/gin-gonic/gin"
)

type FocusHandler struct {
	service service.TaskService
}

// NewFocusHandler wires the focus HTTP handlers to the task service.
func NewFocusHandler(service service.TaskService) *FocusHandler {
	return &FocusHandler{service: service}
}

// clientLocation resolves the client timezone from tz_offset_minutes (minutes
// east of UTC, as reported by JS Date.getTimezoneOffset() negated). Malformed
// or out-of-range values fall back to UTC.
func clientLocation(c *gin.Context) *time.Location {
	offsetMinutes, err := strconv.Atoi(c.Query("tz_offset_minutes"))
	if err != nil || offsetMinutes < -14*60 || offsetMinutes > 14*60 {
		return time.UTC
	}
	return time.FixedZone("client", offsetMinutes*60)
}

// GetFocusTask handles GET /focus — returns the single most important task for today, timezone-aware.
func (h *FocusHandler) GetFocusTask(c *gin.Context) {
	projectID := c.Query("project_id")
	limitStr := c.Query("limit")
	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > 200 {
				l = 200
			}
			limit = l
		}
	}

	loc := clientLocation(c)

	focus, err := h.service.GetFocusTask(projectID, limit, loc)
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}

	vm := viewmodels.NewFocusViewModel(*focus, loc)
	response.OK(c, vm)
}

// GetFocusOverview handles GET /focus/overview — returns focus eligibility counts.
func (h *FocusHandler) GetFocusOverview(c *gin.Context) {
	overview, err := h.service.GetFocusOverview()
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, overview)
}
