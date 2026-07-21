package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ProjectContext struct {
	ent.Schema
}

func (ProjectContext) Fields() []ent.Field {
	return []ent.Field{
		field.String("content"),
		field.Int("chunk_index"),
		field.Int("total_chunks"),
		field.Enum("context_type").Values("project", "label", "time_block", "routine"),
		field.String("project_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.JSON("metadata", map[string]any{}).Optional().SchemaType(map[string]string{
			dialect.Postgres: "jsonb",
		}),
		field.Bytes("embedding").Optional().StorageKey("embedding").Annotations(entsql.Annotation{
			ColType: "vector(1536)",
		}),
	}
}

func (ProjectContext) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("project", Project.Type).Ref("contexts").Field("project_id"),
	}
}

func (ProjectContext) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("project_id"),
	}
}
