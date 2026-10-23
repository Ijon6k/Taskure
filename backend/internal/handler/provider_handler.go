package handler

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ProviderHandler struct {
	service service.ProviderService
}

func NewProviderHandler(service service.ProviderService) *ProviderHandler {
	return &ProviderHandler{service: service}
}

func (h *ProviderHandler) ListProviders(c *gin.Context) {
	configs, err := h.service.List()
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}
	response.OK(c, configs)
}

func (h *ProviderHandler) CreateProvider(c *gin.Context) {
	var req service.CreateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	cfg, err := h.service.Create(req)
	if err != nil {
		response.SafeError(c, 500, err)
		return
	}

	response.Created(c, cfg)
}

func (h *ProviderHandler) UpdateProvider(c *gin.Context) {
	var req service.UpdateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	cfg, err := h.service.Update(c.Param("id"), req)
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Provider configuration not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.OK(c, cfg)
}

func (h *ProviderHandler) DeleteProvider(c *gin.Context) {
	if err := h.service.Delete(c.Param("id")); err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Provider configuration not found")
		} else {
			response.SafeError(c, 500, err)
		}
		return
	}

	response.Message(c, "Resource deleted")
}

func (h *ProviderHandler) TestProvider(c *gin.Context) {
	var req service.TestProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// No body (frontend sends POST /providers/:id/test with no payload) →
		// look up the stored provider by ID and test with the decrypted key.
		id := c.Param("id")
		if id == "" {
			response.BadRequest(c, err)
			return
		}

		provider, apiKey, endpoint, model, lookupErr := h.service.GetDecrypted(id)
		if lookupErr != nil {
			if response.IsNotFound(lookupErr) {
				response.NotFound(c, "Provider configuration not found")
			} else {
				response.InternalServerError(c, lookupErr)
			}
			return
		}

		req.Provider = provider
		req.APIKey = apiKey
		req.Endpoint = endpoint
		req.Model = model
	}

	if err := h.service.Test(req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}

	response.Message(c, "Provider test successful")
}
