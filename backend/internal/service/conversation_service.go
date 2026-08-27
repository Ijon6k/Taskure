package service

import (
	"encoding/json"
	"errors"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ConversationService interface {
	CreateConversation(projectNanoID string, title string, mode string) (*models.Conversation, error)
	ListConversations(projectNanoID string) ([]models.Conversation, error)
	GetConversation(id string) (*models.Conversation, error)
	AddMessage(conversationID string, role string, content string, metadata map[string]interface{}) (*models.ConversationMessage, error)
	ListMessages(conversationID string, limit int, offset int) ([]models.ConversationMessage, error)
	GetMessageContext(messageID string) (map[string]interface{}, error)
}

type conversationService struct {
	repo        repository.ConversationRepository
	projectRepo repository.ProjectRepository
}

func NewConversationService(repo repository.ConversationRepository, projectRepo repository.ProjectRepository) ConversationService {
	return &conversationService{repo: repo, projectRepo: projectRepo}
}

func (s *conversationService) resolveProjectUUID(nanoID string) (string, error) {
	proj, err := s.projectRepo.FindProjectLight(nanoID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("project not found")
		}
		return "", err
	}
	return proj.ID, nil
}

func (s *conversationService) CreateConversation(projectNanoID string, title string, mode string) (*models.Conversation, error) {
	projectUUID, err := s.resolveProjectUUID(projectNanoID)
	if err != nil {
		return nil, err
	}
	conv := models.Conversation{
		ProjectID: projectUUID,
		Title:     title,
		Mode:      mode,
	}
	if err := s.repo.Create(&conv); err != nil {
		return nil, err
	}
	return &conv, nil
}

func (s *conversationService) ListConversations(projectNanoID string) ([]models.Conversation, error) {
	projectUUID, err := s.resolveProjectUUID(projectNanoID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListByProject(projectUUID)
}

func (s *conversationService) GetConversation(id string) (*models.Conversation, error) {
	return s.repo.FindByID(id)
}

func (s *conversationService) AddMessage(conversationID string, role string, content string, metadata map[string]interface{}) (*models.ConversationMessage, error) {
	var metaJSON datatypes.JSON
	if metadata != nil {
		metaBytes, _ := json.Marshal(metadata)
		metaJSON = datatypes.JSON(metaBytes)
	} else {
		metaJSON = datatypes.JSON("{}")
	}

	msg := models.ConversationMessage{
		ConversationID: conversationID,
		Role:           role,
		Content:        content,
		Metadata:       metaJSON,
	}

	if err := s.repo.CreateMessage(&msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

func (s *conversationService) ListMessages(conversationID string, limit int, offset int) ([]models.ConversationMessage, error) {
	return s.repo.ListMessages(conversationID, limit, offset)
}

func (s *conversationService) GetMessageContext(messageID string) (map[string]interface{}, error) {
	msg, err := s.repo.FindMessageByID(messageID)
	if err != nil {
		return nil, err
	}

	conversation, err := s.repo.FindByID(msg.ConversationID)
	if err != nil {
		return nil, err
	}

	messages, err := s.repo.FindMessagesUpTo(msg.ConversationID, msg.CreatedAt, 20)
	if err != nil {
		return nil, err
	}

	msgs := make([]map[string]interface{}, len(messages))
	for i, m := range messages {
		msgs[i] = map[string]interface{}{
			"id":      m.ID,
			"role":    m.Role,
			"content": m.Content,
		}
	}

	return map[string]interface{}{
		"message":         msg,
		"conversation_id": conversation.ID,
		"project_id":      conversation.ProjectID,
		"context":         msgs,
	}, nil
}
