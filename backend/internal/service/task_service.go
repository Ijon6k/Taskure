package service

import (
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/repository"
)

type CreateTaskInput struct {
	Title       string     `json:"title" binding:"required"`
	ColumnID    string     `json:"column_id" binding:"required"`
	Priority    string     `json:"priority"`
	Description string     `json:"description"`
	DueDate     *time.Time `json:"due_date"`
}

type MoveTaskInput struct {
	ColumnID string `json:"column_id" binding:"required"`
	Position int    `json:"position"`
	Status   string `json:"status"`
}

type AddChecklistInput struct {
	Title string `json:"title" binding:"required"`
}

type TaskService interface {
	CreateTask(projectIDOrPublicID string, input CreateTaskInput) (*models.Task, error)
	GetTask(idOrPublicID string) (*models.Task, error)
	UpdateTask(idOrPublicID string, updates map[string]interface{}) (*models.Task, error)
	MoveTask(idOrPublicID string, input MoveTaskInput) (*models.Task, error)
	DeleteTask(idOrPublicID string) error

	// Checklist
	AddChecklistItem(taskIDOrPublicID string, input AddChecklistInput) (*models.ChecklistItem, error)
	UpdateChecklistItem(id string, updates map[string]interface{}) (*models.ChecklistItem, error)
	DeleteChecklistItem(id string) error

	// Focus Engine
	GetFocusTask() (*FocusScoreResult, error)
}

type taskService struct {
	taskRepo    repository.TaskRepository
	projectRepo repository.ProjectRepository
}

func NewTaskService(taskRepo repository.TaskRepository, projectRepo repository.ProjectRepository) TaskService {
	return &taskService{
		taskRepo:    taskRepo,
		projectRepo: projectRepo,
	}
}

func (s *taskService) CreateTask(projectIDOrPublicID string, input CreateTaskInput) (*models.Task, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	priority := input.Priority
	if priority == "" {
		priority = "medium"
	}

	count, err := s.taskRepo.GetCountByColumnID(input.ColumnID)
	if err != nil {
		return nil, err
	}

	task := models.Task{
		Title:       input.Title,
		Description: input.Description,
		ColumnID:    input.ColumnID,
		ProjectID:   project.ID,
		Priority:    priority,
		Status:      "todo",
		Position:    int(count),
		DueDate:     input.DueDate,
	}

	if err := s.taskRepo.CreateTask(&task); err != nil {
		return nil, err
	}

	return s.taskRepo.FindTask(task.PublicID)
}

func (s *taskService) GetTask(idOrPublicID string) (*models.Task, error) {
	return s.taskRepo.FindTask(idOrPublicID)
}

func (s *taskService) UpdateTask(idOrPublicID string, updates map[string]interface{}) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return nil, err
	}

	if err := s.taskRepo.UpdateTask(task, updates); err != nil {
		return nil, err
	}
	return s.taskRepo.FindTask(task.ID)
}

func (s *taskService) MoveTask(idOrPublicID string, input MoveTaskInput) (*models.Task, error) {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"column_id": input.ColumnID,
		"position":  input.Position,
	}

	if input.Status != "" {
		updates["status"] = input.Status
	}

	if err := s.taskRepo.UpdateTask(task, updates); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *taskService) DeleteTask(idOrPublicID string) error {
	task, err := s.taskRepo.FindTask(idOrPublicID)
	if err != nil {
		return err
	}
	return s.taskRepo.DeleteTask(task)
}

func (s *taskService) AddChecklistItem(taskIDOrPublicID string, input AddChecklistInput) (*models.ChecklistItem, error) {
	task, err := s.taskRepo.FindTask(taskIDOrPublicID)
	if err != nil {
		return nil, err
	}

	count, err := s.taskRepo.GetChecklistCount(task.ID)
	if err != nil {
		return nil, err
	}

	item := models.ChecklistItem{
		Title:       input.Title,
		IsCompleted: false,
		Position:    int(count),
		TaskID:      task.ID,
	}

	if err := s.taskRepo.AddChecklistItem(&item); err != nil {
		return nil, err
	}

	return &item, nil
}

func (s *taskService) UpdateChecklistItem(id string, updates map[string]interface{}) (*models.ChecklistItem, error) {
	item, err := s.taskRepo.FindChecklistItem(id)
	if err != nil {
		return nil, err
	}

	if err := s.taskRepo.UpdateChecklistItem(item, updates); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *taskService) DeleteChecklistItem(id string) error {
	return s.taskRepo.DeleteChecklistItem(id)
}

func (s *taskService) GetFocusTask() (*FocusScoreResult, error) {
	pendingTasks, err := s.taskRepo.GetPendingTasks()
	if err != nil {
		return nil, err
	}

	if len(pendingTasks) == 0 {
		return nil, nil
	}

	projects, err := s.projectRepo.GetAllProjects()
	if err != nil {
		return nil, err
	}

	projectMap := make(map[string]models.Project)
	for _, p := range projects {
		projectMap[p.ID] = p
	}

	results := CalculateFocusTasks(pendingTasks, projectMap)
	if len(results) == 0 {
		return nil, nil
	}

	return &results[0], nil
}
