package models

import "gorm.io/gorm"

// AllModels returns all models for migration purposes
func AllModels() []interface{} {
	return []interface{}{
		&User{},
	}
}

// AutoMigrate runs auto migration for all models
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(AllModels()...)
}
