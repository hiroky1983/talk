package domain

import "time"

// Conversation represents a conversation session between a user and AI
type Conversation struct {
	ID        int64
	UserID    int64
	Title     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewConversation creates a new Conversation instance
func NewConversation(userID int64, title string) *Conversation {
	now := time.Now()
	return &Conversation{
		UserID:    userID,
		Title:     title,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// UpdateTitle updates the conversation's title
func (c *Conversation) UpdateTitle(title string) {
	c.Title = title
	c.UpdatedAt = time.Now()
}
