package repository

import (
	"context"

	"github.com/hiroky1983/talk/go/internal/domain"
)

// UserSettings is the repository interface for UserSettings domain
type UserSettings interface {
	// Create creates user settings
	Create(ctx context.Context, settings *domain.UserSettings) error

	// FindByUserID retrieves settings for a user
	FindByUserID(ctx context.Context, userID int64) (*domain.UserSettings, error)

	// Update updates user settings
	Update(ctx context.Context, settings *domain.UserSettings) error

	// Upsert creates or updates settings (INSERT ... ON CONFLICT)
	Upsert(ctx context.Context, settings *domain.UserSettings) error
}
