package repository

import (
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/util"
	"gorm.io/gorm"
)

type ProjectRepository interface {
	ListProjects(workspaceID string, status string, search string, pinned bool) ([]models.Project, error)
	ListProjectsLight(workspaceID string, status string, search string, pinned bool, limit int, offset int) ([]models.Project, int64, error)
	CreateProject(project *models.Project) error
	CreateProjectWithDefaultColumns(project *models.Project, defaultCols []models.Column) error
	FindProject(idOrPublicID string) (*models.Project, error)
	UpdateProject(project *models.Project, updates map[string]interface{}) error
	DeleteProject(project *models.Project) error
	GetAllProjects() ([]models.Project, error)
	GetFocusOverview() (*FocusOverviewResult, error)
	FindProjectLight(idOrPublicID string) (*models.Project, error)
}

type projectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepository{db: db}
}

func (r *projectRepository) ListProjects(workspaceID string, status string, search string, pinned bool) ([]models.Project, error) {
	query := r.db.Where("workspace_id = ?", workspaceID)

	if status != "" && status != "all" {
		if status == "archived" {
			query = query.Where("is_archived = ? OR status = ?", true, "archived")
		} else {
			query = query.Where("status = ?", status)
		}
	}

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", s, s)
	}

	if pinned {
		query = query.Where("is_pinned = ?", true)
	}

	var projects []models.Project
	err := query.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Columns.Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).
		Order("is_pinned desc, created_at desc").
		Find(&projects).Error

	return projects, err
}

func (r *projectRepository) ListProjectsLight(workspaceID string, status string, search string, pinned bool, limit int, offset int) ([]models.Project, int64, error) {
	query := r.db.Where("workspace_id = ?", workspaceID)

	if status != "" && status != "all" {
		if status == "archived" {
			query = query.Where("is_archived = ? OR status = ?", true, "archived")
		} else {
			query = query.Where("status = ?", status)
		}
	}

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", s, s)
	}

	if pinned {
		query = query.Where("is_pinned = ?", true)
	}

	var total int64
	if err := query.Model(&models.Project{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	var projects []models.Project
	err := query.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Columns.Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Select("id", "column_id", "project_id", "status", "position").Order("position asc")
	}).Order("is_pinned desc, created_at desc").Find(&projects).Error
	return projects, total, err
}

func (r *projectRepository) CreateProject(project *models.Project) error {
	return r.db.Create(project).Error
}

func (r *projectRepository) CreateProjectWithDefaultColumns(project *models.Project, defaultCols []models.Column) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(project).Error; err != nil {
			return err
		}
		for i := range defaultCols {
			defaultCols[i].ProjectID = project.ID
			if err := tx.Create(&defaultCols[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *projectRepository) FindProject(idOrPublicID string) (*models.Project, error) {
	var project models.Project
	query := r.db.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Columns.Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc").Preload("ChecklistItems").Preload("Labels")
	})

	if util.IsUUID(idOrPublicID) {
		query = query.Where("id = ? OR public_id = ?", idOrPublicID, idOrPublicID)
	} else {
		query = query.Where("public_id = ?", idOrPublicID)
	}

	err := query.First(&project).Error
	if err != nil {
		return nil, err
	}
	return &project, nil
}

type FocusOverviewResult struct {
	Included         int `json:"included"`
	Excluded         int `json:"excluded"`
	SetupRecommended int `json:"setup_recommended"`
}

func (r *projectRepository) UpdateProject(project *models.Project, updates map[string]interface{}) error {
	return r.db.Model(project).Updates(updates).Error
}

func (r *projectRepository) DeleteProject(project *models.Project) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return tx.Delete(project).Error
	})
}

func (r *projectRepository) GetAllProjects() ([]models.Project, error) {
	var projects []models.Project
	err := r.db.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Preload("Columns.Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Find(&projects).Error
	return projects, err
}

func (r *projectRepository) FindProjectLight(idOrPublicID string) (*models.Project, error) {
	var project models.Project
	query := r.db
	if util.IsUUID(idOrPublicID) {
		query = query.Where("id = ? OR public_id = ?", idOrPublicID, idOrPublicID)
	} else {
		query = query.Where("public_id = ?", idOrPublicID)
	}
	err := query.First(&project).Error
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *projectRepository) GetFocusOverview() (*FocusOverviewResult, error) {
	var projects []models.Project
	err := r.db.Where("is_archived = ? AND (status IS NULL OR status != ?)", false, "archived").
		Preload("Columns").
		Find(&projects).Error
	if err != nil {
		return nil, err
	}

	res := &FocusOverviewResult{}
	for _, p := range projects {
		if !p.FocusEnabled {
			res.Excluded++
			continue
		}
		res.Included++

		hasCompletedCol := false
		for _, col := range p.Columns {
			if col.Behavior == models.ColumnBehaviorCompleted {
				hasCompletedCol = true
				break
			}
		}
		if len(p.Columns) > 0 && !hasCompletedCol {
			res.SetupRecommended++
		}
	}

	return res, nil
}
