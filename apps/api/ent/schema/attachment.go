package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Attachment struct {
	ent.Schema
}

func (Attachment) Fields() []ent.Field {
	return []ent.Field{
		field.String("filename"),
		field.Int("file_size"),
		field.String("mime_type"),
		field.String("storage_key"),
		field.String("task_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
		field.String("uploader_id").Annotations(entsql.Annotation{
			ColType: "uuid",
		}),
	}
}

func (Attachment) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("task", Task.Type).Ref("attachments").Field("task_id"),
		edge.To("uploader", User.Type).Unique().Field("uploader_id"),
	}
}
