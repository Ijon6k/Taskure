package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Label struct {
	ent.Schema
}

func (Label) Fields() []ent.Field {
	return []ent.Field{
		field.String("name"),
		field.String("color"),
		field.String("project_id").Optional().Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("workspace_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
	}
}

func (Label) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("workspace", Workspace.Type).Ref("labels").Field("workspace_id"),
		edge.To("project", Project.Type).Optional().Field("project_id"),
		edge.To("tasks", Task.Type),
	}
}
