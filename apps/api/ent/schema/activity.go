package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Activity struct {
	ent.Schema
}

func (Activity) Fields() []ent.Field {
	return []ent.Field{
		field.String("action"),
		field.Enum("entity_type").Values("workspace", "project", "task", "column", "label"),
		field.String("entity_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("actor_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.JSON("metadata", map[string]any{}).Optional().SchemaType(map[string]string{
			dialect.Postgres: "jsonb",
		}),
	}
}

func (Activity) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("actor", User.Type).Unique().Field("actor_id"),
	}
}
