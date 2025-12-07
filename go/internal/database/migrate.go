package database

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/hiroky1983/talk/go/migrations"
)

// NewMigrator creates a new migrator instance
func NewMigrator(db *bun.DB) (*migrate.Migrator, error) {
	migs := migrate.NewMigrations()
	if err := migs.Discover(migrations.FS); err != nil {
		return nil, fmt.Errorf("failed to discover migrations: %w", err)
	}

	migrator := migrate.NewMigrator(db, migs)
	return migrator, nil
}

// RunMigrations runs all pending migrations
func RunMigrations(ctx context.Context, db *bun.DB) error {
	migrator, err := NewMigrator(db)
	if err != nil {
		return err
	}

	if err := migrator.Init(ctx); err != nil {
		return fmt.Errorf("failed to initialize migrations: %w", err)
	}

	group, err := migrator.Migrate(ctx)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	if group.IsZero() {
		fmt.Println("No new migrations to run")
		return nil
	}

	fmt.Printf("Migrated to %s\n", group)
	return nil
}

// RollbackMigration rolls back the last migration group
func RollbackMigration(ctx context.Context, db *bun.DB) error {
	migrator, err := NewMigrator(db)
	if err != nil {
		return err
	}

	group, err := migrator.Rollback(ctx)
	if err != nil {
		return fmt.Errorf("failed to rollback migration: %w", err)
	}

	if group.IsZero() {
		fmt.Println("No migrations to rollback")
		return nil
	}

	fmt.Printf("Rolled back %s\n", group)
	return nil
}

// MigrationStatus shows the current migration status
func MigrationStatus(ctx context.Context, db *bun.DB) error {
	migrator, err := NewMigrator(db)
	if err != nil {
		return err
	}

	if err := migrator.Init(ctx); err != nil {
		return fmt.Errorf("failed to initialize migrations: %w", err)
	}

	// Query the bun_migrations table to show applied migrations
	var migrations []struct {
		ID        int64  `bun:"id"`
		Name      string `bun:"name"`
		GroupID   int64  `bun:"group_id"`
		CreatedAt string `bun:"created_at"`
	}

	err = db.NewSelect().
		Table("bun_migrations").
		Order("id ASC").
		Scan(ctx, &migrations)

	if err != nil {
		fmt.Println("No migrations applied yet")
		return nil
	}

	fmt.Printf("Applied migrations: %d\n", len(migrations))
	for _, m := range migrations {
		fmt.Printf("  [%d] %s (group: %d, applied: %s)\n", m.ID, m.Name, m.GroupID, m.CreatedAt)
	}

	return nil
}
