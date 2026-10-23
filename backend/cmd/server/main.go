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

	"github.com/Ijon6k/Taskure/apps/api/internal/config"
	"github.com/Ijon6k/Taskure/apps/api/internal/db"
	"github.com/Ijon6k/Taskure/apps/api/internal/handler"
	"github.com/Ijon6k/Taskure/apps/api/internal/middleware"
	"github.com/Ijon6k/Taskure/apps/api/internal/repository"
	"github.com/Ijon6k/Taskure/apps/api/internal/service"
	"github.com/Ijon6k/Taskure/apps/api/internal/storage"
	"github.com/Ijon6k/Taskure/apps/api/internal/worker"
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

	// Initialize SeaweedFS S3 Object Storage
	storageSvc, err := storage.NewSeaweedFSStorage(cfg, logger)
	if err != nil {
		logger.Warn().Err(err).Msg("could not initialize seaweedfs storage service, fallback storage will be used")
	} else {
		if err := storageSvc.EnsureBucket(context.Background()); err != nil {
			logger.Warn().Err(err).Msg("could not auto-initialize seaweedfs bucket")
		} else {
			logger.Info().Str("bucket", cfg.MinIOBucket).Msg("seaweedfs bucket ready")
		}
	}

	// Instantiating Clean Architecture Layers
	workspaceRepo := repository.NewWorkspaceRepository(conn)
	projectRepo := repository.NewProjectRepository(conn)
	columnRepo := repository.NewColumnRepository(conn)
	taskRepo := repository.NewTaskRepository(conn)
	importRepo := repository.NewImportRepository(conn)
	variantJobRepo := repository.NewVariantJobRepository(conn)
	notebookRepo := repository.NewNotebookRepository(conn)
	providerRepo := repository.NewProviderRepository(conn)
	conversationRepo := repository.NewConversationRepository(conn)
	memoryRepo := repository.NewMemoryRepository(conn)
	journalRepo := repository.NewJournalRepository(conn)
	contextRepo := repository.NewContextRepository(conn)
	outboxRepo := repository.NewOutboxRepository(conn)

	// Start the background image-variant worker when object storage is
	// available. Without storage there are no objects to process.
	var variantWorker *worker.VariantWorker
	workerCtx, workerCancel := context.WithCancel(context.Background())
	if storageSvc != nil {
		variantWorker = worker.NewVariantWorker(variantJobRepo, storageSvc, logger, cfg.VariantWorkers)
		variantWorker.Start(workerCtx)
	}

	workspaceService := service.NewWorkspaceService(conn, workspaceRepo)
	taskService := service.NewTaskService(conn, taskRepo, projectRepo, columnRepo, variantJobRepo, storageSvc)
	projectService := service.NewProjectService(conn, projectRepo, workspaceRepo, columnRepo, taskRepo, variantJobRepo, storageSvc)
	columnService := service.NewColumnService(conn, columnRepo, projectRepo)
	importService := service.NewImportService(workspaceRepo, projectRepo, importRepo)
	seedService := service.NewSeedService(workspaceRepo, projectRepo, columnRepo, taskRepo)
	notebookService := service.NewNotebookService(conn, notebookRepo, projectRepo)
	providerService, err := service.NewProviderServiceWithAI(providerRepo, cfg.EncryptionKey, cfg.AIServiceURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to initialize provider service")
	}
	aiSvc := service.NewAIService(cfg.AIServiceURL)
	conversationService := service.NewConversationService(conversationRepo, projectRepo)
	memoryService := service.NewMemoryService(conn, memoryRepo)
	journalService := service.NewJournalService(journalRepo)
	toolService := service.NewToolExecutionService(conn, taskService, projectService, columnService, notebookService, memoryService, journalService, aiSvc, contextRepo)

	// Backfill missing NanoIDs on startup
	_ = workspaceService.BackfillNanoIDs()

	// Ensure default workspace & seed initial data if database is fresh
	if ws, err := workspaceService.EnsureDefaultWorkspace(); err == nil {
		logger.Info().Str("workspace_id", ws.ID).Str("public_id", ws.PublicID).Msg("default workspace initialized")
	}

	// HTTP Handler Container
	container := handler.NewContainer(workspaceService, projectService, columnService, taskService, importService, seedService, storageSvc, notebookService, providerService, aiSvc, conversationService, toolService, memoryService, journalService, contextRepo, outboxRepo)

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}
	router := gin.New()
	_ = router.SetTrustedProxies([]string{"127.0.0.1", "172.16.0.0/12", "192.168.0.0/16", "10.0.0.0/8"})

	router.Use(middleware.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS(cfg.CORSOrigins))
	router.Use(middleware.MaxBodySize(500 * 1024 * 1024)) // 500MB max payload limit (upload ceiling)

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "api",
		})
	})

	router.GET("/storage/*filepath", container.StorageHandler.ServeStorageFile)

	apiGroup := router.Group("/api")
	container.RegisterRoutes(apiGroup)

	srv := &http.Server{
		Addr:              fmt.Sprintf("%s:%s", cfg.APIHost, cfg.APIPort),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      300 * time.Second,
		IdleTimeout:       120 * time.Second,
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

	// Stop the background variant workers (drain via context cancellation) and
	// wait for them to finish so a mid-flight job is not cut off.
	if variantWorker != nil {
		workerCancel()
		variantWorker.Wait()
	}
}
