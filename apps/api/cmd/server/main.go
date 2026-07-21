package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"

	"github.com/Ijon6k/kanbanproject/apps/api/ent"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/handler"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/middleware"
)

var logger zerolog.Logger

func main() {
	// Initialize zerolog
	logger = zerolog.New(os.Stdout).With().Timestamp().Str("service", "api").Logger()

	// Load .env
	if err := godotenv.Load(); err != nil {
		logger.Info().Msg("no .env file found, using environment variables")
	}

	// Config
	pgHost := getEnv("POSTGRES_HOST", "localhost")
	pgPort := getEnv("POSTGRES_PORT", "5432")
	pgUser := getEnv("POSTGRES_USER", "kanban")
	pgPass := getEnv("POSTGRES_PASSWORD", "")
	pgDB := getEnv("POSTGRES_DB", "kanban")
	apiPort := getEnv("API_PORT", "4000")
	apiHost := getEnv("API_HOST", "0.0.0.0")
	jwtSecret := getEnv("JWT_SECRET", "changeme-use-a-long-random-secret-min-32-chars")

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		pgUser, pgPass, pgHost, pgPort, pgDB)

	ctx := context.Background()

	// Connect to PostgreSQL
	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to parse postgres config")
	}
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to postgres")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Fatal().Err(err).Msg("failed to ping postgres")
	}
	logger.Info().Msg("connected to postgres")

	// Create Ent client
	drv := entsql.OpenDB(dialect.Postgres, pool)
	client := ent.NewClient(ent.Driver(drv))
	defer client.Close()

	// Auto-migrate
	if err := client.Schema.Create(ctx); err != nil {
		logger.Fatal().Err(err).Msg("failed to run ent auto-migration")
	}
	logger.Info().Msg("ent auto-migration complete")

	// Setup Gin
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	// Middleware
	router.Use(middleware.Recovery(logger))
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS())

	// Health check
	router.GET("/health", handler.HealthCheck)

	// Routes with JWT auth
	protected := router.Group("")
	protected.Use(middleware.Auth(jwtSecret))
	_ = protected.Use(func(c *gin.Context) {
		c.Set("jwt_secret", jwtSecret)
		c.Next()
	})

	// TODO: add routes here

	// Graceful shutdown
	srv := &http.Server{
		Addr:    fmt.Sprintf("%s:%s", apiHost, apiPort),
		Handler: router,
	}

	go func() {
		logger.Info().Str("addr", srv.Addr).Msg("starting server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info().Msg("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Fatal().Err(err).Msg("server forced to shutdown")
	}
	logger.Info().Msg("server stopped")
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
