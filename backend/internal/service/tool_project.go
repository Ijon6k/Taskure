package service

import (
	"fmt"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

func (s *toolExecutionService) executeProjectTool(toolName string, params map[string]interface{}) (interface{}, error) {
	switch toolName {
	case "project_search":
		query, _ := params["query"].(string)
		return s.projectService.ListProjects("", query, false)
	case "project_get":
		projectID := strParam(params, "project_id")
		if projectID == "" {
			return nil, fmt.Errorf("project.get requires project_id")
		}
		return s.projectService.GetProjectOverview(projectID)
	case "project_get_board":
		projectID := strParam(params, "project_id")
		if projectID == "" {
			return nil, fmt.Errorf("project.get_board requires project_id")
		}
		return s.projectService.GetProjectBoard(projectID)
	case "project_update":
		projectID := strParam(params, "project_id")
		if projectID == "" {
			return nil, fmt.Errorf("project.update requires project_id")
		}
		input := &UpdateProjectInput{}
		if v, ok := params["name"]; ok {
			name := v.(string)
			input.Name = &name
		}
		if v, ok := params["description"]; ok {
			desc := v.(string)
			input.Description = &desc
		}
		return s.projectService.UpdateProject(projectID, input)
	case "project_clear_board":
		projectID := strParam(params, "project_id")
		if projectID == "" {
			return nil, fmt.Errorf("project.clear_board requires project_id")
		}
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		var tasksDeleted int64
		var colsDeleted int64
		err = s.db.Transaction(func(tx *gorm.DB) error {
			res1 := tx.Where("project_id = ?", projectUUID).Delete(&models.Task{})
			if res1.Error != nil {
				return res1.Error
			}
			tasksDeleted = res1.RowsAffected

			res2 := tx.Where("project_id = ?", projectUUID).Delete(&models.Column{})
			if res2.Error != nil {
				return res2.Error
			}
			colsDeleted = res2.RowsAffected
			return nil
		})
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"status":          "cleared",
			"tasks_deleted":   tasksDeleted,
			"columns_deleted": colsDeleted,
		}, nil
	default:
		return nil, fmt.Errorf("unknown project tool: %s", toolName)
	}
}
