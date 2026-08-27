// Package db owns the GORM database connection and schema migration.
package db

import (
	"log"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/config"
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
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

	// Bound the connection pool so bursts cannot exhaust the database.
	sqlDB, err := conn.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Ensure the pgvector extension exists.
	if err := conn.Exec("CREATE EXTENSION IF NOT EXISTS vector").Error; err != nil {
		log.Printf("warning: pgvector extension not available (%v) — embeddings will use JSON storage", err)
	}

	if err := conn.AutoMigrate(models.AllModels()...); err != nil {
		return nil, err
	}

	// project_contexts is intentionally excluded from AutoMigrate: its embedding
	// column is a pgvector vector(1536) which GORM cannot migrate safely. Create
	// it manually (idempotent) so RAG storage/search work.
	if err := conn.Exec(`
		CREATE TABLE IF NOT EXISTS project_contexts (
			id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			created_at   timestamptz NOT NULL DEFAULT NOW(),
			updated_at   timestamptz NOT NULL DEFAULT NOW(),
			deleted_at   timestamptz,
			public_id    varchar(30) NOT NULL DEFAULT '',
			content      text NOT NULL,
			chunk_index  bigint NOT NULL DEFAULT 0,
			total_chunks bigint NOT NULL DEFAULT 1,
			context_type varchar(30) NOT NULL,
			project_id   uuid NOT NULL,
			metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
			embedding    vector(1536)
		);
		CREATE INDEX IF NOT EXISTS idx_project_contexts_project_id ON project_contexts (project_id);
		CREATE INDEX IF NOT EXISTS idx_project_contexts_public_id ON project_contexts (public_id);
		CREATE INDEX IF NOT EXISTS idx_project_contexts_deleted_at ON project_contexts (deleted_at);
		CREATE INDEX IF NOT EXISTS idx_project_contexts_embedding ON project_contexts USING hnsw (embedding vector_cosine_ops);
		CREATE INDEX IF NOT EXISTS idx_project_contexts_fts ON project_contexts USING gin (to_tsvector('english', content));
	`).Error; err != nil {
		log.Printf("warning: could not ensure project_contexts table (%v)", err)
	}

	log.Println("database connected and schema migrated")
	return conn, nil
}
