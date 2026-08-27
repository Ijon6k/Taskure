package service

import (
	"fmt"
	"time"
)

func (s *toolExecutionService) executeJournalTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	switch toolName {
	case "journal_get_recent":
		limit := 10
		if l, ok := numParam(params, "limit"); ok && l > 0 {
			limit = int(l)
		}
		return s.journalService.GetRecentEntries(projectUUID, limit)
	case "journal_get_synthesis":
		return s.journalService.GetSyntheses(projectUUID)
	case "journal_search":
		query, _ := params["query"].(string)
		limit := 30
		if l, ok := numParam(params, "limit"); ok && l > 0 {
			limit = int(l)
		}
		return s.journalService.SearchEntries(projectUUID, query, limit)
	case "journal_create_entry":
		eventType, _ := params["event_type"].(string)
		summary, _ := params["summary"].(string)
		meta := jsonRawMessage(params, "metadata")
		return s.journalService.CreateEntry(projectUUID, eventType, summary, meta)
	case "journal_create_synthesis":
		ps, _ := params["period_start"].(string)
		pe, _ := params["period_end"].(string)
		st, _ := params["synthesis_text"].(string)
		ms := jsonRawMessage(params, "key_milestones")
		periodStart, _ := time.Parse(time.RFC3339, ps)
		periodEnd, _ := time.Parse(time.RFC3339, pe)
		return s.journalService.CreateSynthesis(projectUUID, periodStart, periodEnd, st, ms)
	default:
		return nil, fmt.Errorf("unknown journal tool: %s", toolName)
	}
}
