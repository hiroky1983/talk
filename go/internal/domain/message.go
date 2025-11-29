package domain

import "time"

// MessageRole represents the role of the message sender
type MessageRole string

const (
	MessageRoleUser      MessageRole = "user"
	MessageRoleAssistant MessageRole = "assistant"
)

// Message represents an individual message in a conversation
type Message struct {
	ID             int64
	ConversationID int64
	Role           MessageRole
	Content        string
	CreatedAt      time.Time
}

// NewMessage creates a new Message instance
func NewMessage(conversationID int64, role MessageRole, content string) *Message {
	return &Message{
		ConversationID: conversationID,
		Role:           role,
		Content:        content,
		CreatedAt:      time.Now(),
	}
}

// IsFromUser returns true if the message is from a user
func (m *Message) IsFromUser() bool {
	return m.Role == MessageRoleUser
}

// IsFromAssistant returns true if the message is from an assistant
func (m *Message) IsFromAssistant() bool {
	return m.Role == MessageRoleAssistant
}
