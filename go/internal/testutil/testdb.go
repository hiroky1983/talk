package testutil

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"

	pggateway "github.com/hiroky1983/talk/go/internal/gateway/postgres"
	"github.com/hiroky1983/talk/go/internal/repository"
)

// TestDatabase represents a test database instance with container and repositories
type TestDatabase struct {
	Container *postgres.PostgresContainer
	DB        *bun.DB

	// Repositories using gateway implementations
	UserRepo         repository.User
	ConversationRepo repository.Conversation
	MessageRepo      repository.Message
	SettingsRepo     repository.UserSettings
}

// SetupTestDB creates a PostgreSQL test container and returns a Bun DB instance
// The container is automatically cleaned up when the test completes
func SetupTestDB(t *testing.T) *bun.DB {
	t.Helper()
	ctx := context.Background()

	// Create PostgreSQL 15 container (same version as Supabase)
	pgContainer, err := postgres.Run(ctx,
		"postgres:15-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start PostgreSQL container: %s", err)
	}

	// Get connection string
	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %s", err)
	}

	// Create Bun DB instance
	connector := pgdriver.NewConnector(pgdriver.WithDSN(connStr))
	sqldb := sql.OpenDB(connector)
	db := bun.NewDB(sqldb, pgdialect.New())

	// Cleanup on test completion
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Logf("failed to close database: %v", err)
		}
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %v", err)
		}
	})

	return db
}

// SetupTestDBWithContainer returns both the container and DB for advanced use cases
func SetupTestDBWithContainer(t *testing.T) *TestDatabase {
	t.Helper()
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"postgres:15-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start PostgreSQL container: %s", err)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %s", err)
	}

	connector := pgdriver.NewConnector(pgdriver.WithDSN(connStr))
	sqldb := sql.OpenDB(connector)
	db := bun.NewDB(sqldb, pgdialect.New())

	t.Cleanup(func() {
		db.Close()
		pgContainer.Terminate(ctx)
	})

	testDB := &TestDatabase{
		Container:        pgContainer,
		DB:               db,
		UserRepo:         pggateway.NewUserRepository(db),
		ConversationRepo: pggateway.NewConversationRepository(db),
		MessageRepo:      pggateway.NewMessageRepository(db),
		SettingsRepo:     pggateway.NewUserSettingsRepository(db),
	}

	return testDB
}

// CreateSchema creates all database tables in the test database
func (td *TestDatabase) CreateSchema(ctx context.Context) error {
	// Users table
	_, err := td.DB.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			email VARCHAR(255) NOT NULL UNIQUE,
			name VARCHAR(255) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			deleted_at TIMESTAMPTZ
		)
	`)
	if err != nil {
		return err
	}

	// Conversations table
	_, err = td.DB.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS conversations (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// Messages table
	_, err = td.DB.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS messages (
			id BIGSERIAL PRIMARY KEY,
			conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
			role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
			content TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// User settings table
	_, err = td.DB.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS user_settings (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
			language VARCHAR(10) NOT NULL DEFAULT 'en',
			selected_character VARCHAR(100) NOT NULL DEFAULT 'default',
			theme VARCHAR(50) NOT NULL DEFAULT 'light'
		)
	`)
	if err != nil {
		return err
	}

	return nil
}
