package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/extra/bundebug"
)

// NewConnection creates and configures a new Bun database connection
// It connects to Supabase PostgreSQL and sets up connection pooling
func NewConnection() (*bun.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	// Create pgdriver connector with SSL support (required for Supabase)
	connector := pgdriver.NewConnector(
		pgdriver.WithDSN(dsn),
	)

	sqldb := sql.OpenDB(connector)

	// Create Bun DB instance with PostgreSQL dialect
	db := bun.NewDB(sqldb, pgdialect.New())

	// Add query hooks for debugging in development
	if os.Getenv("ENV") == "development" {
		db.AddQueryHook(bundebug.NewQueryHook(
			bundebug.WithVerbose(true),
		))
	}

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// Close gracefully closes the database connection
func Close(db *bun.DB) error {
	if db == nil {
		return nil
	}
	return db.Close()
}
