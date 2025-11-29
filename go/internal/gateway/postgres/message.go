package postgres

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/hiroky1983/talk/go/internal/domain"
	"github.com/hiroky1983/talk/go/internal/repository"
)

// MessageRepository implements repository.Message interface using PostgreSQL
type MessageRepository struct {
	db *bun.DB
}

// NewMessageRepository creates a new MessageRepository instance
func NewMessageRepository(db *bun.DB) repository.Message {
	return &MessageRepository{db: db}
}

// Create creates a new message
func (r *MessageRepository) Create(ctx context.Context, message *domain.Message) error {
	model := &MessageModel{}
	model.FromDomain(message)

	_, err := r.db.NewInsert().
		Model(model).
		Returning("*").
		Exec(ctx)

	if err != nil {
		return HandleError(err)
	}

	*message = *model.ToDomain()
	return nil
}

// CreateBatch creates multiple messages in a single operation
func (r *MessageRepository) CreateBatch(ctx context.Context, messages []*domain.Message) error {
	if len(messages) == 0 {
		return repository.ErrInvalidInput
	}

	models := make([]*MessageModel, len(messages))
	for i, msg := range messages {
		model := &MessageModel{}
		model.FromDomain(msg)
		models[i] = model
	}

	_, err := r.db.NewInsert().
		Model(&models).
		Returning("*").
		Exec(ctx)

	if err != nil {
		return HandleError(err)
	}

	// Update domain objects with generated IDs
	for i, model := range models {
		messages[i].ID = model.ID
	}

	return nil
}

// FindByID retrieves a message by ID
func (r *MessageRepository) FindByID(ctx context.Context, id int64) (*domain.Message, error) {
	model := &MessageModel{}

	err := r.db.NewSelect().
		Model(model).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, HandleError(err)
	}

	return model.ToDomain(), nil
}

// FindByConversationID retrieves all messages in a conversation
func (r *MessageRepository) FindByConversationID(ctx context.Context, conversationID int64) ([]*domain.Message, error) {
	var models []*MessageModel

	err := r.db.NewSelect().
		Model(&models).
		Where("conversation_id = ?", conversationID).
		Order("created_at ASC").
		Scan(ctx)

	if err != nil {
		return nil, HandleError(err)
	}

	messages := make([]*domain.Message, len(models))
	for i, model := range models {
		messages[i] = model.ToDomain()
	}

	return messages, nil
}

// Delete deletes a message
func (r *MessageRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.NewDelete().
		Model((*MessageModel)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	if err != nil {
		return HandleError(err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return repository.ErrNotFound
	}

	return nil
}

// CountByConversationID returns the total message count in a conversation
func (r *MessageRepository) CountByConversationID(ctx context.Context, conversationID int64) (int, error) {
	count, err := r.db.NewSelect().
		Model((*MessageModel)(nil)).
		Where("conversation_id = ?", conversationID).
		Count(ctx)

	if err != nil {
		return 0, HandleError(err)
	}

	return count, nil
}
