package handler

import (
	"encoding/json"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/response"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ConversationHandler struct {
	service service.ConversationService
}

func NewConversationHandler(service service.ConversationService) *ConversationHandler {
	return &ConversationHandler{service: service}
}

func (h *ConversationHandler) CreateConversation(c *gin.Context) {
	projectID := c.Param("id")

	var req struct {
		Title string `json:"title"`
		Mode  string `json:"mode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}
	if req.Mode == "" {
		req.Mode = "thinking"
	}

	conv, err := h.service.CreateConversation(projectID, req.Title, req.Mode)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Created(c, conv)
}

func (h *ConversationHandler) ListConversations(c *gin.Context) {
	projectID := c.Param("id")

	convs, err := h.service.ListConversations(projectID)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}
	if convs == nil {
		convs = []models.Conversation{}
	}

	response.OK(c, convs)
}

func (h *ConversationHandler) GetConversation(c *gin.Context) {
	conv, err := h.service.GetConversation(c.Param("id"))
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Conversation not found")
		} else {
			response.InternalServerError(c, err)
		}
		return
	}

	response.OK(c, conv)
}

func (h *ConversationHandler) ListMessages(c *gin.Context) {
	limit := 50
	offset := 0

	messages, err := h.service.ListMessages(c.Param("id"), limit, offset)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}
	if messages == nil {
		messages = []models.ConversationMessage{}
	}

	response.OK(c, messages)
}

func (h *ConversationHandler) AddMessage(c *gin.Context) {
	var req struct {
		Role       string                 `json:"role" binding:"required"`
		Content    string                 `json:"content"`
		ToolCalls  json.RawMessage        `json:"tool_calls,omitempty"`
		Metadata   map[string]interface{} `json:"metadata,omitempty"`
		TokenCount int                    `json:"token_count"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}

	msg, err := h.service.AddMessage(c.Param("id"), req.Role, req.Content, req.Metadata)
	if err != nil {
		response.InternalServerError(c, err)
		return
	}

	response.Created(c, msg)
}

func (h *ConversationHandler) GetMessageContext(c *gin.Context) {
	ctx, err := h.service.GetMessageContext(c.Param("id"))
	if err != nil {
		if response.IsNotFound(err) {
			response.NotFound(c, "Message not found")
		} else {
			response.InternalServerError(c, err)
		}
		return
	}

	response.OK(c, ctx)
}
