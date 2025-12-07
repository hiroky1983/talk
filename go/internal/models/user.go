package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        string         `gorm:"type:varchar(255);primaryKey" json:"id"`
	Email     string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Name      string         `gorm:"type:varchar(255);not null" json:"name"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName overrides the table name used by User to `users`
func (User) TableName() string {
	return "users"
}
