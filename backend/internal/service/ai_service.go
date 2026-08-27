package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type AIService interface {
	ProxyChat(messages []ChatMessage, mode string, projectID string, providerConfig map[string]string) (*http.Response, error)
	ProxySearch(query string, projectID string) (*http.Response, error)
	ProxyEmbed(text string) ([]float64, error)
	GetContextBudget(projectID string) (map[string]interface{}, error)
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type aiService struct {
	client  *http.Client
	baseURL string
}

func NewAIService(aiServiceURL string) AIService {
	if aiServiceURL == "" {
		aiServiceURL = "http://ai:5000"
	}
	return &aiService{
		client:  &http.Client{Timeout: 120 * time.Second},
		baseURL: aiServiceURL,
	}
}

func (s *aiService) ProxyChat(messages []ChatMessage, mode string, projectID string, providerConfig map[string]string) (*http.Response, error) {
	body := map[string]interface{}{
		"messages":   messages,
		"project_id": projectID,
	}
	for k, v := range providerConfig {
		body[k] = v
	}

	url := fmt.Sprintf("%s/api/ai/%s", s.baseURL, mode)
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	return s.client.Do(req)
}

func (s *aiService) ProxySearch(query string, projectID string) (*http.Response, error) {
	body := map[string]interface{}{
		"query":      query,
		"project_id": projectID,
	}

	url := fmt.Sprintf("%s/api/ai/rag/search", s.baseURL)
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	return s.client.Do(req)
}

func (s *aiService) ProxyEmbed(text string) ([]float64, error) {
	body := map[string]interface{}{"text": text}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/api/ai/embedding/generate", s.baseURL)
	req, err := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("embedding service returned status %d: %s", resp.StatusCode, string(data))
	}

	var result struct {
		Embedding []float64 `json:"embedding"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Embedding, nil
}

func (s *aiService) GetContextBudget(projectID string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/api/ai/context-budget?project_id=%s", s.baseURL, projectID)
	resp, err := s.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("ai service returned status %d: %s", resp.StatusCode, string(data))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}
