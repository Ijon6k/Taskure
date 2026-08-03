package repository

import (
	"strings"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"github.com/Ijon6k/Taskure/apps/api/internal/util"
	"gorm.io/gorm"
)

type ProjectRepository interface {
	ListProjectsLight(workspaceID string, status string, search string, pinned bool, limit int, offset int) ([]models.Project, int64, error)
	CreateProject(project *models.Project) error
	CreateProjectWithDefaultColumns(project *models.Project, defaultCols []models.Column) error
	FindProject(idOrPublicID string) (*models.Project, error)
	UpdateProject(project *models.Project, updates map[string]interface{}) error
	DeleteProject(project *models.Project) error
	GetFocusProjects() ([]models.Project, error)
	GetColumnTaskCounts(columnIDs []string) (map[string]int, error)
	GetFocusOverview() (*FocusOverviewResult, error)
	FindProjectLight(idOrPublicID string) (*models.Project, error)
}

type projectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepository{db: db}
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
	}).Order("is_pinned desc, created_at desc").Find(&projects).Error
	if err != nil {
		return nil, total, err
	}

	// Attach per-column task counts so cards can render progress distribution
	// without pulling the full task rows (one aggregate query total).
	if len(projects) > 0 {
		columnIDs := make([]string, 0, len(projects)*3)
		for i := range projects {
			for j := range projects[i].Columns {
				columnIDs = append(columnIDs, projects[i].Columns[j].ID)
			}
		}
		if counts, err := r.GetColumnTaskCounts(columnIDs); err == nil {
			for i := range projects {
				for j := range projects[i].Columns {
					projects[i].Columns[j].TaskCount = counts[projects[i].Columns[j].ID]
				}
			}
		}
	}

	return projects, total, nil
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

// GetFocusProjects loads projects with their columns (column behaviors only),
// without preloading every task row — used by the focus engine.
func (r *projectRepository) GetFocusProjects() ([]models.Project, error) {
	var projects []models.Project
	err := r.db.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
	}).Find(&projects).Error
	return projects, err
}

// GetColumnTaskCounts returns the number of tasks per column for the given
// column IDs, so the focus engine can report workspace totals without loading
// the full task rows.
func (r *projectRepository) GetColumnTaskCounts(columnIDs []string) (map[string]int, error) {
	counts := make(map[string]int)
	if len(columnIDs) == 0 {
		return counts, nil
	}
	var rows []struct {
		ColumnID string
		Count    int
	}
	err := r.db.Model(&models.Task{}).
		Select("column_id, COUNT(*) AS count").
		Where("column_id IN ?", columnIDs).
		Group("column_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		counts[row.ColumnID] = row.Count
	}
	return counts, nil
}

// FindProjectLight loads project metadata + settings + ordered columns with
// per-column task counts, but no task rows — the payload for /projects/:id.
func (r *projectRepository) FindProjectLight(idOrPublicID string) (*models.Project, error) {
	var project models.Project
	query := r.db.Preload("Columns", func(db *gorm.DB) *gorm.DB {
		return db.Order("position asc")
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

	if len(project.Columns) > 0 {
		columnIDs := make([]string, 0, len(project.Columns))
		for i := range project.Columns {
			columnIDs = append(columnIDs, project.Columns[i].ID)
		}
		if counts, err := r.GetColumnTaskCounts(columnIDs); err == nil {
			for i := range project.Columns {
				project.Columns[i].TaskCount = counts[project.Columns[i].ID]
			}
		}
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
