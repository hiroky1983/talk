package postgres

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/hiroky1983/talk/go/internal/domain"
	"github.com/hiroky1983/talk/go/internal/repository"
)

// ConversationRepository implements repository.Conversation interface using PostgreSQL
type ConversationRepository struct {
	db *bun.DB
}

// NewConversationRepository creates a new ConversationRepository instance
func NewConversationRepository(db *bun.DB) repository.Conversation {
	return &ConversationRepository{db: db}
}

// Create creates a new conversation
func (r *ConversationRepository) Create(ctx context.Context, conversation *domain.Conversation) error {
	model := &ConversationModel{}
	model.FromDomain(conversation)

	_, err := r.db.NewInsert().
		Model(model).
		Returning("*").
		Exec(ctx)

	if err != nil {
		return HandleError(err)
	}

	*conversation = *model.ToDomain()
	return nil
}

// FindByID retrieves a conversation by ID
func (r *ConversationRepository) FindByID(ctx context.Context, id int64) (*domain.Conversation, error) {
	model := &ConversationModel{}

	err := r.db.NewSelect().
		Model(model).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, HandleError(err)
	}

	return model.ToDomain(), nil
}

// FindByUserID retrieves all conversations for a user
func (r *ConversationRepository) FindByUserID(ctx context.Context, userID int64, limit, offset int) ([]*domain.Conversation, error) {
	var models []*ConversationModel

	err := r.db.NewSelect().
		Model(&models).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Scan(ctx)

	if err != nil {
		return nil, HandleError(err)
	}

	conversations := make([]*domain.Conversation, len(models))
	for i, model := range models {
		conversations[i] = model.ToDomain()
	}

	return conversations, nil
}

// Update updates a conversation
func (r *ConversationRepository) Update(ctx context.Context, conversation *domain.Conversation) error {
	model := &ConversationModel{}
	model.FromDomain(conversation)

	result, err := r.db.NewUpdate().
		Model(model).
		WherePK().
		Returning("*").
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

	*conversation = *model.ToDomain()
	return nil
}

// Delete deletes a conversation and its messages
func (r *ConversationRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.NewDelete().
		Model((*ConversationModel)(nil)).
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

// FindWithMessages retrieves a conversation with all messages loaded
func (r *ConversationRepository) FindWithMessages(ctx context.Context, id int64) (*domain.Conversation, []*domain.Message, error) {
	convModel := &ConversationModel{}

	err := r.db.NewSelect().
		Model(convModel).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, nil, HandleError(err)
	}

	var msgModels []*MessageModel
	err = r.db.NewSelect().
		Model(&msgModels).
		Where("conversation_id = ?", id).
		Order("created_at ASC").
		Scan(ctx)

	if err != nil {
		return convModel.ToDomain(), nil, HandleError(err)
	}

	messages := make([]*domain.Message, len(msgModels))
	for i, model := range msgModels {
		messages[i] = model.ToDomain()
	}

	return convModel.ToDomain(), messages, nil
}

// CountByUserID returns the total number of conversations for a user
func (r *ConversationRepository) CountByUserID(ctx context.Context, userID int64) (int, error) {
	count, err := r.db.NewSelect().
		Model((*ConversationModel)(nil)).
		Where("user_id = ?", userID).
		Count(ctx)

	if err != nil {
		return 0, HandleError(err)
	}

	return count, nil
}
