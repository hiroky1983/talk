package repository

import (
	"context"

	"github.com/hiroky1983/talk/go/internal/domain"
)

// Message is the repository interface for Message domain
type Message interface {
	// Create creates a new message
	Create(ctx context.Context, message *domain.Message) error

	// CreateBatch creates multiple messages in a single operation
	CreateBatch(ctx context.Context, messages []*domain.Message) error

	// FindByID retrieves a message by ID
	FindByID(ctx context.Context, id int64) (*domain.Message, error)

	// FindByConversationID retrieves all messages in a conversation
	FindByConversationID(ctx context.Context, conversationID int64) ([]*domain.Message, error)

	// Delete deletes a message
	Delete(ctx context.Context, id int64) error

	// CountByConversationID returns the total message count in a conversation
	CountByConversationID(ctx context.Context, conversationID int64) (int, error)
}
