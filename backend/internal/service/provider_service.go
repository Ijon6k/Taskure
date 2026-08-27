package service

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"gorm.io/datatypes"
)

type ProviderService interface {
	List() ([]models.ProviderConfig, error)
	Get(id string) (*models.ProviderConfig, error)
	GetDecrypted(id string) (provider string, apiKey string, endpoint string, model string, err error)
	Create(req CreateProviderRequest) (*models.ProviderConfig, error)
	Update(id string, req UpdateProviderRequest) (*models.ProviderConfig, error)
	Delete(id string) error
	Test(req TestProviderRequest) error
}

type CreateProviderRequest struct {
	Provider  string          `json:"provider" binding:"required"`
	APIKey    string          `json:"api_key" binding:"required"`
	Endpoint  string          `json:"endpoint,omitempty"`
	Model     string          `json:"model" binding:"required"`
	Config    json.RawMessage `json:"config,omitempty"`
	IsDefault bool            `json:"is_default,omitempty"`
}

type UpdateProviderRequest struct {
	Provider  *string         `json:"provider,omitempty"`
	APIKey    *string         `json:"api_key,omitempty"`
	Endpoint  *string         `json:"endpoint,omitempty"`
	Model     *string         `json:"model,omitempty"`
	Config    json.RawMessage `json:"config,omitempty"`
	IsDefault *bool           `json:"is_default,omitempty"`
}

type TestProviderRequest struct {
	Provider string `json:"provider" binding:"required"`
	APIKey   string `json:"api_key" binding:"required"`
	Endpoint string `json:"endpoint,omitempty"`
	Model    string `json:"model,omitempty"`
}

type providerService struct {
	repo         repository.ProviderRepository
	key          []byte
	aiServiceURL string
}

func NewProviderService(repo repository.ProviderRepository, encryptionKey string) (ProviderService, error) {
	return NewProviderServiceWithAI(repo, encryptionKey, "")
}

func NewProviderServiceWithAI(repo repository.ProviderRepository, encryptionKey, aiServiceURL string) (ProviderService, error) {
	if encryptionKey == "" {
		encryptionKey = "dev-encryption-key-32-bytes!!"
		log.Println("WARNING: ENCRYPTION_KEY not set, using development fallback key — provider operations will not be secure")
	}
	hash := sha256.Sum256([]byte(encryptionKey))
	if aiServiceURL == "" {
		aiServiceURL = "http://ai:5000"
	}
	return &providerService{repo: repo, key: hash[:], aiServiceURL: aiServiceURL}, nil
}

func (s *providerService) List() ([]models.ProviderConfig, error) {
	configs, err := s.repo.List()
	if err != nil {
		return nil, err
	}
	for i := range configs {
		configs[i].APIKeyEncrypted = ""
	}
	return configs, nil
}

func (s *providerService) Get(id string) (*models.ProviderConfig, error) {
	cfg, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	cfg.APIKeyEncrypted = ""
	return cfg, nil
}

func (s *providerService) GetDecrypted(id string) (string, string, string, string, error) {
	cfg, err := s.repo.FindByID(id)
	if err != nil {
		return "", "", "", "", err
	}
	key, err := s.decryptAPIKey(cfg.APIKeyEncrypted)
	if err != nil {
		return "", "", "", "", fmt.Errorf("failed to decrypt API key: %w", err)
	}
	return cfg.Provider, key, cfg.Endpoint, cfg.Model, nil
}

func (s *providerService) Create(req CreateProviderRequest) (*models.ProviderConfig, error) {
	encrypted, err := s.encryptAPIKey(req.APIKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt API key: %w", err)
	}

	cfg := models.ProviderConfig{
		Provider:        req.Provider,
		APIKeyEncrypted: encrypted,
		Endpoint:        req.Endpoint,
		Model:           req.Model,
		IsDefault:       req.IsDefault,
	}
	if req.Config != nil {
		cfg.Config = datatypes.JSON(req.Config)
	}

	if err := s.repo.Create(&cfg); err != nil {
		return nil, err
	}
	cfg.APIKeyEncrypted = ""
	return &cfg, nil
}

func (s *providerService) Update(id string, req UpdateProviderRequest) (*models.ProviderConfig, error) {
	cfg, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if req.Provider != nil {
		updates["provider"] = *req.Provider
	}
	if req.APIKey != nil {
		encrypted, err := s.encryptAPIKey(*req.APIKey)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt API key: %w", err)
		}
		updates["api_key_encrypted"] = encrypted
	}
	if req.Endpoint != nil {
		updates["endpoint"] = *req.Endpoint
	}
	if req.Model != nil {
		updates["model"] = *req.Model
	}
	if req.Config != nil {
		updates["config"] = datatypes.JSON(req.Config)
	}
	if req.IsDefault != nil {
		updates["is_default"] = *req.IsDefault
	}

	if len(updates) == 0 {
		cfg.APIKeyEncrypted = ""
		return cfg, nil
	}

	if err := s.repo.Update(id, updates); err != nil {
		return nil, err
	}

	cfg.APIKeyEncrypted = ""
	return cfg, nil
}

func (s *providerService) Delete(id string) error {
	return s.repo.Delete(id)
}

// NormalizeProviderName maps stored provider labels ("Custom", "OpenAI",
// "Anthropic", …) to the AI service enum ("openai" | "anthropic").
// Anything that isn't explicitly Anthropic is treated as an OpenAI-compatible
// endpoint (OpenAI, Azure, Ollama, LM Studio, OpenRouter, custom proxies…).
func NormalizeProviderName(provider string) string {
	lower := strings.ToLower(provider)
	if strings.Contains(lower, "anthropic") || strings.Contains(lower, "claude") {
		return "anthropic"
	}
	return "openai"
}

func (s *providerService) Test(req TestProviderRequest) error {
	// Delegate the connection test to the AI service — it owns the provider
	// SDKs (OpenAI models.list, Anthropic 1-token completion) and knows how to
	// speak to custom/OpenAI-compatible endpoints.
	body, err := json.Marshal(map[string]string{
		"provider": NormalizeProviderName(req.Provider),
		"api_key":  req.APIKey,
		"endpoint": req.Endpoint,
		"model":    req.Model,
	})
	if err != nil {
		return fmt.Errorf("failed to encode test request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	httpReq, err := http.NewRequest(
		"POST", s.aiServiceURL+"/api/ai/providers/test", bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("invalid test request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("AI service unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
	return fmt.Errorf("connection test failed (status %d): %s", resp.StatusCode, string(respBody))
}

func (s *providerService) encryptAPIKey(key string) (string, error) {
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(key), nil)
	return hex.EncodeToString(ciphertext), nil
}

func (s *providerService) decryptAPIKey(encrypted string) (string, error) {
	data, err := hex.DecodeString(encrypted)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}
