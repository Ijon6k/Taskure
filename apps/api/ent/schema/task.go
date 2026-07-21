package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Task struct {
	ent.Schema
}

func (Task) Fields() []ent.Field {
	return []ent.Field{
		field.String("title"),
		field.String("description").Optional(),
		field.String("column_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("project_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("assignee_id").Optional().Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.Enum("priority").Values("urgent", "high", "medium", "low", "none").Default("none"),
		field.Enum("status").Values("todo", "in_progress", "done", "cancelled").Default("todo"),
		field.Int("position"),
		field.Time("due_date").Optional(),
		field.Time("start_date").Optional(),
		field.Float("estimated_hours").Optional(),
		field.Float("actual_hours").Optional(),
	}
}

func (Task) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("column", Column.Type).Ref("tasks").Field("column_id"),
		edge.From("project", Project.Type).Ref("tasks").Field("project_id"),
		edge.To("assignee", User.Type).Unique().Field("assignee_id"),
		edge.To("labels", Label.Type),
		edge.To("checklist_items", ChecklistItem.Type),
		edge.To("notes", TaskNote.Type),
		edge.To("attachments", Attachment.Type),
		edge.To("discussions", Discussion.Type),
	}
}

func (Task) Indexes() []ent.Index {
	return []ent.Index{
		ent.Index(["column_id", "position"]),
	}
}
