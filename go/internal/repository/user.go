package repository

import (
	"context"

	"github.com/hiroky1983/talk/go/internal/domain"
)

// User is the repository interface for User domain
type User interface {
	// Create creates a new user
	Create(ctx context.Context, user *domain.User) error

	// FindByID retrieves a user by ID
	FindByID(ctx context.Context, id int64) (*domain.User, error)

	// FindByEmail retrieves a user by email address
	FindByEmail(ctx context.Context, email string) (*domain.User, error)

	// Update updates an existing user
	Update(ctx context.Context, user *domain.User) error

	// Delete soft-deletes a user by ID
	Delete(ctx context.Context, id int64) error

	// List retrieves users with pagination
	List(ctx context.Context, limit, offset int) ([]*domain.User, int, error)

	// FindWithSettings retrieves a user with their settings
	FindWithSettings(ctx context.Context, id int64) (*domain.User, *domain.UserSettings, error)
}
