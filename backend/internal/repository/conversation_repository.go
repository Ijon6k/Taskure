package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

type ConversationRepository interface {
	Create(conv *models.Conversation) error
	ListByProject(projectID string) ([]models.Conversation, error)
	FindByID(id string) (*models.Conversation, error)

	CreateMessage(msg *models.ConversationMessage) error
	ListMessages(conversationID string, limit int, offset int) ([]models.ConversationMessage, error)
	FindMessageByID(id string) (*models.ConversationMessage, error)
	FindMessagesUpTo(conversationID string, beforeTime interface{}, limit int) ([]models.ConversationMessage, error)
}

type conversationRepository struct {
	db *gorm.DB
}

func NewConversationRepository(db *gorm.DB) ConversationRepository {
	return &conversationRepository{db: db}
}

func (r *conversationRepository) Create(conv *models.Conversation) error {
	return r.db.Create(conv).Error
}

func (r *conversationRepository) ListByProject(projectID string) ([]models.Conversation, error) {
	var conversations []models.Conversation
	err := r.db.Where("project_id = ?", projectID).Order("created_at DESC").Find(&conversations).Error
	return conversations, err
}

func (r *conversationRepository) FindByID(id string) (*models.Conversation, error) {
	var conv models.Conversation
	if err := r.db.First(&conv, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &conv, nil
}

func (r *conversationRepository) CreateMessage(msg *models.ConversationMessage) error {
	return r.db.Create(msg).Error
}

func (r *conversationRepository) ListMessages(conversationID string, limit int, offset int) ([]models.ConversationMessage, error) {
	if limit <= 0 {
		limit = 50
	}
	var messages []models.ConversationMessage
	err := r.db.Where("conversation_id = ?", conversationID).
		Order("created_at ASC").Limit(limit).Offset(offset).
		Find(&messages).Error
	return messages, err
}

func (r *conversationRepository) FindMessageByID(id string) (*models.ConversationMessage, error) {
	var msg models.ConversationMessage
	if err := r.db.First(&msg, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *conversationRepository) FindMessagesUpTo(conversationID string, beforeTime interface{}, limit int) ([]models.ConversationMessage, error) {
	var messages []models.ConversationMessage
	err := r.db.Where("conversation_id = ? AND created_at <= ?", conversationID, beforeTime).
		Order("created_at ASC").Limit(limit).Find(&messages).Error
	return messages, err
}
