package service

import (
	"fmt"
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

// GeneratePlanPhase is one phase/epic of a generated kanban plan.
type GeneratePlanPhase struct {
	Name  string             `json:"name"`
	Color string             `json:"color,omitempty"`
	Tasks []GeneratePlanTask `json:"tasks"`
}

type GeneratePlanTask struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Priority    string   `json:"priority"`
	Subtasks    []string `json:"subtasks,omitempty"`
}

var defaultPhaseColors = []string{
	"#8B5CF6", // Violet / Purple (Phase 1: Architecture & Setup)
	"#3B82F6", // Blue (Phase 2: Core Development)
	"#10B981", // Emerald / Green (Phase 3: Features & Services)
	"#F59E0B", // Amber / Orange (Phase 4: Security & Validation)
	"#EC4899", // Rose / Pink (Phase 5: Testing & QA)
	"#06B6D4", // Cyan (Phase 6: Deployment & Release)
}

// executeGeneratePlanTool creates the phases (columns) and tasks of a kanban
// plan in one call. The LLM outputs a compact plan_dsl (COL:/TASK:/SUB: lines) or a
// JSON phases array; Go validates and persists it transactionally — the
// "compact plan → Go builds" pattern.
func (s *toolExecutionService) executeGeneratePlanTool(params map[string]interface{}, projectID string) (interface{}, error) {
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}

	phases := parsePlanDSL(params)

	// Fallback to JSON phases array if DSL was not provided or produced 0 phases.
	if len(phases) == 0 {
		if rawPhases, ok := params["phases"].([]interface{}); ok && len(rawPhases) > 0 {
			for _, raw := range rawPhases {
				phase, ok := raw.(map[string]interface{})
				if !ok {
					continue
				}
				name, _ := phase["name"].(string)
				if name == "" {
					continue
				}
				color, _ := phase["color"].(string)
				p := GeneratePlanPhase{Name: name, Color: color}
				if rawTasks, ok := phase["tasks"].([]interface{}); ok {
					for _, rt := range rawTasks {
						tm, ok := rt.(map[string]interface{})
						if !ok {
							continue
						}
						title, _ := tm["title"].(string)
						if title == "" {
							continue
						}
						desc, _ := tm["description"].(string)
						prio, _ := tm["priority"].(string)
						if prio == "" {
							prio = "medium"
						}
						var subtasks []string
						if rawSubs, ok := tm["subtasks"].([]interface{}); ok {
							for _, rs := range rawSubs {
								if sStr, ok := rs.(string); ok && strings.TrimSpace(sStr) != "" {
									subtasks = append(subtasks, strings.TrimSpace(sStr))
								}
							}
						}
						p.Tasks = append(p.Tasks, GeneratePlanTask{
							Title:       title,
							Description: desc,
							Priority:    prio,
							Subtasks:    subtasks,
						})
					}
				}
				if len(p.Tasks) > 0 {
					phases = append(phases, p)
				}
			}
		}
	}

	if len(phases) == 0 {
		return nil, fmt.Errorf("kanban.generate_plan: no valid phases/tasks found in plan_dsl or phases")
	}

	// Load existing columns to reuse matches (by name) instead of duplicating.
	project, err := s.projectService.GetProjectBoard(projectUUID)
	if err != nil {
		return nil, err
	}
	existingByName := map[string]models.Column{}
	for _, col := range project.Columns {
		existingByName[strings.ToLower(col.Name)] = col
	}

	createdColumns := 0
	createdTasks := 0
	createdSubtasks := 0
	err = s.db.Transaction(func(tx *gorm.DB) error {
		nextPos := len(project.Columns)
		for phaseIdx, phase := range phases {
			col, exists := existingByName[strings.ToLower(phase.Name)]
			if !exists {
				colColor := phase.Color
				if colColor == "" {
					colColor = defaultPhaseColors[phaseIdx%len(defaultPhaseColors)]
				}
				col = models.Column{
					Name:      phase.Name,
					Color:     colColor,
					Behavior:  models.ColumnBehaviorActive,
					Position:  nextPos,
					ProjectID: projectUUID,
				}
				if err := tx.Create(&col).Error; err != nil {
					return err
				}
				existingByName[strings.ToLower(phase.Name)] = col
				nextPos++
				createdColumns++
			}

			for _, t := range phase.Tasks {
				task := models.Task{
					Title:       t.Title,
					Description: t.Description,
					Priority:    t.Priority,
					ColumnID:    col.ID,
					ProjectID:   projectUUID,
					Status:      "todo",
				}
				if err := tx.Create(&task).Error; err != nil {
					return err
				}
				createdTasks++

				// Create checklist subtasks
				for pos, st := range t.Subtasks {
					if strings.TrimSpace(st) == "" {
						continue
					}
					item := models.ChecklistItem{
						Title:       strings.TrimSpace(st),
						IsCompleted: false,
						Position:    pos,
						TaskID:      task.ID,
					}
					if err := tx.Create(&item).Error; err != nil {
						return err
					}
					createdSubtasks++
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"status":           "created",
		"columns_created":  createdColumns,
		"tasks_created":    createdTasks,
		"subtasks_created": createdSubtasks,
		"phases":           len(phases),
	}, nil
}

// parsePlanDSL parses the compact line-based DSL:
//
//	COL: Phase Name | #Color
//	TASK: priority | title | description
//	SUB: Subtask Checklist Item
func parsePlanDSL(params map[string]interface{}) []GeneratePlanPhase {
	dslStr, _ := params["plan_dsl"].(string)
	if strings.TrimSpace(dslStr) == "" {
		return nil
	}

	var phases []GeneratePlanPhase
	var currentPhase *GeneratePlanPhase
	for _, line := range strings.Split(dslStr, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "COL:") {
			if currentPhase != nil && len(currentPhase.Tasks) > 0 {
				phases = append(phases, *currentPhase)
			}
			colStr := strings.TrimSpace(strings.TrimPrefix(line, "COL:"))
			parts := strings.Split(colStr, "|")
			colName := strings.TrimSpace(parts[0])
			colColor := ""
			if len(parts) >= 2 {
				colColor = strings.TrimSpace(parts[1])
			}
			currentPhase = &GeneratePlanPhase{Name: colName, Color: colColor, Tasks: []GeneratePlanTask{}}
		} else if strings.HasPrefix(line, "TASK:") && currentPhase != nil {
			taskStr := strings.TrimSpace(strings.TrimPrefix(line, "TASK:"))
			parts := strings.Split(taskStr, "|")
			prio := "medium"
			title := ""
			desc := ""
			if len(parts) >= 1 {
				if p := strings.TrimSpace(parts[0]); p != "" {
					prio = p
				}
			}
			if len(parts) >= 2 {
				title = strings.TrimSpace(parts[1])
			}
			if len(parts) >= 3 {
				desc = strings.TrimSpace(parts[2])
			}
			if title != "" {
				currentPhase.Tasks = append(currentPhase.Tasks, GeneratePlanTask{
					Title:       title,
					Description: desc,
					Priority:    prio,
					Subtasks:    []string{},
				})
			}
		} else if (strings.HasPrefix(line, "SUB:") || strings.HasPrefix(line, "- [ ] ") || strings.HasPrefix(line, "- ")) && currentPhase != nil && len(currentPhase.Tasks) > 0 {
			subStr := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(line, "SUB:"), "- [ ] "), "- "))
			if subStr != "" {
				lastIdx := len(currentPhase.Tasks) - 1
				currentPhase.Tasks[lastIdx].Subtasks = append(currentPhase.Tasks[lastIdx].Subtasks, subStr)
			}
		}
	}
	if currentPhase != nil && len(currentPhase.Tasks) > 0 {
		phases = append(phases, *currentPhase)
	}
	return phases
}
