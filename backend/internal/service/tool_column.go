package service

import (
	"fmt"
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

func (s *toolExecutionService) executeColumnTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch toolName {
	case "column_search":
		query, _ := params["query"].(string)
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		project, err := s.projectService.GetProjectBoard(projectUUID)
		if err != nil {
			return nil, err
		}
		cols := project.Columns
		if query != "" {
			filtered := make([]models.Column, 0, len(cols))
			for _, c := range cols {
				if strings.Contains(strings.ToLower(c.Name), strings.ToLower(query)) {
					filtered = append(filtered, c)
				}
			}
			cols = filtered
		}
		return cols, nil
	case "column_get":
		columnID := strParam(params, "column_id")
		if columnID == "" {
			return nil, fmt.Errorf("column.get requires column_id")
		}
		return s.columnService.GetColumn(columnID)
	case "column_create":
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		name := strParam(params, "name")
		color := strParam(params, "color")
		if name == "" {
			return nil, fmt.Errorf("column.create requires name")
		}
		return s.columnService.CreateColumn(projectUUID, CreateColumnInput{Name: name, Color: color})
	case "column_update":
		columnID := strParam(params, "column_id")
		if columnID == "" {
			return nil, fmt.Errorf("column.update requires column_id")
		}
		updates := map[string]interface{}{}
		if v, ok := params["name"]; ok && v != nil {
			updates["name"] = v
		}
		if v, ok := params["color"]; ok && v != nil {
			updates["color"] = v
		}
		if v, ok := params["position"]; ok && v != nil {
			updates["position"] = v
		}
		if len(updates) == 0 {
			return nil, fmt.Errorf("column.update requires a field to update")
		}
		return s.columnService.UpdateColumn(columnID, updates)
	case "column_delete":
		columnID := strParam(params, "column_id")
		if columnID == "" {
			return nil, fmt.Errorf("column.delete requires column_id")
		}
		return map[string]string{"status": "deleted"}, s.columnService.DeleteColumn(columnID)
	default:
		return nil, fmt.Errorf("unknown column tool: %s", toolName)
	}
}
