package service

import (
	"encoding/json"
	"fmt"

	"gorm.io/datatypes"
)

func (s *toolExecutionService) executeRagTool(toolName string, params map[string]interface{}, projectID string) (interface{}, error) {
	switch toolName {
	case "rag_search":
		query, _ := params["query"].(string)
		if query == "" {
			return nil, fmt.Errorf("rag.search requires query")
		}
		projectUUID, err := s.resolveProjectUUID(projectID)
		if err != nil {
			return nil, err
		}
		// Embedding is produced by the AI service (provider SDK); Go owns the
		// vector-store access — no circular proxy, no direct DB from Python.
		embedding, err := s.aiService.ProxyEmbed(query)
		if err != nil {
			return nil, fmt.Errorf("embedding failed: %w", err)
		}
		embJSON, err := json.Marshal(embedding)
		if err != nil {
			return nil, err
		}
		topK := 5
		if k, ok := numParam(params, "top_k"); ok && k > 0 {
			topK = int(k)
		}
		chunks, err := s.contextRepo.HybridSearch(projectUUID, query, datatypes.JSON(embJSON), topK, 0.7)
		if err != nil {
			return nil, err
		}
		results := make([]map[string]interface{}, 0, len(chunks))
		for _, ch := range chunks {
			results = append(results, map[string]interface{}{
				"id":           ch.ID,
				"content":      ch.Content,
				"context_type": ch.ContextType,
				"chunk_index":  ch.ChunkIndex,
			})
		}
		return map[string]interface{}{"results": results, "total": len(results)}, nil
	case "rag_get_chunk":
		chunkID := strParam(params, "chunk_id")
		if chunkID == "" {
			return nil, fmt.Errorf("rag.get_chunk requires chunk_id")
		}
		chunk, err := s.contextRepo.FindByID(chunkID)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"id":           chunk.ID,
			"content":      chunk.Content,
			"context_type": chunk.ContextType,
			"chunk_index":  chunk.ChunkIndex,
			"metadata":     chunk.Metadata,
		}, nil
	default:
		return nil, fmt.Errorf("unknown rag tool: %s", toolName)
	}
}
