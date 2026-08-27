package service

import (
	"encoding/json"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type MemoryService interface {
	GetProjectMemory(projectID string) (*models.ProjectMemory, error)
	UpsertMemory(projectID string, summary string, goals json.RawMessage, decisions json.RawMessage, blockers json.RawMessage, pinnedFields json.RawMessage) (*models.ProjectMemory, error)
	SaveHistory(projectID string, snapshot json.RawMessage, triggerEvent string) (*models.MemoryHistory, error)
	GetHistory(projectID string, limit int) ([]models.MemoryHistory, error)
}

type memoryService struct {
	repo repository.MemoryRepository
	db   *gorm.DB
}

func NewMemoryService(db *gorm.DB, repo repository.MemoryRepository) MemoryService {
	return &memoryService{db: db, repo: repo}
}

func (s *memoryService) GetProjectMemory(projectID string) (*models.ProjectMemory, error) {
	return s.repo.FindByProject(projectID)
}

func (s *memoryService) UpsertMemory(projectID string, summary string, goals json.RawMessage, decisions json.RawMessage, blockers json.RawMessage, pinnedFields json.RawMessage) (*models.ProjectMemory, error) {
	existing, err := s.repo.FindByProject(projectID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if existing != nil {
		pinnedFields = mergePinnedFields(existing.PinnedFields, pinnedFields)

		snapshot, _ := json.Marshal(existing)
		if err := s.repo.SaveHistory(datatypes.JSON(snapshot), projectID, "memory.updated"); err != nil {
			return nil, err
		}
	}

	memory := &models.ProjectMemory{
		ProjectID:    projectID,
		Summary:      summary,
		Goals:        datatypes.JSON(goals),
		Decisions:    datatypes.JSON(decisions),
		Blockers:     datatypes.JSON(blockers),
		PinnedFields: datatypes.JSON(pinnedFields),
	}
	if existing != nil {
		memory.ID = existing.ID
		memory.Version = existing.Version + 1
		memory.CreatedAt = existing.CreatedAt
	}

	if err := s.repo.Upsert(memory); err != nil {
		return nil, err
	}

	return memory, nil
}

func mergePinnedFields(existing datatypes.JSON, incoming json.RawMessage) json.RawMessage {
	if len(incoming) == 0 || string(incoming) == "[]" || string(incoming) == "null" {
		return incoming
	}

	var merged []json.RawMessage
	if len(existing) > 0 {
		json.Unmarshal(existing, &merged)
	}

	var newFields []json.RawMessage
	_ = json.Unmarshal(incoming, &newFields)

	seen := make(map[string]bool)
	for _, f := range merged {
		seen[string(f)] = true
	}
	for _, f := range newFields {
		k := string(f)
		if !seen[k] {
			merged = append(merged, f)
			seen[k] = true
		}
	}

	if m, err := json.Marshal(merged); err == nil {
		return m
	}
	return incoming
}

func (s *memoryService) SaveHistory(projectID string, snapshot json.RawMessage, triggerEvent string) (*models.MemoryHistory, error) {
	if err := s.repo.SaveHistory(datatypes.JSON(snapshot), projectID, triggerEvent); err != nil {
		return nil, err
	}
	return nil, nil
}

func (s *memoryService) GetHistory(projectID string, limit int) ([]models.MemoryHistory, error) {
	return s.repo.GetHistory(projectID, limit)
}
