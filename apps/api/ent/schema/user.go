package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type User struct {
	ent.Schema
}

func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("email").Unique(),
		field.String("name"),
		field.String("password_hash"),
		field.String("avatar_url").Optional(),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("workspaces", Workspace.Type).From("users"),
		edge.To("owned_workspaces", Workspace.Type),
		edge.To("owned_projects", Project.Type),
		edge.To("assigned_tasks", Task.Type),
	}
}
