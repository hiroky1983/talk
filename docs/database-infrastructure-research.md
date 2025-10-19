# PostgreSQL Database Connection Infrastructure Research

**Date:** 2025-10-18
**Project:** Talk - AI Language Learning Application
**Tech Stack:** Go (Gin + Connect RPC), PostgreSQL, Next.js, Python AI Service

## Executive Summary

This document provides comprehensive research and recommendations for implementing a PostgreSQL database connection infrastructure for the Go backend service. The proposed solution uses:
- **Bun ORM** for type-safe, SQL-first database operations
- **Atlas** for declarative schema management and migrations
- **pgxpool** (pgx v5 driver) for high-performance connection pooling
- **Testcontainers** for integration testing

---

## 1. Bun ORM for Go

### Overview

Bun is a SQL-first Golang ORM built on top of `database/sql` that emphasizes performance, type safety, and SQL transparency. Unlike traditional ORMs that abstract SQL away, Bun generates readable, optimized queries while providing ORM conveniences.

### Key Features

1. **SQL-First Philosophy**
   - Write elegant, readable queries that feel like SQL
   - Generates predictable SQL that you can understand and optimize
   - No hidden abstractions or magic

2. **Performance Characteristics**
   - Minimal overhead over raw SQL (< 5% in most cases)
   - Built on database/sql with optimized reflection usage
   - Faster than GORM in high-load scenarios (1.5x speed of sqlx in benchmarks)
   - Supports batch operations (COPY, multi-row INSERT) for high throughput

3. **Type Safety**
   - Compile-time type checking for queries
   - Struct-based models with tag support
   - Proper handling of NULL values with custom types

4. **PostgreSQL-Specific Features**
   - Advanced type support (arrays, JSONB, hstore)
   - Proper handling of PostgreSQL-specific syntax
   - Optimized for pgx driver

5. **Production Features**
   - OpenTelemetry tracing and metrics
   - Connection pooling support
   - Soft deletes
   - Lifecycle hooks
   - Migration system
   - Fixtures for testing

### Best Practices

#### Connection Management

```go
import (
    "database/sql"
    "github.com/uptrace/bun"
    "github.com/uptrace/bun/dialect/pgdialect"
    "github.com/uptrace/bun/driver/pgdriver"
)

// Initialize database connection
func NewDB() *bun.DB {
    dsn := os.Getenv("DATABASE_URL")
    sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))

    db := bun.NewDB(sqldb, pgdialect.New())

    // Add query hooks for logging (optional)
    db.AddQueryHook(bundebug.NewQueryHook(
        bundebug.WithVerbose(true),
    ))

    return db
}
```

#### Model Definition

```go
type User struct {
    bun.BaseModel `bun:"table:users,alias:u"`

    ID        int64     `bun:"id,pk,autoincrement"`
    Email     string    `bun:"email,notnull,unique"`
    Name      string    `bun:"name,notnull"`
    CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
    UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
    DeletedAt time.Time `bun:"deleted_at,soft_delete,nullzero"`
}

// BeforeAppendModel hook for auto-updating timestamps
var _ bun.BeforeAppendModelHook = (*User)(nil)

func (u *User) BeforeAppendModel(ctx context.Context, query bun.Query) error {
    switch query.(type) {
    case *bun.InsertQuery:
        u.CreatedAt = time.Now()
        u.UpdatedAt = time.Now()
    case *bun.UpdateQuery:
        u.UpdatedAt = time.Now()
    }
    return nil
}
```

#### Query Patterns

```go
// Select with relations
var users []User
err := db.NewSelect().
    Model(&users).
    Relation("Conversations").
    Where("u.email = ?", email).
    Limit(10).
    Scan(ctx)

// Insert
user := &User{Email: "test@example.com", Name: "Test User"}
_, err := db.NewInsert().
    Model(user).
    Exec(ctx)

// Update
_, err := db.NewUpdate().
    Model(&user).
    Column("name").
    Where("id = ?", user.ID).
    Exec(ctx)

// Bulk insert
users := []User{{...}, {...}}
_, err := db.NewInsert().
    Model(&users).
    Exec(ctx)
```

#### Transaction Handling

```go
// Recommended pattern using RunInTx
err := db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
    _, err := tx.NewInsert().Model(&user).Exec(ctx)
    if err != nil {
        return err // Auto-rollback
    }

    _, err = tx.NewInsert().Model(&conversation).Exec(ctx)
    return err // Auto-commit if nil
})
```

### Performance Tuning

1. **Use Batch Operations**
   ```go
   // Instead of multiple inserts
   for _, msg := range messages {
       db.NewInsert().Model(&msg).Exec(ctx) // BAD
   }

   // Use bulk insert
   _, err := db.NewInsert().Model(&messages).Exec(ctx) // GOOD
   ```

2. **Select Only Needed Columns**
   ```go
   err := db.NewSelect().
       Model(&user).
       Column("id", "name"). // Only fetch needed columns
       Where("id = ?", id).
       Scan(ctx)
   ```

3. **Use Indexes Properly**
   - Add indexes for frequently queried columns
   - Use EXPLAIN ANALYZE to profile queries
   - Consider covering indexes for read-heavy queries

4. **Avoid N+1 Queries**
   ```go
   // Use relations instead of multiple queries
   err := db.NewSelect().
       Model(&conversations).
       Relation("Messages").
       Relation("User").
       Scan(ctx)
   ```

### Common Pitfalls to Avoid

1. **Not Understanding SQL-First Philosophy**
   - Don't expect magic auto-relationships like ActiveRecord
   - Write explicit queries and relations
   - Understand the generated SQL

2. **Improper Context Usage**
   - Always pass context to queries
   - Use context for timeouts and cancellation
   - Don't use context.Background() in production

3. **Ignoring Soft Delete Behavior**
   - Soft-deleted rows are automatically excluded from SELECT queries
   - Use ForceDelete() when you need hard deletes
   - Remember soft-deleted rows still consume space

4. **Not Using Prepared Statements**
   - Use placeholders (?) for parameters
   - Never concatenate user input into SQL
   - Let Bun handle parameter binding

5. **Overusing Hooks**
   - Hooks make code harder to debug
   - Use hooks sparingly (timestamps, validation)
   - Prefer explicit code over implicit hooks

### When to Use Bun

✅ **Use Bun if:**
- You're comfortable with SQL
- You want performance close to raw SQL
- You need type safety and Go idioms
- You want explicit, readable queries
- You're building a new project or microservice

❌ **Consider alternatives if:**
- Team prefers heavy abstraction
- You need automatic schema sync (use Atlas separately)
- You want ActiveRecord-style magic

---

## 2. Atlas Migration Tool

### Overview

Atlas is a modern database schema management tool that supports both declarative (Terraform-like) and versioned migration workflows. It provides automatic migration planning, error recovery, and CI/CD integration.

### Key Features

1. **Two Migration Approaches**
   - **Declarative**: Define desired state, Atlas generates migration plan
   - **Versioned**: Linear migration history with automatic planning

2. **PostgreSQL-Specific Features**
   - Transactional DDL support with automatic rollback
   - Statement-level tracking for partial failure recovery
   - Schema-level, database-level, and instance-level multi-tenancy
   - Migration hooks for session configuration

3. **Error Handling**
   - Automatic rollback for failed migrations (PostgreSQL)
   - Statement-level progress tracking
   - Resume from last successful statement
   - Better error handling than golang-migrate

4. **CI/CD Integration**
   - `atlas migrate lint` for validation
   - Pre-migration checks for destructive changes
   - GitHub Actions and GitLab CI support
   - Integrity verification with atlas.sum

### Best Practices

#### Directory Structure (Monorepo)

```
go/
├── cmd/
│   └── migrate/
│       └── main.go           # Migration runner
├── internal/
│   ├── db/
│   │   ├── migrations/       # Atlas migrations
│   │   │   ├── 20250101000000_create_users.sql
│   │   │   ├── 20250101000001_create_conversations.sql
│   │   │   └── atlas.sum
│   │   ├── models/           # Bun models
│   │   │   ├── user.go
│   │   │   ├── conversation.go
│   │   │   ├── message.go
│   │   │   └── user_settings.go
│   │   └── repository/       # Repository layer
│   │       ├── user_repo.go
│   │       ├── conversation_repo.go
│   │       └── message_repo.go
│   └── config/
│       └── database.go
└── atlas.hcl                 # Atlas configuration
```

#### Atlas Configuration (atlas.hcl)

```hcl
env "local" {
  src = "file://internal/db/schema"
  dev = "docker://postgres/15/dev?search_path=public"

  migration {
    dir = "file://internal/db/migrations"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}

env "production" {
  src = "file://internal/db/schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://internal/db/migrations"

    # Execute in single transaction
    tx_mode = "all"
  }
}
```

#### Schema Definition

```sql
-- internal/db/schema/users.sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
```

#### Creating Migrations

```bash
# Generate migration from schema files
atlas migrate diff create_users \
  --env local \
  --to file://internal/db/schema

# Generate migration from current DB state
atlas migrate diff add_user_settings \
  --env local \
  --dev-url "docker://postgres/15/dev"
```

#### Applying Migrations

```bash
# Apply pending migrations
atlas migrate apply \
  --env production \
  --url $DATABASE_URL

# Dry run
atlas migrate apply \
  --env production \
  --url $DATABASE_URL \
  --dry-run

# Apply specific version
atlas migrate apply \
  --env production \
  --url $DATABASE_URL \
  --to-version 20250101000000
```

### Migration Strategies

#### Roll-Forward Philosophy

Atlas follows a linear migration history model:
- Schema changes are "roll-forward" by default
- Reverting requires generating a new migration
- Make schema changes backwards compatible

```sql
-- Good: Add nullable column first
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Later migration: Make it required after deploying code
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

#### Down Migrations

Atlas supports down migrations with automatic planning:

```bash
# Revert last migration
atlas migrate down --env production

# Revert to specific version
atlas migrate down \
  --env production \
  --to-version 20250101000000

# Dry run with plan review
atlas migrate down \
  --env production \
  --dry-run
```

**Important Notes:**
- Down migrations are computed based on current DB state
- Pre-migration checks prevent data loss
- Use `--dry-run` to review plan before applying

#### Transaction Management

```hcl
migration {
  dir = "file://migrations"

  # Default: each migration file in its own transaction
  tx_mode = "file"

  # Alternative: all migrations in single transaction
  # tx_mode = "all"

  # Alternative: no transactions (careful!)
  # tx_mode = "none"
}
```

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Atlas CI
on:
  pull_request:
    paths:
      - 'go/internal/db/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ariga/atlas-action/migrate/lint@v1
        with:
          dir: 'file://go/internal/db/migrations'
          dev-url: 'docker://postgres/15/dev'
```

### Common Pitfalls to Avoid

1. **Modifying Applied Migrations**
   - Never modify migrations after they're applied
   - atlas.sum prevents this but validate in CI
   - Create new migration to fix issues

2. **Ignoring Backwards Compatibility**
   - Deploy code before removing columns
   - Add nullable columns first, then make required
   - Use feature flags for breaking changes

3. **Not Testing Migrations**
   - Test migrations on staging environment
   - Use `--dry-run` before production
   - Verify rollback strategy

4. **Transaction Misuse**
   - Not all PostgreSQL statements support transactions (e.g., CREATE INDEX CONCURRENTLY)
   - Use tx_mode appropriately
   - Test transaction behavior

---

## 3. PostgreSQL Connection Pooling with pgxpool

### Overview

pgxpool provides high-performance connection pooling specifically designed for PostgreSQL with the pgx driver. It's more efficient than generic database/sql pooling and offers PostgreSQL-specific optimizations.

### Key Features

1. **Automatic Prepared Statement Caching**
   - Can improve performance by up to 3x
   - Statements cached by default
   - Per-connection cache

2. **Health Checks**
   - Periodic connection health verification
   - Automatic connection recycling
   - Configurable check intervals

3. **Connection Lifecycle Management**
   - Max connection lifetime
   - Idle connection timeouts
   - Graceful connection recycling

4. **Native PostgreSQL Support**
   - PostgreSQL-specific types
   - LISTEN/NOTIFY support
   - COPY protocol

### Recommended Configuration

#### For Your Use Case (Concurrent User Application)

```go
package config

import (
    "context"
    "fmt"
    "os"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

type DatabaseConfig struct {
    MaxConns          int32
    MinConns          int32
    MaxConnLifetime   time.Duration
    MaxConnIdleTime   time.Duration
    HealthCheckPeriod time.Duration
    ConnectTimeout    time.Duration
}

func DefaultDatabaseConfig() *DatabaseConfig {
    return &DatabaseConfig{
        MaxConns:          20,  // Based on formula: (cores * 2) + spindles
        MinConns:          5,   // Keep warm connections ready
        MaxConnLifetime:   1 * time.Hour,
        MaxConnIdleTime:   30 * time.Minute,
        HealthCheckPeriod: 1 * time.Minute,
        ConnectTimeout:    5 * time.Second,
    }
}

func NewConnectionPool(ctx context.Context) (*pgxpool.Pool, error) {
    databaseURL := os.Getenv("DATABASE_URL")
    if databaseURL == "" {
        return nil, fmt.Errorf("DATABASE_URL not set")
    }

    config, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, fmt.Errorf("failed to parse database URL: %w", err)
    }

    // Apply configuration
    dbConfig := DefaultDatabaseConfig()
    config.MaxConns = dbConfig.MaxConns
    config.MinConns = dbConfig.MinConns
    config.MaxConnLifetime = dbConfig.MaxConnLifetime
    config.MaxConnIdleTime = dbConfig.MaxConnIdleTime
    config.HealthCheckPeriod = dbConfig.HealthCheckPeriod
    config.ConnConfig.ConnectTimeout = dbConfig.ConnectTimeout

    // Optional: Configure prepared statement mode
    // "prepare" - create prepared statements (default, best performance)
    // "describe" - use for PgBouncer compatibility
    config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeCacheStatement

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, fmt.Errorf("failed to create connection pool: %w", err)
    }

    // Verify connection
    if err := pool.Ping(ctx); err != nil {
        pool.Close()
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return pool, nil
}
```

### Connection Pool Sizing Guide

#### The Formula

**Recommended Formula:** `connections = (core_count * 2) + effective_spindle_count`

For a typical cloud server (4 cores, SSD):
- `connections = (4 * 2) + 1 = 9`
- Round up to 10-20 for headroom

#### Important Principles

1. **Concurrent Users ≠ Connection Pool Size**
   - 10,000 users DO NOT need 10,000 connections
   - A small pool (10-30 connections) is usually sufficient
   - Application threads wait for available connections

2. **Smaller is Better**
   - Oversized pools cause contention
   - Each connection uses ~10 MB RAM
   - Focus on query performance, not pool size

3. **Calculate Capacity**
   ```
   Capacity = Connections × (1000ms / Avg Query Time)
   Example: 20 connections × (1000ms / 5ms) = 4,000 queries/second
   ```

#### Configuration Examples

**Development Environment (Docker Compose)**
```go
MaxConns: 10   // Low load, limited resources
MinConns: 2    // Minimal warm connections
```

**Production (Small to Medium)**
```go
MaxConns: 20   // Handle normal load
MinConns: 5    // Keep warm connections
```

**Production (High Traffic)**
```go
MaxConns: 50   // Handle peak load
MinConns: 10   // Reduce connection latency
```

**Connection String Format**
```bash
# URL Format with pool settings
DATABASE_URL="postgres://user:password@localhost:5432/dbname?pool_max_conns=20&pool_min_conns=5&pool_max_conn_lifetime=1h&pool_max_conn_idle_time=30m"

# DSN Format
DATABASE_URL="user=user password=password host=localhost port=5432 dbname=dbname pool_max_conns=20 pool_min_conns=5"
```

### Best Practices

#### 1. Singleton Pattern

```go
var (
    db     *pgxpool.Pool
    dbOnce sync.Once
)

func GetDB(ctx context.Context) (*pgxpool.Pool, error) {
    var err error
    dbOnce.Do(func() {
        db, err = NewConnectionPool(ctx)
    })
    return db, err
}
```

#### 2. Graceful Shutdown

```go
func main() {
    ctx := context.Background()
    pool, err := NewConnectionPool(ctx)
    if err != nil {
        log.Fatal(err)
    }

    // Graceful shutdown
    defer pool.Close()

    // Setup signal handling
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

    go func() {
        <-sigChan
        log.Println("Shutting down gracefully...")
        pool.Close()
        os.Exit(0)
    }()

    // Start server...
}
```

#### 3. Context with Timeout

```go
func GetUser(pool *pgxpool.Pool, userID int64) (*User, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var user User
    err := pool.QueryRow(ctx,
        "SELECT id, email, name FROM users WHERE id = $1",
        userID,
    ).Scan(&user.ID, &user.Email, &user.Name)

    return &user, err
}
```

#### 4. Named Arguments (pgx v5)

```go
args := pgx.NamedArgs{
    "email": email,
    "name":  name,
}

_, err := pool.Exec(ctx,
    "INSERT INTO users (email, name) VALUES (@email, @name)",
    args,
)
```

### Performance Optimization

#### Prepared Statements

```go
// Automatic caching (default)
// Queries are automatically prepared and cached
row := pool.QueryRow(ctx, "SELECT * FROM users WHERE id = $1", id)

// Disable for specific queries (e.g., dynamic WHERE clauses)
config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
```

#### Batch Operations

```go
batch := &pgx.Batch{}
for _, user := range users {
    batch.Queue("INSERT INTO users (email, name) VALUES ($1, $2)",
        user.Email, user.Name)
}

br := pool.SendBatch(ctx, batch)
defer br.Close()

for range users {
    _, err := br.Exec()
    if err != nil {
        return err
    }
}
```

#### COPY Protocol

```go
// For bulk inserts (fastest method)
copyCount, err := pool.CopyFrom(
    ctx,
    pgx.Identifier{"users"},
    []string{"email", "name"},
    pgx.CopyFromRows(rows),
)
```

### Monitoring

```go
func LogPoolStats(pool *pgxpool.Pool) {
    stats := pool.Stat()
    log.Printf("Pool stats - "+
        "Total: %d, Idle: %d, Acquired: %d, "+
        "MaxConns: %d, AcquireCount: %d",
        stats.TotalConns(),
        stats.IdleConns(),
        stats.AcquiredConns(),
        stats.MaxConns(),
        stats.AcquireCount(),
    )
}

// Call periodically
ticker := time.NewTicker(1 * time.Minute)
go func() {
    for range ticker.C {
        LogPoolStats(pool)
    }
}()
```

---

## 4. Database Testing in Go

### Testing Strategy

#### Unit Tests
- Test business logic without database
- Mock repository interfaces
- Fast execution

#### Integration Tests
- Test with real PostgreSQL instance
- Use Testcontainers for isolation
- Each test gets clean database

### Testcontainers Setup

#### Installation

```bash
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
```

#### Basic Setup

```go
package db_test

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
)

type TestDatabase struct {
    Container *postgres.PostgresContainer
    DB        *bun.DB
}

func SetupTestDB(t *testing.T) *TestDatabase {
    ctx := context.Background()

    // Create PostgreSQL container
    pgContainer, err := postgres.Run(ctx,
        "postgres:16-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("testuser"),
        postgres.WithPassword("testpass"),
        postgres.WithInitScripts("../migrations/001_init.sql"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).
                WithStartupTimeout(30*time.Second),
        ),
    )
    if err != nil {
        t.Fatalf("failed to start container: %s", err)
    }

    // Get connection string
    connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    if err != nil {
        t.Fatalf("failed to get connection string: %s", err)
    }

    // Create Bun DB instance
    sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(connStr)))
    db := bun.NewDB(sqldb, pgdialect.New())

    // Cleanup on test completion
    t.Cleanup(func() {
        db.Close()
        if err := pgContainer.Terminate(ctx); err != nil {
            t.Fatalf("failed to terminate container: %s", err)
        }
    })

    return &TestDatabase{
        Container: pgContainer,
        DB:        db,
    }
}
```

#### Test Example

```go
func TestUserRepository_Create(t *testing.T) {
    testDB := SetupTestDB(t)
    ctx := context.Background()

    repo := NewUserRepository(testDB.DB)

    tests := []struct {
        name    string
        user    *User
        wantErr bool
    }{
        {
            name: "valid user",
            user: &User{
                Email: "test@example.com",
                Name:  "Test User",
            },
            wantErr: false,
        },
        {
            name: "duplicate email",
            user: &User{
                Email: "test@example.com",
                Name:  "Another User",
            },
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := repo.Create(ctx, tt.user)
            if (err != nil) != tt.wantErr {
                t.Errorf("Create() error = %v, wantErr %v", err, tt.wantErr)
            }

            if !tt.wantErr && tt.user.ID == 0 {
                t.Error("expected ID to be set after create")
            }
        })
    }
}
```

### Testing with Transactions

```go
func TestUserRepository_WithTransaction(t *testing.T) {
    testDB := SetupTestDB(t)
    ctx := context.Background()

    repo := NewUserRepository(testDB.DB)

    // Use transaction for isolation
    err := testDB.DB.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
        user := &User{Email: "tx@example.com", Name: "TX User"}

        if err := repo.CreateInTx(ctx, tx, user); err != nil {
            return err
        }

        // Verify within transaction
        found, err := repo.FindByEmailInTx(ctx, tx, user.Email)
        if err != nil {
            return err
        }

        if found.ID != user.ID {
            t.Errorf("expected ID %d, got %d", user.ID, found.ID)
        }

        // Transaction will rollback after test
        return nil
    })

    if err != nil {
        t.Fatalf("transaction failed: %v", err)
    }
}
```

### Snapshot Testing (Fast Test Isolation)

```go
func TestUserRepository_WithSnapshot(t *testing.T) {
    testDB := SetupTestDB(t)
    ctx := context.Background()

    // Create snapshot after initial setup
    snapshot := testDB.Container.Snapshot(ctx)
    t.Cleanup(func() {
        // Restore snapshot after test
        snapshot.Restore(ctx)
    })

    repo := NewUserRepository(testDB.DB)

    // Test operations...
    user := &User{Email: "snap@example.com", Name: "Snap User"}
    err := repo.Create(ctx, user)
    if err != nil {
        t.Fatalf("failed to create user: %v", err)
    }

    // Database will be restored to snapshot state after test
}
```

### Performance Optimization for Tests

#### Use Parallel Tests

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name string
        // test cases...
    }{
        // test data...
    }

    for _, tt := range tests {
        tt := tt // capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // Run tests in parallel

            testDB := SetupTestDB(t)
            // Test logic...
        })
    }
}
```

#### Disable fsync for Speed

```go
pgContainer, err := postgres.Run(ctx,
    "postgres:16-alpine",
    postgres.WithDatabase("testdb"),
    testcontainers.WithConfigModifier(func(config *container.Config) {
        // Disable fsync for faster tests
        config.Cmd = append(config.Cmd, "-c", "fsync=off")
    }),
)
```

### Testing Best Practices

1. **Use Table-Driven Tests**
   ```go
   tests := []struct {
       name    string
       input   Input
       want    Output
       wantErr bool
   }{
       // test cases
   }
   ```

2. **Test Error Cases**
   - Unique constraint violations
   - Foreign key violations
   - NOT NULL violations
   - Connection errors

3. **Clean Up Resources**
   - Use `t.Cleanup()` for automatic cleanup
   - Terminate containers after tests
   - Close database connections

4. **Verify Database State**
   ```go
   // Verify record was actually created
   var count int
   err := db.NewSelect().
       Model((*User)(nil)).
       Where("email = ?", user.Email).
       Count(ctx)

   if count != 1 {
       t.Errorf("expected 1 user, got %d", count)
   }
   ```

---

## 5. Error Handling Patterns

### PostgreSQL Error Types

#### Using pgconn.PgError

```go
import (
    "errors"
    "fmt"

    "github.com/jackc/pgx/v5/pgconn"
)

func HandleDatabaseError(err error) error {
    if err == nil {
        return nil
    }

    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) {
        switch pgErr.Code {
        case "23505": // unique_violation
            return fmt.Errorf("duplicate record: %s", pgErr.Detail)
        case "23503": // foreign_key_violation
            return fmt.Errorf("referenced record does not exist: %s", pgErr.Detail)
        case "23502": // not_null_violation
            return fmt.Errorf("required field is missing: %s", pgErr.ColumnName)
        case "23514": // check_violation
            return fmt.Errorf("value violates constraint: %s", pgErr.Detail)
        default:
            return fmt.Errorf("database error [%s]: %s", pgErr.Code, pgErr.Message)
        }
    }

    return fmt.Errorf("unexpected error: %w", err)
}
```

### Repository Error Patterns

```go
package repository

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
)

var (
    ErrNotFound      = errors.New("record not found")
    ErrDuplicate     = errors.New("duplicate record")
    ErrForeignKey    = errors.New("foreign key violation")
    ErrInvalidInput  = errors.New("invalid input")
)

type UserRepository struct {
    db *bun.DB
}

func (r *UserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    user := new(User)

    err := r.db.NewSelect().
        Model(user).
        Where("id = ?", id).
        Scan(ctx)

    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrNotFound
        }
        return nil, fmt.Errorf("failed to find user: %w", err)
    }

    return user, nil
}

func (r *UserRepository) Create(ctx context.Context, user *User) error {
    _, err := r.db.NewInsert().
        Model(user).
        Exec(ctx)

    if err != nil {
        return HandleDatabaseError(err)
    }

    return nil
}

func (r *UserRepository) Update(ctx context.Context, user *User) error {
    result, err := r.db.NewUpdate().
        Model(user).
        WherePK().
        Exec(ctx)

    if err != nil {
        return HandleDatabaseError(err)
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("failed to get rows affected: %w", err)
    }

    if rowsAffected == 0 {
        return ErrNotFound
    }

    return nil
}
```

### Service Layer Error Handling

```go
package service

import (
    "context"
    "errors"
    "fmt"
)

type UserService struct {
    repo *repository.UserRepository
}

func (s *UserService) CreateUser(ctx context.Context, email, name string) (*User, error) {
    // Validation
    if email == "" {
        return nil, fmt.Errorf("%w: email is required", repository.ErrInvalidInput)
    }

    user := &User{
        Email: email,
        Name:  name,
    }

    err := s.repo.Create(ctx, user)
    if err != nil {
        if errors.Is(err, repository.ErrDuplicate) {
            return nil, fmt.Errorf("user with email %s already exists", email)
        }
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return user, nil
}

func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            return nil, fmt.Errorf("user %d not found", id)
        }
        return nil, fmt.Errorf("failed to get user: %w", err)
    }

    return user, nil
}
```

### HTTP Handler Error Handling

```go
package handler

import (
    "errors"
    "net/http"

    "github.com/gin-gonic/gin"
)

func (h *UserHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
        return
    }

    user, err := h.service.CreateUser(c.Request.Context(), req.Email, req.Name)
    if err != nil {
        if errors.Is(err, repository.ErrDuplicate) {
            c.JSON(http.StatusConflict, gin.H{"error": "user already exists"})
            return
        }
        if errors.Is(err, repository.ErrInvalidInput) {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        // Log internal error
        log.Printf("failed to create user: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
        return
    }

    c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) GetUser(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
        return
    }

    user, err := h.service.GetUser(c.Request.Context(), id)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
            return
        }

        log.Printf("failed to get user: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
        return
    }

    c.JSON(http.StatusOK, user)
}
```

### Transaction Error Handling

```go
func (s *ConversationService) StartConversation(
    ctx context.Context,
    userID int64,
    topic string,
) (*Conversation, error) {
    var conversation *Conversation

    err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
        // Create conversation
        conversation = &Conversation{
            UserID: userID,
            Topic:  topic,
        }

        if _, err := tx.NewInsert().Model(conversation).Exec(ctx); err != nil {
            return fmt.Errorf("failed to create conversation: %w", err)
        }

        // Create initial message
        message := &Message{
            ConversationID: conversation.ID,
            Content:        "Conversation started",
            Role:           "system",
        }

        if _, err := tx.NewInsert().Model(message).Exec(ctx); err != nil {
            return fmt.Errorf("failed to create initial message: %w", err)
        }

        return nil
    })

    if err != nil {
        return nil, HandleDatabaseError(err)
    }

    return conversation, nil
}
```

### Best Practices

1. **Use Sentinel Errors**
   ```go
   var (
       ErrNotFound = errors.New("not found")
       ErrDuplicate = errors.New("duplicate")
   )
   ```

2. **Wrap Errors with Context**
   ```go
   return fmt.Errorf("failed to create user %s: %w", email, err)
   ```

3. **Check Specific Error Types**
   ```go
   if errors.Is(err, sql.ErrNoRows) {
       return ErrNotFound
   }
   ```

4. **Don't Expose Internal Errors**
   ```go
   // Good: generic error message to client
   c.JSON(500, gin.H{"error": "internal server error"})

   // Good: log detailed error internally
   log.Printf("database error: %v", err)
   ```

5. **Validate Early**
   ```go
   if email == "" {
       return ErrInvalidInput
   }
   ```

---

## 6. Recommended Project Structure

```
go/
├── cmd/
│   ├── api/
│   │   └── main.go                 # API server entry point
│   └── migrate/
│       └── main.go                 # Migration runner
│
├── internal/
│   ├── config/
│   │   └── database.go             # DB configuration
│   │
│   ├── db/
│   │   ├── migrations/             # Atlas migrations
│   │   │   ├── 20250101000000_init.sql
│   │   │   ├── 20250101000001_create_users.sql
│   │   │   ├── 20250101000002_create_conversations.sql
│   │   │   ├── 20250101000003_create_messages.sql
│   │   │   ├── 20250101000004_create_user_settings.sql
│   │   │   └── atlas.sum
│   │   │
│   │   ├── models/                 # Bun models
│   │   │   ├── user.go
│   │   │   ├── conversation.go
│   │   │   ├── message.go
│   │   │   └── user_settings.go
│   │   │
│   │   └── repository/             # Repository layer
│   │       ├── user_repo.go
│   │       ├── user_repo_test.go
│   │       ├── conversation_repo.go
│   │       ├── conversation_repo_test.go
│   │       ├── message_repo.go
│   │       └── message_repo_test.go
│   │
│   ├── service/                    # Business logic
│   │   ├── user_service.go
│   │   ├── conversation_service.go
│   │   └── message_service.go
│   │
│   ├── handler/                    # HTTP handlers
│   │   ├── user_handler.go
│   │   └── conversation_handler.go
│   │
│   └── testutil/                   # Test utilities
│       └── testdb.go               # Testcontainers setup
│
├── atlas.hcl                       # Atlas configuration
├── docker-compose.yaml             # Local development
├── go.mod
└── go.sum
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1)

1. **Setup Dependencies**
   ```bash
   go get github.com/uptrace/bun
   go get github.com/uptrace/bun/driver/pgdriver
   go get github.com/uptrace/bun/dialect/pgdialect
   go get github.com/jackc/pgx/v5
   go get github.com/jackc/pgx/v5/pgxpool
   ```

2. **Configure Database Connection**
   - Create `internal/config/database.go`
   - Setup connection pooling
   - Add environment variables

3. **Setup Atlas**
   ```bash
   # Install Atlas
   curl -sSf https://atlasgo.sh | sh

   # Create atlas.hcl configuration
   # Create migrations directory
   ```

4. **Define Models**
   - Create User model
   - Create Conversation model
   - Create Message model
   - Create UserSettings model

### Phase 2: Database Schema (Week 1-2)

1. **Create Schema Files**
   - `schema/users.sql`
   - `schema/conversations.sql`
   - `schema/messages.sql`
   - `schema/user_settings.sql`

2. **Generate Initial Migrations**
   ```bash
   atlas migrate diff init --env local
   ```

3. **Apply Migrations**
   ```bash
   atlas migrate apply --env local
   ```

### Phase 3: Repository Layer (Week 2)

1. **Implement UserRepository**
   - CRUD operations
   - Query methods
   - Transaction support

2. **Implement ConversationRepository**
   - CRUD operations
   - Relations with User and Messages
   - Filtering and pagination

3. **Implement MessageRepository**
   - CRUD operations
   - Bulk inserts
   - Ordering and filtering

4. **Write Tests**
   - Setup Testcontainers
   - Write integration tests
   - Verify error handling

### Phase 4: Service Layer (Week 2-3)

1. **Implement UserService**
   - User registration
   - User profile management
   - Authentication helpers

2. **Implement ConversationService**
   - Start/end conversations
   - Load conversation history
   - Transaction handling

3. **Implement MessageService**
   - Send messages
   - Receive messages
   - Bulk operations

### Phase 5: Integration & Testing (Week 3)

1. **Integration Tests**
   - End-to-end flow tests
   - Performance tests
   - Error scenario tests

2. **Documentation**
   - API documentation
   - Database schema docs
   - Migration guides

3. **Performance Tuning**
   - Add indexes
   - Optimize queries
   - Monitor pool metrics

---

## 8. Environment Configuration

### Development (.env.local)

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/talk_dev?sslmode=disable&pool_max_conns=10&pool_min_conns=2

# Connection Pool (optional, can be in URL)
DB_MAX_CONNS=10
DB_MIN_CONNS=2
DB_MAX_CONN_LIFETIME=1h
DB_MAX_CONN_IDLE_TIME=30m

# Migration
ATLAS_ENV=local
```

### Docker Compose (docker-compose.yaml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: talk_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  go:
    build: ./go
    environment:
      DATABASE_URL: postgres://user:password@postgres:5432/talk_dev?sslmode=disable
    ports:
      - "8000:8000"
      - "2349:2349"  # Delve debugger
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./go:/app
    command: go run main.go

volumes:
  postgres_data:
```

### Production

```bash
# Use connection pooler (PgBouncer) for production
DATABASE_URL=postgres://user:password@pgbouncer:6432/talk_prod?pool_max_conns=50&pool_min_conns=10

# Adjust for production workload
DB_MAX_CONNS=50
DB_MIN_CONNS=10

# Enable prepared statements only if not using PgBouncer
# If using PgBouncer, set: DefaultQueryExecMode=pgx.QueryExecModeDescribeExec
```

---

## 9. Common PostgreSQL Error Codes

```go
const (
    // Class 23 — Integrity Constraint Violation
    ErrCodeUniqueViolation      = "23505"
    ErrCodeForeignKeyViolation  = "23503"
    ErrCodeNotNullViolation     = "23502"
    ErrCodeCheckViolation       = "23514"

    // Class 42 — Syntax Error or Access Rule Violation
    ErrCodeUndefinedTable       = "42P01"
    ErrCodeUndefinedColumn      = "42703"
    ErrCodeDuplicateTable       = "42P07"

    // Class 53 — Insufficient Resources
    ErrCodeTooManyConnections   = "53300"
    ErrCodeOutOfMemory          = "53200"

    // Class 08 — Connection Exception
    ErrCodeConnectionException  = "08000"
    ErrCodeConnectionFailure    = "08006"
)
```

---

## 10. Decision Summary & Rationale

### Why Bun ORM?

✅ **Chosen:** Bun ORM

**Rationale:**
- **Performance**: Minimal overhead (< 5%), faster than GORM
- **SQL Transparency**: Generates readable SQL, easy to debug
- **Type Safety**: Go-first design with compile-time checks
- **PostgreSQL Support**: Native support for advanced types
- **Team Familiarity**: SQL-first approach natural for developers
- **OpenTelemetry**: Built-in monitoring support

**Alternatives Considered:**
- **GORM**: More features but slower, hides SQL
- **sqlc**: Type-safe but requires writing all SQL manually
- **Ent**: Great code generation but steeper learning curve

### Why Atlas?

✅ **Chosen:** Atlas

**Rationale:**
- **Modern Approach**: Declarative migrations like Terraform
- **Error Recovery**: Statement-level tracking, auto-rollback
- **CI/CD Integration**: Built-in linting and validation
- **Flexibility**: Supports both versioned and declarative workflows
- **Future-Proof**: Active development, modern architecture

**Alternatives Considered:**
- **golang-migrate**: Popular but less error recovery
- **Goose**: Simple but lacks Atlas's modern features
- **Manual SQL**: Flexible but error-prone

### Why pgxpool?

✅ **Chosen:** pgxpool (pgx v5 driver)

**Rationale:**
- **PostgreSQL-Native**: Built specifically for PostgreSQL
- **Performance**: Faster than lib/pq, prepared statement caching
- **Features**: Native types, COPY protocol, LISTEN/NOTIFY
- **Modern**: Actively maintained, Go best practices
- **Community**: Recommended by PostgreSQL community

**Alternatives Considered:**
- **lib/pq**: Older, slower, maintenance mode
- **database/sql**: Generic, missing PostgreSQL-specific features

### Why Testcontainers?

✅ **Chosen:** Testcontainers

**Rationale:**
- **Real Database**: Tests against actual PostgreSQL
- **Isolation**: Each test gets clean environment
- **Docker Integration**: Seamless with existing Docker setup
- **Snapshots**: Fast test isolation without container recreation
- **Industry Standard**: Widely used across languages

**Alternatives Considered:**
- **Mocks**: Fast but don't catch real DB issues
- **Shared DB**: Faster but potential test interference
- **Manual Docker**: More control but harder to manage

---

## 11. Key Metrics to Monitor

### Connection Pool Metrics

```go
// Monitor these metrics
stats := pool.Stat()

metrics := map[string]int64{
    "total_conns":      stats.TotalConns(),      // Should stay ≤ MaxConns
    "idle_conns":       stats.IdleConns(),       // Should be ≥ MinConns
    "acquired_conns":   stats.AcquiredConns(),   // Active connections
    "acquire_count":    stats.AcquireCount(),    // Total acquisitions
    "acquire_duration": stats.AcquireDuration(), // Avg acquire time
    "new_conns_count":  stats.NewConnsCount(),   // New connections created
}

// Alert thresholds
if stats.AcquiredConns() >= int32(float64(stats.MaxConns())*0.8) {
    log.Warn("Connection pool at 80% capacity")
}

if stats.AcquireDuration() > 100*time.Millisecond {
    log.Warn("High connection acquire latency")
}
```

### Query Performance

```go
// Monitor slow queries
threshold := 100 * time.Millisecond

db.AddQueryHook(&SlowQueryHook{
    Threshold: threshold,
    Logger:    log,
})

type SlowQueryHook struct {
    Threshold time.Duration
    Logger    *log.Logger
}

func (h *SlowQueryHook) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
    return ctx
}

func (h *SlowQueryHook) AfterQuery(ctx context.Context, event *bun.QueryEvent) {
    duration := time.Since(event.StartTime)
    if duration > h.Threshold {
        h.Logger.Printf("Slow query [%s]: %s", duration, event.Query)
    }
}
```

### Database Health

```bash
# PostgreSQL queries to monitor

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 minutes';

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

---

## 12. Additional Resources

### Documentation
- [Bun ORM Guide](https://bun.uptrace.dev/guide/)
- [Atlas Documentation](https://atlasgo.io/docs)
- [pgx Documentation](https://pkg.go.dev/github.com/jackc/pgx/v5)
- [Testcontainers Go](https://golang.testcontainers.org/)

### Community
- [Bun GitHub](https://github.com/uptrace/bun)
- [Atlas GitHub](https://github.com/ariga/atlas)
- [pgx GitHub](https://github.com/jackc/pgx)

### Learning Resources
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Go Database Best Practices](https://go.dev/doc/database/overview)
- [Connection Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)

---

## Conclusion

This research provides a comprehensive foundation for implementing a production-ready PostgreSQL database infrastructure for your Go application. The recommended stack (Bun + Atlas + pgxpool + Testcontainers) balances performance, developer experience, and maintainability.

### Next Steps

1. **Review this document** with the team
2. **Setup development environment** with Docker Compose
3. **Implement Phase 1** (Foundation)
4. **Create initial migrations** for User, Conversation, Message, UserSettings
5. **Write repository layer** with comprehensive tests
6. **Integrate with existing API** (Gin + Connect RPC)
7. **Monitor and optimize** based on real-world usage

### Success Criteria

- ✅ Database connection pool properly configured
- ✅ All entities modeled with Bun
- ✅ Migrations managed with Atlas
- ✅ Repository layer tested with Testcontainers
- ✅ Error handling implemented throughout
- ✅ Monitoring and metrics in place
- ✅ Documentation complete

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Maintained By:** Development Team
