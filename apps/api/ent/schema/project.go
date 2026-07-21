package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Project struct {
	ent.Schema
}

func (Project) Fields() []ent.Field {
	return []ent.Field{
		field.String("name"),
		field.String("description").Optional(),
		field.String("workspace_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("owner_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("icon").Optional(),
		field.String("color").Optional(),
		field.Bool("is_archived").Default(false),
		field.JSON("settings", map[string]any{}).Optional().SchemaType(map[string]string{
			dialect.Postgres: "jsonb",
		}),
	}
}

func (Project) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("workspace", Workspace.Type).Ref("projects").Field("workspace_id"),
		edge.To("columns", Column.Type),
		edge.To("tasks", Task.Type),
		edge.To("discussions", Discussion.Type),
		edge.To("contexts", ProjectContext.Type),
		edge.To("owner", User.Type).Unique().Field("owner_id"),
	}
}
