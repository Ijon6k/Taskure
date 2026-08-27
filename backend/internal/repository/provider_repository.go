package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ProviderRepository interface {
	List() ([]models.ProviderConfig, error)
	FindByID(id string) (*models.ProviderConfig, error)
	Create(cfg *models.ProviderConfig) error
	Update(id string, updates map[string]interface{}) error
	Delete(id string) error
}

type providerRepository struct {
	db *gorm.DB
}

func NewProviderRepository(db *gorm.DB) ProviderRepository {
	return &providerRepository{db: db}
}

func (r *providerRepository) List() ([]models.ProviderConfig, error) {
	var configs []models.ProviderConfig
	err := r.db.Order("created_at DESC").Find(&configs).Error
	return configs, err
}

func (r *providerRepository) FindByID(id string) (*models.ProviderConfig, error) {
	var cfg models.ProviderConfig
	if err := r.db.First(&cfg, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (r *providerRepository) Create(cfg *models.ProviderConfig) error {
	return r.db.Create(cfg).Error
}

func (r *providerRepository) Update(id string, updates map[string]interface{}) error {
	cfg := models.ProviderConfig{}
	if len(updates) > 0 {
		// Handle datatypes.JSON for config
		if raw, ok := updates["config"]; ok {
			if j, ok := raw.(datatypes.JSON); ok {
				updates["config"] = j
			}
		}
	}
	return r.db.Model(&cfg).Where("id = ?", id).Updates(updates).Error
}

func (r *providerRepository) Delete(id string) error {
	result := r.db.Delete(&models.ProviderConfig{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
