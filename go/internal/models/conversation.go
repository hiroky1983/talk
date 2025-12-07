package models

import (
	"time"

	"gorm.io/gorm"
)

// Conversation represents a conversation session
type Conversation struct {
	ID        string         `gorm:"type:varchar(255);primaryKey" json:"id"`
	UserID    string         `gorm:"type:varchar(255);not null;index" json:"user_id"`
	Title     string         `gorm:"type:varchar(255)" json:"title"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relations
	User     User      `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Messages []Message `gorm:"foreignKey:ConversationID;references:ID" json:"messages,omitempty"`
}

// TableName overrides the table name used by Conversation to `conversations`
func (Conversation) TableName() string {
	return "conversations"
}
