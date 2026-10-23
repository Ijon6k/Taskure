package service

import (
	"fmt"
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/util"
)

func (s *toolExecutionService) executeTaskTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch toolName {
	case "task_search":
		query, _ := params["query"].(string)
		return s.searchTasks(projectID, query)
	case "task_get":
		taskID := strParam(params, "task_id")
		if taskID == "" {
			return nil, fmt.Errorf("task.get requires task_id")
		}
		return s.taskService.GetTask(taskID)
	case "task_create":
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		input := CreateTaskInput{
			Title:       strParam(params, "title"),
			Description: strParam(params, "description"),
			ColumnID:    strParam(params, "column_id"),
			Priority:    strParam(params, "priority"),
		}
		if input.Title == "" {
			return nil, fmt.Errorf("task.create requires title")
		}
		if input.ColumnID == "" {
			// Default to the first column of the project.
			project, err := s.projectService.GetProjectBoard(projectUUID)
			if err != nil {
				return nil, err
			}
			if len(project.Columns) == 0 {
				return nil, fmt.Errorf("project has no columns; create a column first")
			}
			input.ColumnID = project.Columns[0].ID
		} else if !util.IsUUID(input.ColumnID) {
			// LLMs often pass the column NAME instead of its UUID — resolve it
			// against the project's columns so task.create never 500s.
			project, err := s.projectService.GetProjectBoard(projectUUID)
			if err != nil {
				return nil, err
			}
			resolved := ""
			for _, col := range project.Columns {
				if strings.EqualFold(col.Name, input.ColumnID) {
					resolved = col.ID
					break
				}
			}
			if resolved == "" {
				return nil, fmt.Errorf("column %q not found in project", input.ColumnID)
			}
			input.ColumnID = resolved
		}
		task, err := s.taskService.CreateTask(projectUUID, input)
		if err != nil {
			return nil, err
		}
		// Create any inline subtasks/checklist items if provided
		if rawSubtasks, ok := params["subtasks"].([]interface{}); ok && len(rawSubtasks) > 0 {
			for _, st := range rawSubtasks {
				stTitle := ""
				if str, ok := st.(string); ok {
					stTitle = str
				} else if m, ok := st.(map[string]interface{}); ok {
					if t, ok := m["title"].(string); ok {
						stTitle = t
					}
				}
				if strings.TrimSpace(stTitle) != "" {
					_, _ = s.taskService.AddChecklistItem(task.ID, AddChecklistInput{Title: strings.TrimSpace(stTitle)})
				}
			}
		}
		return task, nil
	case "task_add_subtask":
		taskID := strParam(params, "task_id")
		title := strParam(params, "title")
		if taskID == "" || title == "" {
			return nil, fmt.Errorf("task.add_subtask requires task_id and title")
		}
		return s.taskService.AddChecklistItem(taskID, AddChecklistInput{Title: title})
	case "task_update_subtask":
		subtaskID := strParam(params, "subtask_id")
		if subtaskID == "" {
			return nil, fmt.Errorf("task.update_subtask requires subtask_id")
		}
		updates := map[string]interface{}{}
		if v, ok := params["title"]; ok && v != nil {
			updates["title"] = v
		}
		if v, ok := params["is_completed"]; ok && v != nil {
			updates["is_completed"] = v
		}
		if len(updates) == 0 {
			return nil, fmt.Errorf("task.update_subtask requires title or is_completed to update")
		}
		return s.taskService.UpdateChecklistItem(subtaskID, updates)
	case "task_delete_subtask":
		subtaskID := strParam(params, "subtask_id")
		if subtaskID == "" {
			return nil, fmt.Errorf("task.delete_subtask requires subtask_id")
		}
		if err := s.taskService.DeleteChecklistItem(subtaskID); err != nil {
			return nil, err
		}
		return map[string]string{"status": "deleted", "subtask_id": subtaskID}, nil
	case "task_update":
		taskID := strParam(params, "task_id")
		if taskID == "" {
			return nil, fmt.Errorf("task.update requires task_id")
		}
		updates := map[string]interface{}{}
		if v, ok := params["title"]; ok && v != nil {
			updates["title"] = v
		}
		if v, ok := params["description"]; ok && v != nil {
			updates["description"] = v
		}
		if v, ok := params["priority"]; ok && v != nil {
			updates["priority"] = v
		}
		if len(updates) == 0 {
			return nil, fmt.Errorf("task.update requires at least one field to update")
		}
		return s.taskService.UpdateTask(taskID, updates)
	case "task_move":
		taskID := strParam(params, "task_id")
		targetColumnID := strParam(params, "target_column_id")
		if taskID == "" || targetColumnID == "" {
			return nil, fmt.Errorf("task.move requires task_id and target_column_id")
		}
		return s.taskService.MoveTask(taskID, MoveTaskInput{ColumnID: targetColumnID})
	case "task_delete":
		taskID := strParam(params, "task_id")
		if taskID == "" {
			return nil, fmt.Errorf("task.delete requires task_id")
		}
		return map[string]string{"status": "deleted"}, s.taskService.DeleteTask(taskID)
	default:
		return nil, fmt.Errorf("unknown task tool: %s", toolName)
	}
}

func (s *toolExecutionService) searchTasks(projectID string, query string) ([]interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}
	var tasks []models.Task
	tx := s.db.Where("project_id = ?", projectUUID)
	if query != "" {
		tx = tx.Where("title ILIKE ? OR description ILIKE ?", "%"+query+"%", "%"+query+"%")
	}
	err = tx.Order("position asc").Limit(20).Find(&tasks).Error
	if err != nil {
		return nil, err
	}

	result := make([]interface{}, len(tasks))
	for i := range tasks {
		result[i] = tasks[i]
	}
	return result, nil
}
