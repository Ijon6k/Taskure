// Package models contains all GORM database models for the kanban workspace.
package models

import (
	"time"

	"github.com/Ijon6k/kanbanproject/apps/api/pkg/nanoid"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Base contains common columns for internal tables (UUID primary key).
type Base struct {
	ID        string         `gorm:"type:uuid;primaryKey" json:"-"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a internal UUID before insert.
func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

// PublicBase extends Base with a public-facing NanoID (public_id).
type PublicBase struct {
	Base
	PublicID string `gorm:"type:varchar(30);index;default:''" json:"id"`
}

// InternalBase contains common columns for sub-entities where internal UUID is exposed as json:"id".
type InternalBase struct {
	ID        string         `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ib *InternalBase) BeforeCreate(tx *gorm.DB) error {
	if ib.ID == "" {
		ib.ID = uuid.New().String()
	}
	return nil
}

// --- User accounts ---

type User struct {
	InternalBase
	Email        string `gorm:"uniqueIndex;not null;size:255" json:"email"`
	Name         string `gorm:"not null;size:100" json:"name"`
	PasswordHash string `gorm:"not null;size:255" json:"-"`
	AvatarURL    string `gorm:"size:500" json:"avatar_url,omitempty"`
}

// --- Workspace ---

type Workspace struct {
	PublicBase
	Name        string         `gorm:"not null;size:100" json:"name"`
	Slug        string         `gorm:"uniqueIndex;not null;size:50" json:"slug"`
	Description string         `gorm:"size:500" json:"description,omitempty"`
	OwnerID     string         `gorm:"type:uuid;not null;index" json:"owner_id"`
	Settings    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"settings"`

	Projects []Project `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"projects,omitempty"`
	Labels   []Label   `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"labels,omitempty"`
}

func (w *Workspace) BeforeCreate(tx *gorm.DB) error {
	if err := w.Base.BeforeCreate(tx); err != nil {
		return err
	}
	if w.PublicID == "" {
		id, err := nanoid.Generate("ws")
		if err != nil {
			return err
		}
		w.PublicID = id
	}
	return nil
}

// --- Project ---

type Project struct {
	PublicBase
	Name        string         `gorm:"not null;size:100" json:"name"`
	Description string         `gorm:"size:500" json:"description,omitempty"`
	WorkspaceID string         `gorm:"type:uuid;not null;index" json:"workspace_id"`
	OwnerID     string         `gorm:"type:uuid;not null;index" json:"owner_id"`
	Icon        string         `gorm:"size:10" json:"icon,omitempty"`
	Color       string         `gorm:"size:7" json:"color,omitempty"`
	Status      string         `gorm:"size:20;default:'active';index" json:"status"`
	IsPinned    bool           `gorm:"default:false;index" json:"is_pinned"`
	IsArchived  bool           `gorm:"default:false;index" json:"is_archived"`
	Settings    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"settings"`

	Columns     []Column         `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"columns,omitempty"`
	Tasks       []Task           `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"tasks,omitempty"`
	Contexts    []ProjectContext `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"contexts,omitempty"`
	Discussions []Discussion     `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"discussions,omitempty"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if err := p.Base.BeforeCreate(tx); err != nil {
		return err
	}
	if p.PublicID == "" {
		id, err := nanoid.Generate("prj")
		if err != nil {
			return err
		}
		p.PublicID = id
	}
	return nil
}

// --- Column ---

type Column struct {
	InternalBase
	Name      string `gorm:"not null;size:50" json:"name"`
	Position  int    `gorm:"not null;default:0" json:"position"`
	ProjectID string `gorm:"type:uuid;not null;index:idx_column_project_position,priority:1" json:"project_id"`
	Color     string `gorm:"size:7" json:"color,omitempty"`
	WipLimit  *int   `json:"wip_limit,omitempty"`

	Tasks []Task `gorm:"foreignKey:ColumnID;constraint:OnDelete:CASCADE" json:"tasks,omitempty"`
}

// --- Task ---

type Task struct {
	PublicBase
	Title          string     `gorm:"not null;size:200" json:"title"`
	Description    string     `gorm:"type:text" json:"description,omitempty"`
	ColumnID       string     `gorm:"type:uuid;not null;index:idx_task_column_position,priority:1" json:"column_id"`
	ProjectID      string     `gorm:"type:uuid;not null;index" json:"project_id"`
	AssigneeID     *string    `gorm:"type:uuid;index" json:"assignee_id,omitempty"`
	Priority       string     `gorm:"size:20;default:'medium';index" json:"priority"`
	Status         string     `gorm:"size:20;default:'todo';index" json:"status"`
	Position       int        `gorm:"not null;default:0" json:"position"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	StartDate      *time.Time `json:"start_date,omitempty"`
	EstimatedHours *float64   `json:"estimated_hours,omitempty"`
	ActualHours    *float64   `json:"actual_hours,omitempty"`
	Tags           datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"tags"`

	Labels         []Label         `gorm:"many2many:task_labels;constraint:OnDelete:CASCADE" json:"labels,omitempty"`
	ChecklistItems []ChecklistItem `gorm:"foreignKey:TaskID;constraint:OnDelete:CASCADE" json:"checklist_items,omitempty"`
	Notes          []TaskNote      `gorm:"foreignKey:TaskID;constraint:OnDelete:CASCADE" json:"notes,omitempty"`
	Attachments    []Attachment    `gorm:"foreignKey:TaskID;constraint:OnDelete:CASCADE" json:"attachments,omitempty"`
}

func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if err := t.Base.BeforeCreate(tx); err != nil {
		return err
	}
	if t.PublicID == "" {
		id, err := nanoid.Generate("tsk")
		if err != nil {
			return err
		}
		t.PublicID = id
	}
	return nil
}

// --- Label ---

type Label struct {
	InternalBase
	Name        string  `gorm:"not null;size:30" json:"name"`
	Color       string  `gorm:"not null;size:7" json:"color"`
	ProjectID   *string `gorm:"type:uuid;index" json:"project_id,omitempty"`
	WorkspaceID string  `gorm:"type:uuid;not null;index" json:"workspace_id"`

	Tasks []Task `gorm:"many2many:task_labels" json:"tasks,omitempty"`
}

// --- ChecklistItem ---

type ChecklistItem struct {
	InternalBase
	Title       string  `gorm:"not null;size:200" json:"title"`
	IsCompleted bool    `gorm:"default:false" json:"is_completed"`
	Position    int     `gorm:"not null;default:0" json:"position"`
	TaskID      string  `gorm:"type:uuid;not null;index" json:"task_id"`
	AssigneeID  *string `gorm:"type:uuid" json:"assignee_id,omitempty"`
}

// --- TaskNote ---

type TaskNote struct {
	InternalBase
	Content  string `gorm:"type:text;not null" json:"content"`
	TaskID   string `gorm:"type:uuid;not null;index" json:"task_id"`
	AuthorID string `gorm:"type:uuid;not null;index" json:"author_id"`
	IsPinned bool   `gorm:"default:false" json:"is_pinned"`
}

// --- Attachment ---

type Attachment struct {
	InternalBase
	Filename   string `gorm:"not null;size:255" json:"filename"`
	FileSize   int64  `gorm:"not null" json:"file_size"`
	MimeType   string `gorm:"not null;size:100" json:"mime_type"`
	StorageKey string `gorm:"not null;size:500" json:"storage_key"`
	TaskID     string `gorm:"type:uuid;not null;index" json:"task_id"`
	UploaderID string `gorm:"type:uuid;not null" json:"uploader_id"`
}

// --- Capture ---

type Capture struct {
	PublicBase
	Content     string     `gorm:"type:text;not null" json:"content"`
	Source      string     `gorm:"not null;size:20" json:"source"`
	UserID      string     `gorm:"type:uuid;not null;index" json:"user_id"`
	WorkspaceID string     `gorm:"type:uuid;not null;index" json:"workspace_id"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
}

func (c *Capture) BeforeCreate(tx *gorm.DB) error {
	if err := c.Base.BeforeCreate(tx); err != nil {
		return err
	}
	if c.PublicID == "" {
		id, err := nanoid.Generate("cap")
		if err != nil {
			return err
		}
		c.PublicID = id
	}
	return nil
}

// --- ProjectContext (RAG) ---

type ProjectContext struct {
	PublicBase
	Content     string         `gorm:"type:text;not null" json:"content"`
	ChunkIndex  int            `gorm:"not null;default:0" json:"chunk_index"`
	TotalChunks int            `gorm:"not null;default:1" json:"total_chunks"`
	ContextType string         `gorm:"not null;size:30" json:"context_type"`
	ProjectID   string         `gorm:"type:uuid;not null;index" json:"project_id"`
	Metadata    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	Embedding   datatypes.JSON `gorm:"type:jsonb" json:"-"`
}

func (pc *ProjectContext) BeforeCreate(tx *gorm.DB) error {
	if err := pc.Base.BeforeCreate(tx); err != nil {
		return err
	}
	if pc.PublicID == "" {
		id, err := nanoid.Generate("ctx")
		if err != nil {
			return err
		}
		pc.PublicID = id
	}
	return nil
}

// --- Discussion ---

type Discussion struct {
	InternalBase
	Content   string         `gorm:"type:text;not null" json:"content"`
	TaskID    *string        `gorm:"type:uuid;index" json:"task_id,omitempty"`
	ProjectID string         `gorm:"type:uuid;not null;index" json:"project_id"`
	AuthorID  string         `gorm:"type:uuid;not null;index" json:"author_id"`
	ParentID  *string        `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Mentions  datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"mentions"`
}

// --- Activity ---

type Activity struct {
	InternalBase
	Action     string         `gorm:"not null;size:50" json:"action"`
	EntityType string         `gorm:"not null;size:30" json:"entity_type"`
	EntityID   string         `gorm:"type:uuid;not null;index" json:"entity_id"`
	ActorID    string         `gorm:"type:uuid;not null;index" json:"actor_id"`
	Metadata   datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
}

// AllModels returns every model registered with GORM AutoMigrate.
func AllModels() []any {
	return []any{
		&User{},
		&Workspace{},
		&Project{},
		&Column{},
		&Task{},
		&Label{},
		&ChecklistItem{},
		&TaskNote{},
		&Attachment{},
		&Capture{},
		&ProjectContext{},
		&Discussion{},
		&Activity{},
	}
}
