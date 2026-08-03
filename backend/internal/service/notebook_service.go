package service

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
)

// DefaultNotebookTitle is used when a page is created without a title.
const DefaultNotebookTitle = "Untitled"

type CreateNotebookPageInput struct {
	Title string `json:"title"`
}

type UpdateNotebookPageInput struct {
	Title    *string `json:"title,omitempty"`
	Content  *string `json:"content,omitempty"`
	IsPinned *bool   `json:"is_pinned,omitempty"`
	Position *int    `json:"position,omitempty"`
}

type NotebookService interface {
	CreatePage(projectIDOrPublicID string, input CreateNotebookPageInput) (*models.NotebookPage, error)
	ListPages(projectIDOrPublicID string) ([]models.NotebookPage, error)
	GetPage(id string) (*models.NotebookPage, error)
	UpdatePage(id string, input UpdateNotebookPageInput) (*models.NotebookPage, error)
	DeletePage(id string) error
}

type notebookService struct {
	pageRepo    repository.NotebookRepository
	projectRepo repository.ProjectRepository
}

// NewNotebookService creates the notebook page service.
func NewNotebookService(
	pageRepo repository.NotebookRepository,
	projectRepo repository.ProjectRepository,
) NotebookService {
	return &notebookService{
		pageRepo:    pageRepo,
		projectRepo: projectRepo,
	}
}

// CreatePage creates a page in a project, appending it to the end.
func (s *notebookService) CreatePage(projectIDOrPublicID string, input CreateNotebookPageInput) (*models.NotebookPage, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}

	count, err := s.pageRepo.CountByProject(project.ID)
	if err != nil {
		return nil, err
	}

	title := input.Title
	if title == "" {
		title = DefaultNotebookTitle
	}

	page := models.NotebookPage{
		Title:     title,
		Position:  int(count),
		ProjectID: project.ID,
	}

	if err := s.pageRepo.Create(&page); err != nil {
		return nil, err
	}
	return &page, nil
}

// ListPages returns page summaries for a project (content excluded).
func (s *notebookService) ListPages(projectIDOrPublicID string) ([]models.NotebookPage, error) {
	project, err := s.projectRepo.FindProject(projectIDOrPublicID)
	if err != nil {
		return nil, err
	}
	return s.pageRepo.ListByProject(project.ID)
}

// GetPage returns a single page with its markdown content.
func (s *notebookService) GetPage(id string) (*models.NotebookPage, error) {
	return s.pageRepo.FindByID(id)
}

// UpdatePage applies partial updates to a page.
func (s *notebookService) UpdatePage(id string, input UpdateNotebookPageInput) (*models.NotebookPage, error) {
	page, err := s.pageRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Content != nil {
		updates["content"] = *input.Content
	}
	if input.IsPinned != nil {
		updates["is_pinned"] = *input.IsPinned
	}
	if input.Position != nil {
		updates["position"] = *input.Position
	}

	if len(updates) == 0 {
		return page, nil
	}

	if err := s.pageRepo.Update(page, updates); err != nil {
		return nil, err
	}
	return page, nil
}

// DeletePage removes a page.
func (s *notebookService) DeletePage(id string) error {
	return s.pageRepo.Delete(id)
}
