package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/edge"
)

type Workspace struct {
	ent.Schema
}

func (Workspace) Fields() []ent.Field {
	return []ent.Field{
		field.String("name"),
		field.String("slug"),
		field.String("description").Optional(),
		field.String("owner_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.JSON("settings", map[string]any{}).Optional().SchemaType(map[string]string{
			dialect.Postgres: "jsonb",
		}),
	}
}

func (Workspace) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("projects", Project.Type),
		edge.To("labels", Label.Type),
		edge.To("users", User.Type).From("workspaces"),
	}
}
