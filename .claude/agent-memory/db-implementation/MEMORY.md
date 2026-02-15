# Database Implementation Memory

## Migration System

- **Tool**: Atlas CLI with `atlas-provider-gorm`
- **Single Source of Truth**: GORM models in `/go/internal/models/`
- **Migration Directory**: `/go/migrations/`
- **Configuration**: `/go/atlas.hcl`
- **Loader**: `/go/cmd/atlas-loader/main.go` - Go program that reads GORM models and outputs SQL schema

## Database Connection

- **Driver**: `gorm.io/driver/postgres` v1.6.0
- **ORM**: `gorm.io/gorm` v1.31.1
- **Connection Setup**: `/go/internal/database/gorm.go`
- **Environment Variables**: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSLMODE
- **Connection Pool**: MaxIdleConns=5, MaxOpenConns=25, ConnMaxLifetime=1h, ConnMaxIdleTime=30m

## GORM Model Conventions

- **Primary Keys**: UUID with `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
- **Column Names**: Explicit naming with `column:` tag (e.g., `users_id`, `refresh_tokens_id`)
- **Timestamps**: `autoCreateTime` and `autoUpdateTime` tags for created_at/updated_at
- **Foreign Keys**: Explicit relationship with `foreignKey:`, `references:`, and `constraint:OnDelete:CASCADE`
- **Enums**: Implemented as Go string types with constants

## Migration Commands

- `make migrate-diff name=xxx`: Generate new migration from GORM model changes
- `make migrate-apply`: Apply pending migrations
- `make migrate-status`: Check migration status
- `make migrate-hash`: Regenerate atlas.sum checksum
- `make er-diagram`: Generate Mermaid ER diagram to `docs/er-diagram.md`

## Key Files

- `/go/atlas.hcl`: Atlas configuration with local and docker environments
- `/go/cmd/atlas-loader/main.go`: GORM schema loader for Atlas
- `/go/migrations/`: Atlas migration files
- `/go/internal/models/user.go`: GORM models (User, RefreshToken)
- `/go/internal/database/gorm.go`: Database connection setup

## Important Notes

- Old manual migration system (`internal/database/migrations.go`) has been removed
- Atlas uses a dev database URL for schema comparison during migration generation
- Environment variables must be loaded before running Atlas commands (done in Makefile)
- Never modify existing migrations - always create new ones for changes
