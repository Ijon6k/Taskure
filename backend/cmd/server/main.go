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

	// Initialize MinIO S3 Object Storage
	storageSvc, err := storage.NewMinIOStorage(cfg, logger)
	if err != nil {
		logger.Warn().Err(err).Msg("could not initialize minio storage service, fallback storage will be used")
	} else {
		if err := storageSvc.EnsureBucket(context.Background()); err != nil {
			logger.Warn().Err(err).Msg("could not auto-initialize minio bucket")
		} else {
			logger.Info().Str("bucket", cfg.MinIOBucket).Msg("minio bucket ready")
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

	// Start the background image-variant worker when object storage is
	// available. Without storage there are no objects to process.
	var variantWorker *worker.VariantWorker
	workerCtx, workerCancel := context.WithCancel(context.Background())
	if storageSvc != nil {
		variantWorker = worker.NewVariantWorker(variantJobRepo, storageSvc, logger, cfg.VariantWorkers)
		variantWorker.Start(workerCtx)
	}

	workspaceService := service.NewWorkspaceService(workspaceRepo)
	taskService := service.NewTaskService(taskRepo, projectRepo, columnRepo, variantJobRepo, storageSvc)
	projectService := service.NewProjectService(projectRepo, workspaceRepo, columnRepo, taskRepo, variantJobRepo, storageSvc)
	columnService := service.NewColumnService(columnRepo, projectRepo)
	importService := service.NewImportService(workspaceRepo, projectRepo, importRepo)
	seedService := service.NewSeedService(workspaceRepo, projectRepo, columnRepo, taskRepo)
	notebookService := service.NewNotebookService(notebookRepo, projectRepo)

	// Backfill missing NanoIDs on startup
	_ = workspaceService.BackfillNanoIDs()

	// Ensure default workspace & seed initial data if database is fresh
	if ws, err := workspaceService.EnsureDefaultWorkspace(); err == nil {
		logger.Info().Str("workspace_id", ws.ID).Str("public_id", ws.PublicID).Msg("default workspace initialized")
	}

	// HTTP Handler Container
	container := handler.NewContainer(workspaceService, projectService, columnService, taskService, importService, seedService, storageSvc, notebookService)

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}
	router := gin.New()

	router.Use(middleware.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS(cfg.CORSOrigins))
	router.Use(middleware.MaxBodySize(500 * 1024 * 1024))

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
