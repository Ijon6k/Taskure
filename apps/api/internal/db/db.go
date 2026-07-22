// Package db owns the GORM database connection and schema migration.
package db

import (
	"log"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/config"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens a GORM connection to PostgreSQL.
func Connect(cfg config.Config) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}

	conn, err := gorm.Open(postgres.Open(cfg.PostgresDSN()), gormCfg)
	if err != nil {
		return nil, err
	}

	// Ensure the pgvector extension exists.
	if err := conn.Exec("CREATE EXTENSION IF NOT EXISTS vector").Error; err != nil {
		log.Printf("warning: pgvector extension not available (%v) — embeddings will use JSON storage", err)
	}

	if err := conn.AutoMigrate(models.AllModels()...); err != nil {
		return nil, err
	}

	log.Println("database connected and schema migrated")
	return conn, nil
}
