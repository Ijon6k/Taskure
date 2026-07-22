// Kanban API server entry point.
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/internal/config"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/db"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/handler"
	"github.com/Ijon6k/kanbanproject/apps/api/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Str("service", "api").Logger()

	if err := godotenv.Load(); err != nil {
		logger.Info().Msg("no .env file found, using environment variables")
	}

	cfg := config.Load()

	conn, err := db.Connect(cfg)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to database")
	}

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	router.Use(middleware.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS(cfg.CORSOrigins))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "api",
		})
	})

	// API Handler registration
	apiHandler := handler.New(conn)
	
	// Ensure default workspace & seed initial data if database is fresh
	if ws, err := apiHandler.EnsureDefaultWorkspace(); err == nil {
		logger.Info().Str("workspace_id", ws.ID).Msg("default workspace initialized")
	}

	v1 := router.Group("/api/v1")
	apiHandler.RegisterRoutes(v1)

	srv := &http.Server{
		Addr:    fmt.Sprintf("%s:%s", cfg.APIHost, cfg.APIPort),
		Handler: router,
	}

	go func() {
		logger.Info().Str("addr", srv.Addr).Msg("api server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info().Msg("api server shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal().Err(err).Msg("server forced to shutdown")
	}
}
