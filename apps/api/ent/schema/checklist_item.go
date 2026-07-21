package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type ChecklistItem struct {
	ent.Schema
}

func (ChecklistItem) Fields() []ent.Field {
	return []ent.Field{
		field.String("title"),
		field.Bool("is_completed").Default(false),
		field.Int("position"),
		field.String("task_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("assignee_id").Optional().Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
	}
}

func (ChecklistItem) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("task", Task.Type).Ref("checklist_items").Field("task_id"),
		edge.To("assignee", User.Type).Unique().Field("assignee_id"),
	}
}
