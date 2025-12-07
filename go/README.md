# Go Backend

This directory contains the Go backend service using Gin framework, Bun ORM, and Atlas for migrations.

## Database Setup

### Bun ORM

This project uses [Bun](https://bun.uptrace.dev/) as the ORM for PostgreSQL.

#### Models

Models are defined in `internal/models/`. Example:

```go
type User struct {
    bun.BaseModel `bun:"table:users,alias:u"`

    ID        int64     `bun:"id,pk,autoincrement"`
    Email     string    `bun:"email,notnull,unique"`
    Name      string    `bun:"name,notnull"`
    CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
    UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}
```

#### Database Connection

Database connection is initialized in `internal/database/postgres.go`:

```go
db, err := database.NewBunDB(ctx)
if err != nil {
    log.Fatal(err)
}
defer db.Close()
```

### Migrations

Migrations are managed using both Bun's migration system and Atlas.

#### Bun Migrations

Migration files are stored in `migrations/` with the naming convention:
- `YYYYMMDDHHMMSS_description.up.sql` - Apply migration
- `YYYYMMDDHHMMSS_description.down.sql` - Rollback migration

##### Migration Commands

```bash
# Run pending migrations
make migrate-up

# Rollback last migration
make migrate-down

# Show migration status
make migrate-status

# Create new migration
make migrate-create name=add_users_table
```

##### Using the migrate CLI directly

```bash
# Run migrations
go run cmd/migrate/main.go -cmd up

# Rollback
go run cmd/migrate/main.go -cmd down

# Status
go run cmd/migrate/main.go -cmd status

# Create new migration
go run cmd/migrate/main.go -cmd create -name add_new_table
```

#### Atlas

Atlas configuration is in `atlas.hcl` for advanced schema management.

##### Install Atlas

```bash
# macOS
brew install ariga/tap/atlas

# Linux
curl -sSf https://atlasgo.sh | sh

# Or using Go
go install ariga.io/atlas/cmd/atlas@latest
```

##### Atlas Commands

```bash
# Inspect current database schema
atlas schema inspect -u "postgres://postgres:postgres@localhost:5434/talk?sslmode=disable"

# Apply migrations (local environment)
atlas migrate apply --env local

# Apply migrations (docker environment)
atlas migrate apply --env docker

# Generate new migration from schema changes
atlas migrate diff migration_name --env local

# Validate migrations
atlas migrate validate --env local
```

### Environment Variables

Required environment variables for database connection:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=talk
DB_SSLMODE=disable
GO_ENV=development  # Enable SQL query debugging in development
```

## Development

### Building and Running

```bash
# Build the application
make build

# Run with Docker Compose
make run

# Format code
make lint-fix

# Tidy dependencies
make tidy
```

### Testing

```bash
# Run all tests
go test ./... -race -cover

# Run tests with verbose output
go test -v ./...

# Run specific package tests
go test ./internal/database/...
```

## Project Structure

```
go/
├── cmd/
│   └── migrate/           # Migration CLI tool
│       └── main.go
├── internal/
│   ├── database/          # Database connection and migration logic
│   │   ├── postgres.go
│   │   └── migrate.go
│   ├── models/            # Bun ORM models
│   │   ├── user.go
│   │   ├── conversation.go
│   │   └── models.go
│   └── websocket/         # WebSocket handlers
├── migrations/            # SQL migration files
│   ├── migrations.go      # Embed migrations
│   ├── 20250101000000_initial_schema.up.sql
│   └── 20250101000000_initial_schema.down.sql
├── atlas.hcl             # Atlas configuration
├── main.go               # Application entry point
├── Makefile              # Build and migration commands
└── README.md             # This file
```

## Resources

- [Bun ORM Documentation](https://bun.uptrace.dev/)
- [Atlas Documentation](https://atlasgo.io/)
- [Gin Framework](https://gin-gonic.com/)
