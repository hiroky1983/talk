package gateway

import (
	"context"
	"errors"
	"fmt"

	"github.com/hiroky1983/talk/go/internal/models"
	"github.com/hiroky1983/talk/go/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserRepository handles user data operations
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// CreateUser creates a new user
func (r *UserRepository) CreateUser(ctx context.Context, email, password, username string) (*models.User, error) {
	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Username:     username,
	}

	// Insert user into database
	// Gorm will automatically populate ID, CreatedAt, etc. upon creation?
	// Note: Since we defined default:gen_random_uuid() in database, GORM might need to read it back.
	// GORM usually handles RETURNING * for Postgres.
	result := r.db.WithContext(ctx).Create(&user)
	if result.Error != nil {
		// Check for unique constraint violation
		if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
			return nil, repository.ErrUserAlreadyExists
		}
		// Also strict check on error string just in case
		// (Optional step if Gorm's error mapping isn't sufficient for specific logic, but ErrDuplicatedKey checks SQLSTATE 23505)
		return nil, fmt.Errorf("failed to create user: %w", result.Error)
	}

	return &user, nil
}

// GetUserByEmail retrieves a user by email
func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("email = ?", email).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, repository.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", result.Error)
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID
func (r *UserRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("users_id = ?", id).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, repository.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", result.Error)
	}
	return &user, nil
}

// VerifyPassword verifies a user's password
func (r *UserRepository) VerifyPassword(user *models.User, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return repository.ErrInvalidCredentials
	}
	return nil
}

// SaveRefreshToken saves a refresh token to the database
func (r *UserRepository) SaveRefreshToken(ctx context.Context, token *models.RefreshToken) error {
	result := r.db.WithContext(ctx).Create(token)
	if result.Error != nil {
		return fmt.Errorf("failed to save refresh token: %w", result.Error)
	}
	return nil
}

// GetRefreshToken retrieves a refresh token from the database
func (r *UserRepository) GetRefreshToken(ctx context.Context, token string) (*models.RefreshToken, error) {
	var refreshToken models.RefreshToken
	result := r.db.WithContext(ctx).Where("token = ? AND expires_at > NOW()", token).First(&refreshToken)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, repository.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get refresh token: %w", result.Error)
	}
	return &refreshToken, nil
}

// DeleteRefreshToken deletes a refresh token from the database
func (r *UserRepository) DeleteRefreshToken(ctx context.Context, token string) error {
	result := r.db.WithContext(ctx).Where("token = ?", token).Delete(&models.RefreshToken{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete refresh token: %w", result.Error)
	}
	return nil
}

// DeleteExpiredRefreshTokens deletes all expired refresh tokens
func (r *UserRepository) DeleteExpiredRefreshTokens(ctx context.Context) error {
	result := r.db.WithContext(ctx).Where("expires_at <= NOW()").Delete(&models.RefreshToken{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete expired refresh tokens: %w", result.Error)
	}
	return nil
}
