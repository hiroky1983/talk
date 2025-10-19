package postgres

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/hiroky1983/talk/go/internal/domain"
	"github.com/hiroky1983/talk/go/internal/repository"
)

// UserSettingsRepository implements repository.UserSettings interface using PostgreSQL
type UserSettingsRepository struct {
	db *bun.DB
}

// NewUserSettingsRepository creates a new UserSettingsRepository instance
func NewUserSettingsRepository(db *bun.DB) repository.UserSettings {
	return &UserSettingsRepository{db: db}
}

// Create creates user settings
func (r *UserSettingsRepository) Create(ctx context.Context, settings *domain.UserSettings) error {
	model := &UserSettingsModel{}
	model.FromDomain(settings)

	_, err := r.db.NewInsert().
		Model(model).
		Returning("*").
		Exec(ctx)

	if err != nil {
		return HandleError(err)
	}

	*settings = *model.ToDomain()
	return nil
}

// FindByUserID retrieves settings for a user
func (r *UserSettingsRepository) FindByUserID(ctx context.Context, userID int64) (*domain.UserSettings, error) {
	model := &UserSettingsModel{}

	err := r.db.NewSelect().
		Model(model).
		Where("user_id = ?", userID).
		Scan(ctx)

	if err != nil {
		return nil, HandleError(err)
	}

	return model.ToDomain(), nil
}

// Update updates user settings
func (r *UserSettingsRepository) Update(ctx context.Context, settings *domain.UserSettings) error {
	model := &UserSettingsModel{}
	model.FromDomain(settings)

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

	*settings = *model.ToDomain()
	return nil
}

// Upsert creates or updates settings (INSERT ... ON CONFLICT)
func (r *UserSettingsRepository) Upsert(ctx context.Context, settings *domain.UserSettings) error {
	model := &UserSettingsModel{}
	model.FromDomain(settings)

	_, err := r.db.NewInsert().
		Model(model).
		On("CONFLICT (user_id) DO UPDATE").
		Set("language = EXCLUDED.language").
		Set("selected_character = EXCLUDED.selected_character").
		Set("theme = EXCLUDED.theme").
		Returning("*").
		Exec(ctx)

	if err != nil {
		return HandleError(err)
	}

	*settings = *model.ToDomain()
	return nil
}
