package handler

import (
	"net/http"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type SeedHandler struct {
	service service.SeedService
}

func NewSeedHandler(service service.SeedService) *SeedHandler {
	return &SeedHandler{service: service}
}

func (h *SeedHandler) SeedDemoData(c *gin.Context) {
	projects, err := h.service.SeedDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Demo data seeded successfully",
		"projects": projects,
	})
}
