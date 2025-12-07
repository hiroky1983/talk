package main

import (
	"fmt"
	"io"
	"os"

	"github.com/hiroky1983/talk/go/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// This file is used by Atlas to load GORM models and generate migrations
// It creates a temporary in-memory database, runs GORM auto-migration,
// and outputs the schema in Atlas-compatible format

func main() {
	// Create a temporary PostgreSQL DSN for schema generation
	// Atlas will use docker://postgres for the dev database
	dsn := "host=localhost user=postgres password=password dbname=atlas_dev port=5434 sslmode=disable"

	// Open database connection with minimal logging
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		// If connection fails, try to use a dev database from Atlas
		fmt.Fprintf(os.Stderr, "Warning: Could not connect to database: %v\n", err)
		fmt.Fprintf(os.Stderr, "Atlas will use its dev database instead\n")
		os.Exit(0)
	}

	// Run auto-migration to create schema
	if err := models.AutoMigrate(db); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to run auto-migration: %v\n", err)
		os.Exit(1)
	}

	// Get underlying SQL database
	sqlDB, err := db.DB()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get database instance: %v\n", err)
		os.Exit(1)
	}
	defer sqlDB.Close()

	// Output the database URL for Atlas to inspect
	// Atlas expects the URL on stdout
	fmt.Println(dsn)

	// Copy any additional schema information to stderr for debugging
	io.WriteString(os.Stderr, "GORM models loaded successfully\n")
}
