package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Capture struct {
	ent.Schema
}

func (Capture) Fields() []ent.Field {
	return []ent.Field{
		field.String("content"),
		field.Enum("source").Values("quick_note", "clipboard", "file_import", "api"),
		field.String("user_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("workspace_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.Time("processed_at").Optional(),
	}
}

func (Capture) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("workspace", Workspace.Type).Unique().Field("workspace_id"),
		edge.To("user", User.Type).Unique().Field("user_id"),
	}
}
