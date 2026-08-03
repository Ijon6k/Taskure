package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/pkg/nanoid"
	"gorm.io/gorm"
)

type WorkspaceRepository interface {
	EnsureUserAndWorkspace() (*models.Workspace, error)
	GetDefaultWorkspace() (*models.Workspace, error)
	UpdateWorkspace(ws *models.Workspace, updates map[string]interface{}) error
	BackfillNanoIDs() error
}

type workspaceRepository struct {
	db *gorm.DB
}

// NewWorkspaceRepository creates the workspace repository.
func NewWorkspaceRepository(db *gorm.DB) WorkspaceRepository {
	return &workspaceRepository{db: db}
}

// EnsureUserAndWorkspace seeds the default user + personal workspace when the database is fresh.
func (r *workspaceRepository) EnsureUserAndWorkspace() (*models.Workspace, error) {
	var user models.User
	if err := r.db.First(&user).Error; err != nil {
		user = models.User{
			Name:  "Developer",
			Email: "developer@kanban.local",
		}
		if err := r.db.Create(&user).Error; err != nil {
			return nil, err
		}
	}

	var ws models.Workspace
	if err := r.db.Where("owner_id = ?", user.ID).First(&ws).Error; err != nil {
		ws = models.Workspace{
			Name:        "Personal Workspace",
			Slug:        "personal-workspace",
			Description: "Ruang kerja utama projek pribadi Anda",
			OwnerID:     user.ID,
		}
		if err := r.db.Create(&ws).Error; err != nil {
			return nil, err
		}
	}

	return &ws, nil
}

// GetDefaultWorkspace loads the default workspace with its projects.
func (r *workspaceRepository) GetDefaultWorkspace() (*models.Workspace, error) {
	return r.EnsureUserAndWorkspace()
}

// UpdateWorkspace applies partial updates to a workspace.
func (r *workspaceRepository) UpdateWorkspace(ws *models.Workspace, updates map[string]interface{}) error {
	return r.db.Model(ws).Updates(updates).Error
}

// BackfillNanoIDs assigns public NanoIDs to legacy rows that predate them.
func (r *workspaceRepository) BackfillNanoIDs() error {
	var workspaces []models.Workspace
	if err := r.db.Where("public_id IS NULL OR public_id = ''").Find(&workspaces).Error; err == nil {
		for _, ws := range workspaces {
			if id, err := nanoid.Generate("ws"); err == nil {
				r.db.Model(&ws).Update("public_id", id)
			}
		}
	}

	var projects []models.Project
	if err := r.db.Where("public_id IS NULL OR public_id = ''").Find(&projects).Error; err == nil {
		for _, p := range projects {
			if id, err := nanoid.Generate("prj"); err == nil {
				r.db.Model(&p).Update("public_id", id)
			}
		}
	}

	var tasks []models.Task
	if err := r.db.Where("public_id IS NULL OR public_id = ''").Find(&tasks).Error; err == nil {
		for _, t := range tasks {
			if id, err := nanoid.Generate("tsk"); err == nil {
				r.db.Model(&t).Update("public_id", id)
			}
		}
	}

	return nil
}
