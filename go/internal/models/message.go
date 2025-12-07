package models

import (
	"time"

	"gorm.io/gorm"
)

// MessageRole represents the role of a message sender
type MessageRole string

const (
	MessageRoleUser      MessageRole = "user"
	MessageRoleAssistant MessageRole = "assistant"
	MessageRoleSystem    MessageRole = "system"
)

// Message represents a message in a conversation
type Message struct {
	ID             string         `gorm:"type:varchar(255);primaryKey" json:"id"`
	ConversationID string         `gorm:"type:varchar(255);not null;index" json:"conversation_id"`
	Role           MessageRole    `gorm:"type:varchar(50);not null" json:"role"`
	Content        string         `gorm:"type:text;not null" json:"content"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relations
	Conversation Conversation `gorm:"foreignKey:ConversationID;references:ID" json:"conversation,omitempty"`
}

// TableName overrides the table name used by Message to `messages`
func (Message) TableName() string {
	return "messages"
}
