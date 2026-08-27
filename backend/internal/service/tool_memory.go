package service

import (
	"fmt"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

func (s *toolExecutionService) executeMemoryTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	switch toolName {
	case "memory_get":
		return s.memoryService.GetProjectMemory(projectUUID)
	case "memory_update":
		var updates map[string]interface{}
		if raw, ok := params["updates"]; ok {
			if m, ok := raw.(map[string]interface{}); ok {
				updates = m
			}
		}
		if len(updates) == 0 {
			return nil, fmt.Errorf("memory.update requires an 'updates' object")
		}
		summary, _ := updates["summary"].(string)
		goals := jsonRawMessage(updates, "goals")
		decisions := jsonRawMessage(updates, "decisions")
		blockers := jsonRawMessage(updates, "blockers")
		pinned := jsonRawMessage(updates, "pinned_fields")
		return s.memoryService.UpsertMemory(projectUUID, summary, goals, decisions, blockers, pinned)
	case "memory_history":
		limit := 10
		if l, ok := numParam(params, "limit"); ok && l > 0 {
			limit = int(l)
		}
		return s.memoryService.GetHistory(projectUUID, limit)
	case "memory_save_history":
		snapshot := jsonRawMessage(params, "snapshot")
		trigger, _ := params["trigger_event"].(string)
		return s.memoryService.SaveHistory(projectUUID, snapshot, trigger)
	case "memory_count_events":
		var count int64
		if err := s.db.Model(&models.OutboxEvent{}).
			Where("processed = ?", false).
			Count(&count).Error; err != nil {
			return nil, err
		}
		return map[string]interface{}{"count": count}, nil
	default:
		return nil, fmt.Errorf("unknown memory tool: %s", toolName)
	}
}
