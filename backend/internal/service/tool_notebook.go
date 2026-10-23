package service

import (
	"fmt"
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

func (s *toolExecutionService) executeNotebookTool(toolName string, params map[string]interface{}) (interface{}, error) {
	switch toolName {
	case "notebook_search":
		projectID := strParam(params, "project_id")
		query, _ := params["query"].(string)
		pages, err := s.notebookService.ListPages(projectID)
		if err != nil {
			return nil, err
		}
		if query != "" {
			filtered := make([]models.NotebookPage, 0, len(pages))
			for _, p := range pages {
				if strings.Contains(strings.ToLower(p.Title), strings.ToLower(query)) {
					filtered = append(filtered, p)
				}
			}
			pages = filtered
		}
		return pages, nil
	case "notebook_get":
		notebookID := strParam(params, "notebook_id")
		if notebookID == "" {
			return nil, fmt.Errorf("notebook.get requires notebook_id")
		}
		return s.notebookService.GetPage(notebookID)
	case "notebook_create":
		projectID := strParam(params, "project_id")
		title := strParam(params, "title")
		content := strParam(params, "content")
		if projectID == "" || title == "" {
			return nil, fmt.Errorf("notebook.create requires project_id and title")
		}
		return s.notebookService.CreatePage(projectID, CreateNotebookPageInput{Title: title, Content: content})
	case "notebook_update":
		notebookID := strParam(params, "notebook_id")
		if notebookID == "" {
			return nil, fmt.Errorf("notebook.update requires notebook_id")
		}
		input := UpdateNotebookPageInput{}
		if v, ok := params["title"]; ok {
			t := v.(string)
			input.Title = &t
		}
		if v, ok := params["content"]; ok {
			c := v.(string)
			input.Content = &c
		}
		return s.notebookService.UpdatePage(notebookID, input)
	case "notebook_delete":
		notebookID := strParam(params, "notebook_id")
		if notebookID == "" {
			return nil, fmt.Errorf("notebook.delete requires notebook_id")
		}
		if err := s.notebookService.DeletePage(notebookID); err != nil {
			return nil, err
		}
		return map[string]interface{}{"status": "deleted", "notebook_id": notebookID}, nil
	default:
		return nil, fmt.Errorf("unknown notebook tool: %s", toolName)
	}
}
