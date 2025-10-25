package repository

import (
	"context"

	"github.com/hiroky1983/talk/go/internal/domain"
)

// Conversation is the repository interface for Conversation domain
type Conversation interface {
	// Create creates a new conversation
	Create(ctx context.Context, conversation *domain.Conversation) error

	// FindByID retrieves a conversation by ID
	FindByID(ctx context.Context, id int64) (*domain.Conversation, error)

	// FindByUserID retrieves all conversations for a user
	FindByUserID(ctx context.Context, userID int64, limit, offset int) ([]*domain.Conversation, error)

	// Update updates a conversation
	Update(ctx context.Context, conversation *domain.Conversation) error

	// Delete deletes a conversation and its messages
	Delete(ctx context.Context, id int64) error

	// FindWithMessages retrieves a conversation with all messages loaded
	FindWithMessages(ctx context.Context, id int64) (*domain.Conversation, []*domain.Message, error)

	// CountByUserID returns the total number of conversations for a user
	CountByUserID(ctx context.Context, userID int64) (int, error)
}
