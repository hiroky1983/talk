package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RunMigrations executes all SQL migration files in the migrations directory
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	// Get the migrations directory path
	migrationsDir := filepath.Join("migrations")

	// Read all migration files
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		return fmt.Errorf("failed to read migration files: %w", err)
	}

	if len(files) == 0 {
		log.Println("No migration files found")
		return nil
	}

	// Execute each migration file in order
	for _, file := range files {
		log.Printf("Running migration: %s", filepath.Base(file))

		// Read the migration file
		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}

		// Execute the migration
		_, err = pool.Exec(ctx, string(content))
		if err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", file, err)
		}

		log.Printf("Successfully executed migration: %s", filepath.Base(file))
	}

	log.Println("All migrations completed successfully")
	return nil
}
