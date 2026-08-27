package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ContextRepository interface {
	BatchCreate(chunks []models.ProjectContext) error
	FindByID(id string) (*models.ProjectContext, error)
	HybridSearch(projectID string, query string, embedding datatypes.JSON, topK int, threshold float64) ([]models.ProjectContext, error)
}

type contextRepository struct {
	db *gorm.DB
}

func NewContextRepository(db *gorm.DB) ContextRepository {
	return &contextRepository{db: db}
}

func (r *contextRepository) BatchCreate(chunks []models.ProjectContext) error {
	if len(chunks) == 0 {
		return nil
	}
	return r.db.CreateInBatches(chunks, len(chunks)).Error
}

func (r *contextRepository) FindByID(id string) (*models.ProjectContext, error) {
	var chunk models.ProjectContext
	if err := r.db.Where("id = ? OR public_id = ?", id, id).First(&chunk).Error; err != nil {
		return nil, err
	}
	return &chunk, nil
}

// HybridSearch runs the same fused vector + FTS query the AI service used to
// run directly against Postgres. Now the DB access lives in Go; callers pass the
// query embedding (produced by the AI service's provider SDK).
func (r *contextRepository) HybridSearch(
	projectID string,
	query string,
	embedding datatypes.JSON,
	topK int,
	threshold float64,
) ([]models.ProjectContext, error) {
	if topK <= 0 {
		topK = 5
	}
	if threshold <= 0 {
		threshold = 0.7
	}

	var chunks []models.ProjectContext
	// vector_weight 0.7 / keyword_weight 0.3 — mirrors the AI service's fusion.
	err := r.db.Raw(`
		SELECT * FROM (
			SELECT pc.*,
				(0.7 * (1 - (pc.embedding <=> ?::vector)) +
				 0.3 * COALESCE(ts_rank(to_tsvector('english', pc.content),
				                        plainto_tsquery('english', ?)), 0)) AS fusion_score
			FROM project_contexts pc
			WHERE pc.project_id = ? AND pc.deleted_at IS NULL
			  AND (1 - (pc.embedding <=> ?::vector)) >= ?
		) fused
		ORDER BY fusion_score DESC
		LIMIT ?`,
		embedding, query, projectID, embedding, threshold, topK,
	).Scan(&chunks).Error
	if err != nil {
		return nil, err
	}
	return chunks, nil
}

// ContextChunkInput is the typed input for batch context indexing.
type ContextChunkInput struct {
	Content   string         `json:"content"`
	Embedding datatypes.JSON `json:"embedding"`
	Metadata  datatypes.JSON `json:"metadata"`
}
