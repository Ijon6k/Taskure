package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type TaskNote struct {
	ent.Schema
}

func (TaskNote) Fields() []ent.Field {
	return []ent.Field{
		field.String("content"),
		field.String("task_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("author_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.Bool("is_pinned").Default(false),
	}
}

func (TaskNote) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("task", Task.Type).Ref("notes").Field("task_id"),
		edge.To("author", User.Type).Unique().Field("author_id"),
	}
}
