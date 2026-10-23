package service

import (
	"encoding/json"
	"fmt"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/datatypes"
)

func (s *toolExecutionService) executeIndexTool(params map[string]interface{}) (interface{}, error) {
	projectID, _ := params["project_id"].(string)
	if projectID == "" {
		return nil, fmt.Errorf("index requires project_id")
	}
	projectUUID, err := s.resolveProjectUUID(projectID)
	if err != nil {
		return nil, err
	}

	sourceType, _ := params["source_type"].(string)
	sourceID, _ := params["source_id"].(string)
	rawChunks, ok := params["chunks"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("index requires a 'chunks' array")
	}

	chunks := make([]models.ProjectContext, 0, len(rawChunks))
	for i, raw := range rawChunks {
		chunk, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		content, _ := chunk["content"].(string)
		embedding, _ := json.Marshal(chunk["embedding"])
		metadata, _ := json.Marshal(chunk["metadata"])
		chunks = append(chunks, models.ProjectContext{
			ProjectID:   projectUUID,
			Content:     content,
			ContextType: sourceType,
			ChunkIndex:  i,
			TotalChunks: len(rawChunks),
			Embedding:   datatypes.JSON(embedding),
			Metadata:    datatypes.JSON(metadata),
		})
	}
	if len(chunks) == 0 {
		return map[string]interface{}{"indexed": 0}, nil
	}

	if err := s.contextRepo.BatchCreate(chunks); err != nil {
		return nil, err
	}
	return map[string]interface{}{"indexed": len(chunks), "source_id": sourceID}, nil
}
