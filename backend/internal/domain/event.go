package domain

import (
	"encoding/json"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

// EmitEvent writes a domain event to the outbox within the provided transaction.
// If tx is nil, uses the provided db connection directly.
func EmitEvent(db *gorm.DB, tx *gorm.DB, aggregateType, aggregateID, eventType string, payload any) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	event := models.OutboxEvent{
		AggregateType: aggregateType,
		AggregateID:   aggregateID,
		EventType:     eventType,
		Payload:       payloadJSON,
		Processed:     false,
		RetryCount:    0,
	}

	target := db
	if tx != nil {
		target = tx
	}

	return target.Create(&event).Error
}
