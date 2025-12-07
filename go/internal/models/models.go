package models

import "github.com/uptrace/bun"

// RegisterModels registers all models with the Bun DB instance
// This is useful for migrations and schema introspection
func RegisterModels(db *bun.DB) {
	db.RegisterModel((*User)(nil))
	db.RegisterModel((*Conversation)(nil))
}
