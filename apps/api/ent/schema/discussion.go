package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Discussion struct {
	ent.Schema
}

func (Discussion) Fields() []ent.Field {
	return []ent.Field{
		field.String("content"),
		field.String("task_id").Optional().Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("project_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("author_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("parent_id").Optional().Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.JSON("mentions", []string{}).Optional().SchemaType(map[string]string{
			dialect.Postgres: "jsonb",
		}),
	}
}

func (Discussion) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("project", Project.Type).Ref("discussions").Field("project_id"),
		edge.To("task", Task.Type).Optional().Field("task_id"),
		edge.To("author", User.Type).Unique().Field("author_id"),
		edge.To("parent", Discussion.Type).Unique().Field("parent_id"),
		edge.To("replies", Discussion.Type),
	}
}
