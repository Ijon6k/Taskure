package repository

import (
	"github.com/Ijon6k/Taskure/apps/api/internal/models"
	"gorm.io/gorm"
)

// ImportTaskData is a task row plus its checklist items for bulk import. The
// ColumnID is either pre-set (replace-import into an existing column) or
// wired by the repository inside the transaction (new columns).
type ImportTaskData struct {
	ColumnID  string
	Task      models.Task
	Checklist []models.ChecklistItem
}

// ImportColumnData is a column row plus its task tree for bulk import.
type ImportColumnData struct {
	Column models.Column
	Tasks  []ImportTaskData
}

// ImportBoardData is the pre-validated board tree handed to the repository;
// foreign keys and positions are wired inside the transaction.
type ImportBoardData struct {
	Project models.Project
	Columns []ImportColumnData
}

// ReplaceBoardData describes a replace-import against an existing board.
type ReplaceBoardData struct {
	NewColumns      []ImportColumnData // brand-new columns (with their tasks)
	NewTasks        []ImportTaskData   // tasks for existing columns (ColumnID pre-set)
	ColumnPositions map[string]int     // columnID -> final position
	TaskPositions   map[string]int     // taskID -> final position
	DeleteTaskIDs   []string
	DeleteColumnIDs []string
}

type ImportRepository interface {
	CreateProjectBoard(data *ImportBoardData) error
	ReplaceBoard(projectID string, data *ReplaceBoardData) error
}

type importRepository struct {
	db *gorm.DB
}

func NewImportRepository(db *gorm.DB) ImportRepository {
	return &importRepository{db: db}
}

func createTaskTree(tx *gorm.DB, projectID string, tasks []ImportTaskData) error {
	for i := range tasks {
		task := &tasks[i].Task
		task.ProjectID = projectID
		if err := tx.Create(task).Error; err != nil {
			return err
		}
		for j := range tasks[i].Checklist {
			item := &tasks[i].Checklist[j]
			item.TaskID = task.ID
			if err := tx.Create(item).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func createColumnTree(tx *gorm.DB, projectID string, columns []ImportColumnData) error {
	for i := range columns {
		col := &columns[i].Column
		col.ProjectID = projectID
		if err := tx.Create(col).Error; err != nil {
			return err
		}
		for j := range columns[i].Tasks {
			columns[i].Tasks[j].Task.ColumnID = col.ID
		}
		if err := createTaskTree(tx, projectID, columns[i].Tasks); err != nil {
			return err
		}
	}
	return nil
}

func (r *importRepository) CreateProjectBoard(data *ImportBoardData) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&data.Project).Error; err != nil {
			return err
		}
		return createColumnTree(tx, data.Project.ID, data.Columns)
	})
}

func (r *importRepository) ReplaceBoard(projectID string, data *ReplaceBoardData) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := createColumnTree(tx, projectID, data.NewColumns); err != nil {
			return err
		}
		if err := createTaskTree(tx, projectID, data.NewTasks); err != nil {
			return err
		}
		for id, pos := range data.ColumnPositions {
			if err := tx.Model(&models.Column{}).Where("id = ?", id).Update("position", pos).Error; err != nil {
				return err
			}
		}
		for id, pos := range data.TaskPositions {
			if err := tx.Model(&models.Task{}).Where("id = ?", id).Update("position", pos).Error; err != nil {
				return err
			}
		}
		if len(data.DeleteTaskIDs) > 0 {
			if err := tx.Delete(&models.Task{}, "id IN ?", data.DeleteTaskIDs).Error; err != nil {
				return err
			}
		}
		if len(data.DeleteColumnIDs) > 0 {
			if err := tx.Delete(&models.Column{}, "id IN ?", data.DeleteColumnIDs).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
