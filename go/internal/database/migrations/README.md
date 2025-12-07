# Database Migrations

This directory contains database migrations managed by [Atlas](https://atlasgo.io/).

## Overview

We use GORM for ORM and Atlas for schema migrations. Atlas reads the GORM models and generates SQL migrations automatically.

## Prerequisites

1. Install Atlas CLI:
   ```bash
   make atlas-install
   # or
   curl -sSf https://atlasgo.sh | sh
   ```

2. Ensure PostgreSQL is running:
   ```bash
   docker compose up -d postgres
   ```

## Common Commands

### Create a new migration

```bash
make migration-new NAME=create_users_table
```

This will:
- Compare current database schema with GORM models
- Generate a new migration file with SQL statements
- Save it in this directory

### Apply migrations

```bash
make migration-apply
```

This applies all pending migrations to the database.

### Check migration status

```bash
make migration-status
```

Shows which migrations have been applied and which are pending.

### Inspect current database schema

```bash
make db-inspect
```

Shows the current state of the database schema.

### Apply schema directly (development only)

```bash
make db-apply
```

**Warning**: This bypasses migrations and applies the GORM schema directly. Use only in development.

## Migration Workflow

1. Modify GORM models in `internal/models/`
2. Create a migration: `make migration-new NAME=descriptive_name`
3. Review the generated SQL in the new migration file
4. Apply the migration: `make migration-apply`
5. Commit both model changes and migration files

## Environment Variables

Migrations use the same database configuration as the application:

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5434 for local development)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `DB_SSLMODE` - SSL mode (default: disable)

## Atlas Configuration

The Atlas configuration is in `/go/atlas.hcl`. It defines:

- Database connection URLs
- Migration directory location
- GORM models as the source of truth
- Different environments (local, docker, gorm)

## Notes

- Always create migrations instead of modifying the database directly
- Migration files are named with timestamps and should never be edited after being applied
- The `atlas_loader.go` file is used by Atlas to load GORM models
- Migrations are stored in version control and should be committed with your code changes
