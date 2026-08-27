package service

import (
	"fmt"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func (s *toolExecutionService) executePlanTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	switch toolName {
	case "plan_get_cache":
		key := strParam(params, "cache_key")
		if key == "" {
			key = "default"
		}
		var cache models.PlanCache
		err := s.db.Where("project_id = ? AND cache_key = ? AND expires_at > ?", projectUUID, key, time.Now()).
			First(&cache).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, fmt.Errorf("no cached plan found for this project")
			}
			return nil, err
		}
		return cache, nil
	case "plan_save_cache":
		key := strParam(params, "cache_key")
		if key == "" {
			key = "default"
		}
		result := jsonRawMessage(params, "plan")
		now := time.Now()
		cache := models.PlanCache{
			CacheKey:         key,
			ProjectID:        projectUUID,
			RequestHash:      "tool",
			ProjectStateHash: "tool",
			Result:           datatypes.JSON(result),
			ExpiresAt:        now.Add(24 * time.Hour),
		}
		// Upsert: delete any existing cache for this project+key, then insert.
		if err := s.db.Where("project_id = ? AND cache_key = ?", projectUUID, key).
			Delete(&models.PlanCache{}).Error; err != nil {
			return nil, err
		}
		if err := s.db.Create(&cache).Error; err != nil {
			return nil, err
		}
		return cache, nil
	default:
		return nil, fmt.Errorf("unknown plan tool: %s", toolName)
	}
}
