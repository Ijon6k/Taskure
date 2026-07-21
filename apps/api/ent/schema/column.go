package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Column struct {
	ent.Schema
}

func (Column) Fields() []ent.Field {
	return []ent.Field{
		field.String("name"),
		field.Int("position"),
		field.String("project_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("color").Optional(),
		field.Int("wip_limit").Optional(),
	}
}

func (Column) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("project", Project.Type).Ref("columns").Field("project_id"),
		edge.To("tasks", Task.Type),
	}
}

func (Column) Indexes() []ent.Index {
	return []ent.Index{
		ent.Index(["project_id", "position"]),
	}
}
