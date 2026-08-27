package service

import (
	"encoding/json"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/datatypes"
)

type JournalService interface {
	CreateEntry(projectID string, eventType string, summary string, metadata json.RawMessage) (*models.JournalEntry, error)
	GetRecentEntries(projectID string, limit int) ([]models.JournalEntry, error)
	SearchEntries(projectID string, query string, limit int) ([]models.JournalEntry, error)
	CreateSynthesis(projectID string, periodStart time.Time, periodEnd time.Time, synthesisText string, milestones json.RawMessage) (*models.JournalSynthesis, error)
	GetSyntheses(projectID string) ([]models.JournalSynthesis, error)
}

type journalService struct {
	repo repository.JournalRepository
}

func NewJournalService(repo repository.JournalRepository) JournalService {
	return &journalService{repo: repo}
}

func (s *journalService) CreateEntry(projectID string, eventType string, summary string, metadata json.RawMessage) (*models.JournalEntry, error) {
	entry := &models.JournalEntry{
		ProjectID: projectID,
		EventType: eventType,
		Summary:   summary,
		Metadata:  datatypes.JSON(metadata),
	}
	if err := s.repo.Create(entry); err != nil {
		return nil, err
	}
	return entry, nil
}

func (s *journalService) GetRecentEntries(projectID string, limit int) ([]models.JournalEntry, error) {
	return s.repo.FindRecent(projectID, limit)
}

func (s *journalService) SearchEntries(projectID string, query string, limit int) ([]models.JournalEntry, error) {
	return s.repo.Search(projectID, query, limit)
}

func (s *journalService) CreateSynthesis(projectID string, periodStart time.Time, periodEnd time.Time, synthesisText string, milestones json.RawMessage) (*models.JournalSynthesis, error) {
	synthesis := &models.JournalSynthesis{
		ProjectID:     projectID,
		PeriodStart:   periodStart,
		PeriodEnd:     periodEnd,
		SynthesisText: synthesisText,
		KeyMilestones: datatypes.JSON(milestones),
	}
	if err := s.repo.CreateSynthesis(synthesis); err != nil {
		return nil, err
	}
	return synthesis, nil
}

func (s *journalService) GetSyntheses(projectID string) ([]models.JournalSynthesis, error) {
	return s.repo.GetSyntheses(projectID, 20)
}
