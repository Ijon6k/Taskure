package service

import (
	"log"

	"github.com/Ijon6k/Taskure/apps/api/internal/domain"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/gorm"
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
	db          *gorm.DB
	pageRepo    repository.NotebookRepository
	projectRepo repository.ProjectRepository
}

// NewNotebookService creates the notebook page service.
func NewNotebookService(
	db *gorm.DB,
	pageRepo repository.NotebookRepository,
	projectRepo repository.ProjectRepository,
) NotebookService {
	return &notebookService{
		db:          db,
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

	if err := domain.EmitEvent(s.db, nil, "notebook", page.ID, "notebook.updated", map[string]string{"notebook_id": page.ID, "page_title": page.Title, "project_id": project.ID}); err != nil {
		log.Printf("WARNING: failed to emit notebook.updated event: %v", err)
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

	title := page.Title
	if t, ok := updates["title"].(string); ok {
		title = t
	}
	if err := domain.EmitEvent(s.db, nil, "notebook", page.ID, "notebook.section_changed", map[string]string{"page_id": page.ID, "page_title": title, "project_id": page.ProjectID}); err != nil {
		log.Printf("WARNING: failed to emit notebook.section_changed event: %v", err)
	}

	return page, nil
}

// DeletePage removes a page.
func (s *notebookService) DeletePage(id string) error {
	page, err := s.pageRepo.FindByID(id)
	if err != nil {
		return err
	}

	if err := s.pageRepo.Delete(id); err != nil {
		return err
	}

	if err := domain.EmitEvent(s.db, nil, "notebook", page.ID, "notebook.updated", map[string]string{"page_id": page.ID, "page_title": page.Title, "project_id": page.ProjectID}); err != nil {
		log.Printf("WARNING: failed to emit notebook.updated event: %v", err)
	}

	return nil
}
