package postgres

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/hiroky1983/talk/go/internal/repository"
)

// PostgreSQL error codes
const (
	ErrCodeUniqueViolation     = "23505"
	ErrCodeForeignKeyViolation = "23503"
	ErrCodeNotNullViolation    = "23502"
	ErrCodeCheckViolation      = "23514"
)

// HandleError converts PostgreSQL errors to repository errors
func HandleError(err error) error {
	if err == nil {
		return nil
	}

	// Check for sql.ErrNoRows
	if errors.Is(err, sql.ErrNoRows) {
		return repository.ErrNotFound
	}

	// Check for PostgreSQL specific errors
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case ErrCodeUniqueViolation:
			return fmt.Errorf("%w: %s", repository.ErrDuplicate, pgErr.Detail)
		case ErrCodeForeignKeyViolation:
			return fmt.Errorf("%w: %s", repository.ErrForeignKey, pgErr.Detail)
		case ErrCodeNotNullViolation:
			return fmt.Errorf("%w: %s (column: %s)", repository.ErrInvalidInput, pgErr.Message, pgErr.ColumnName)
		case ErrCodeCheckViolation:
			return fmt.Errorf("%w: %s", repository.ErrInvalidInput, pgErr.Detail)
		default:
			return fmt.Errorf("database error [%s]: %s", pgErr.Code, pgErr.Message)
		}
	}

	return fmt.Errorf("unexpected error: %w", err)
}
