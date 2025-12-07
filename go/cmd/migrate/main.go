package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/joho/godotenv/autoload"

	"github.com/hiroky1983/talk/go/internal/database"
	"github.com/hiroky1983/talk/go/internal/models"
)

func main() {
	var (
		command = flag.String("cmd", "", "Command to run: up, down, status, create")
		name    = flag.String("name", "", "Migration name (for create command)")
	)
	flag.Parse()

	ctx := context.Background()

	// Create database connection
	db, err := database.NewBunDB(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Register models
	models.RegisterModels(db)

	switch *command {
	case "up":
		if err := database.RunMigrations(ctx, db); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		fmt.Println("Migrations completed successfully")

	case "down":
		if err := database.RollbackMigration(ctx, db); err != nil {
			log.Fatalf("Rollback failed: %v", err)
		}
		fmt.Println("Rollback completed successfully")

	case "status":
		if err := database.MigrationStatus(ctx, db); err != nil {
			log.Fatalf("Failed to get migration status: %v", err)
		}

	case "create":
		if *name == "" {
			log.Fatal("Migration name is required for create command")
		}
		if err := createMigration(*name); err != nil {
			log.Fatalf("Failed to create migration: %v", err)
		}
		fmt.Printf("Created migration: %s\n", *name)

	default:
		fmt.Println("Usage: migrate -cmd <command> [-name <migration_name>]")
		fmt.Println("Commands:")
		fmt.Println("  up       - Run pending migrations")
		fmt.Println("  down     - Rollback last migration")
		fmt.Println("  status   - Show migration status")
		fmt.Println("  create   - Create new migration (requires -name flag)")
		os.Exit(1)
	}
}

func createMigration(name string) error {
	timestamp := "20250101000001" // This should be generated with time.Now()
	upFile := fmt.Sprintf("migrations/%s_%s.up.sql", timestamp, name)
	downFile := fmt.Sprintf("migrations/%s_%s.down.sql", timestamp, name)

	if err := os.WriteFile(upFile, []byte("-- Write your up migration here\n"), 0644); err != nil {
		return err
	}

	if err := os.WriteFile(downFile, []byte("-- Write your down migration here\n"), 0644); err != nil {
		return err
	}

	fmt.Printf("Created files:\n  %s\n  %s\n", upFile, downFile)
	return nil
}
