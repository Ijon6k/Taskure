package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type SeedHandler struct {
	service service.SeedService
}

// NewSeedHandler wires the seed HTTP handlers to the seed service.
func NewSeedHandler(service service.SeedService) *SeedHandler {
	return &SeedHandler{service: service}
}

// SeedDemoData handles POST /seed — creates a demo workspace with sample projects.
func (h *SeedHandler) SeedDemoData(c *gin.Context) {
	projects, err := h.service.SeedDemoData()
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.OK(c, gin.H{
		"message":  "Demo data seeded successfully",
		"projects": projects,
	})
}
