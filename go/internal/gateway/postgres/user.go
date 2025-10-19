package postgres

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/hiroky1983/talk/go/internal/domain"
	"github.com/hiroky1983/talk/go/internal/repository"
)

// UserRepository implements repository.User interface using PostgreSQL
type UserRepository struct {
	db *bun.DB
}

// NewUserRepository creates a new UserRepository instance
func NewUserRepository(db *bun.DB) repository.User {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	model := &UserModel{}
	model.FromDomain(user)

	_, err := r.db.NewInsert().
		Model(model).
		Returning("*").
		Exec(ctx)

	if err != nil {
		return HandleError(err)
	}

	// Update domain with generated ID and timestamps
	*user = *model.ToDomain()
	return nil
}

// FindByID retrieves a user by ID
func (r *UserRepository) FindByID(ctx context.Context, id int64) (*domain.User, error) {
	model := &UserModel{}

	err := r.db.NewSelect().
		Model(model).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, HandleError(err)
	}

	return model.ToDomain(), nil
}

// FindByEmail retrieves a user by email address
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	model := &UserModel{}

	err := r.db.NewSelect().
		Model(model).
		Where("LOWER(email) = LOWER(?)", email).
		Scan(ctx)

	if err != nil {
		return nil, HandleError(err)
	}

	return model.ToDomain(), nil
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	model := &UserModel{}
	model.FromDomain(user)

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

	// Update domain with latest timestamps
	*user = *model.ToDomain()
	return nil
}

// Delete soft-deletes a user by ID
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.NewUpdate().
		Model((*UserModel)(nil)).
		Set("deleted_at = ?", "NOW()").
		Where("id = ?", id).
		Where("deleted_at IS NULL").
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

// List retrieves users with pagination
func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*domain.User, int, error) {
	var models []*UserModel

	count, err := r.db.NewSelect().
		Model(&models).
		Limit(limit).
		Offset(offset).
		ScanAndCount(ctx)

	if err != nil {
		return nil, 0, HandleError(err)
	}

	users := make([]*domain.User, len(models))
	for i, model := range models {
		users[i] = model.ToDomain()
	}

	return users, count, nil
}

// FindWithSettings retrieves a user with their settings
func (r *UserRepository) FindWithSettings(ctx context.Context, id int64) (*domain.User, *domain.UserSettings, error) {
	userModel := &UserModel{}
	settingsModel := &UserSettingsModel{}

	err := r.db.NewSelect().
		Model(userModel).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, nil, HandleError(err)
	}

	err = r.db.NewSelect().
		Model(settingsModel).
		Where("user_id = ?", id).
		Scan(ctx)

	if err != nil {
		return userModel.ToDomain(), nil, HandleError(err)
	}

	return userModel.ToDomain(), settingsModel.ToDomain(), nil
}
