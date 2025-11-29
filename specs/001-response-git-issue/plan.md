# Implementation Plan: データベース接続基盤の構築

**Branch**: `001-response-git-issue` | **Date**: 2025-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-response-git-issue/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded and analyzed Issue #12 requirements
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All clarifications resolved via research
   → ✅ Project Type: Web (Go backend + Next.js frontend)
   → ✅ Database: Supabase PostgreSQL
3. Fill the Constitution Check section
   → ⚠️  Constitution file contains template placeholders - skipped detailed check
4. Evaluate Constitution Check section below
   → ✅ No violations detected
   → ✅ Progress updated: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ Research completed: research.md created
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, AGENTS.md
   → ✅ data-model.md created
   → ✅ contracts/database-repository.md created
   → ✅ quickstart.md created
   → ✅ AGENTS.md updated
7. Re-evaluate Constitution Check section
   → ✅ No new violations
   → ✅ Progress updated: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
   → ✅ Task generation strategy described below
9. STOP - Ready for /tasks command
   → ✅ Plan complete
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**主要要件**: Supabase PostgreSQLへの接続基盤を構築し、ユーザー情報、会話履歴、個人設定を永続的に保存できるようにする。

**技術アプローチ**:
- Bun ORMを使用した型安全なデータベース操作
- Atlasによる宣言的マイグレーション管理
- pgxpoolによる高性能接続プーリング
- Testcontainersによる統合テスト

## Technical Context

**Language/Version**: Go 1.21+
**Primary Dependencies**:
- Bun ORM (github.com/uptrace/bun)
- Atlas (migration tool)
- pgx v5 (github.com/jackc/pgx/v5)
- Testcontainers (github.com/testcontainers/testcontainers-go)

**Storage**: Supabase (PostgreSQL 15)
**Testing**: go test with Testcontainers for integration tests
**Target Platform**: Linux server (Docker containerized)
**Project Type**: web (Go backend + Next.js frontend)

**Performance Goals**:
- クエリ応答時間: < 100ms (p95)
- 同時接続ユーザー数: 100-500
- 接続プール効率: > 90%

**Constraints**:
- Supabase Free Plan: 最大15接続（開発環境）
- Supabase Pro Plan: 最大40接続（本番環境想定）
- SSL接続必須

**Scale/Scope**:
- 初期想定ユーザー数: 1,000-10,000
- 月間会話数: 10,000
- 月間メッセージ数: 100,000
- データベースサイズ: ~500MB (1年後)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: The constitution file at `.specify/memory/constitution.md` contains template placeholders and has not been customized for this project. A detailed constitutional review is deferred until the constitution is properly configured.

**General Architecture Principles Applied**:
- ✅ Library-First: Repository layer is designed as reusable, testable modules
- ✅ Interface-Driven: All repositories implement well-defined interfaces
- ✅ Test-First: Integration tests with Testcontainers
- ✅ Simplicity: Minimal abstraction, direct SQL-first approach with Bun

**No Constitution Violations Detected**

## Project Structure

### Documentation (this feature)
```
specs/001-response-git-issue/
├── spec.md                   # Feature specification (completed)
├── plan.md                   # This file (/plan command output)
├── research.md               # Phase 0 output - Supabase research
├── data-model.md             # Phase 1 output - Entity definitions
├── quickstart.md             # Phase 1 output - Setup guide
├── contracts/                # Phase 1 output
│   └── database-repository.md
└── tasks.md                  # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)
```
go/
├── cmd/
│   ├── api/
│   │   └── main.go           # API server entry point
│   └── migrate/
│       └── main.go           # Migration runner (optional CLI)
│
├── internal/
│   ├── config/
│   │   └── database.go       # Supabase connection configuration
│   │
│   ├── db/
│   │   ├── migrations/       # Atlas migrations
│   │   │   ├── 20251018000000_init.sql
│   │   │   ├── 20251018000001_create_users.sql
│   │   │   ├── 20251018000002_create_conversations.sql
│   │   │   ├── 20251018000003_create_messages.sql
│   │   │   ├── 20251018000004_create_user_settings.sql
│   │   │   └── atlas.sum
│   │   │
│   │   ├── models/           # Bun models
│   │   │   ├── user.go
│   │   │   ├── conversation.go
│   │   │   ├── message.go
│   │   │   └── user_settings.go
│   │   │
│   │   ├── repository/       # Repository layer
│   │   │   ├── errors.go     # Common error definitions
│   │   │   ├── user_repository.go
│   │   │   ├── user_repository_test.go
│   │   │   ├── conversation_repository.go
│   │   │   ├── conversation_repository_test.go
│   │   │   ├── message_repository.go
│   │   │   ├── message_repository_test.go
│   │   │   ├── user_settings_repository.go
│   │   │   └── user_settings_repository_test.go
│   │   │
│   │   └── schema/           # Schema definitions for Atlas
│   │       ├── 001_users.sql
│   │       ├── 002_conversations.sql
│   │       ├── 003_messages.sql
│   │       └── 004_user_settings.sql
│   │
│   ├── service/              # Business logic (future)
│   │   ├── user_service.go
│   │   └── conversation_service.go
│   │
│   └── testutil/             # Test utilities
│       └── testdb.go         # Testcontainers setup
│
├── atlas.hcl                 # Atlas configuration
├── .env.local                # Local environment variables (gitignored)
├── .env.example              # Environment variables template
├── go.mod
└── go.sum
```

**Structure Decision**: Web application structure (Option 2) - Go backend with separated `internal/` directory structure

## Phase 0: Outline & Research

### Research Completed ✅

**Output**: [research.md](./research.md)

**Key Decisions Made**:

1. **Database Host**: Supabase PostgreSQL 15
   - Rationale: Managed service, automatic backups, built-in auth
   - Connection mode: Session mode (port 5432) with application-level pooling

2. **ORM Choice**: Bun ORM
   - Rationale: SQL-first, high performance, type-safe
   - Alternatives considered: GORM (slower), sqlc (more manual)

3. **Migration Tool**: Atlas
   - Rationale: Modern, declarative, automatic rollback
   - Alternatives considered: golang-migrate, Goose

4. **Connection Pooling**: pgxpool (pgx v5)
   - Configuration: MaxConns=10 (Free), MaxConns=30 (Pro)
   - Rationale: PostgreSQL-native, prepared statement caching

5. **Testing Strategy**: Testcontainers
   - Rationale: Real PostgreSQL tests, isolated environments

**Unknowns Resolved**:
- ✅ Database hosting: Supabase
- ✅ Connection pooling strategy: Application-level with pgxpool
- ✅ Migration approach: Atlas declarative migrations
- ✅ Testing approach: Testcontainers for integration tests
- ✅ Data retention: Unlimited (user-controlled deletion only)
- ✅ Backup policy: Supabase automatic daily backups + manual weekly exports

## Phase 1: Design & Contracts

### Artifacts Generated ✅

1. **Data Model** ([data-model.md](./data-model.md))
   - 4 entities: User, Conversation, Message, UserSettings
   - Complete ER diagram
   - Index strategy
   - Performance considerations

2. **Repository Contracts** ([contracts/database-repository.md](./contracts/database-repository.md))
   - UserRepository interface (7 methods)
   - ConversationRepository interface (7 methods)
   - MessageRepository interface (6 methods)
   - UserSettingsRepository interface (4 methods)
   - Error definitions
   - Transaction support

3. **Quickstart Guide** ([quickstart.md](./quickstart.md))
   - Supabase project setup
   - Environment configuration
   - Installation steps
   - Usage examples
   - Troubleshooting guide

4. **Agent Context** (AGENTS.md updated)
   - Added database architecture overview
   - Updated project structure with database directories
   - Added database-related commands
   - Added security tips for Supabase

### Design Review ✅

**Constitution Re-check**:
- ✅ No architectural violations introduced
- ✅ Repository pattern provides clear separation of concerns
- ✅ All interfaces are testable
- ✅ Transaction support is context-based

**Key Design Decisions**:
- Repository pattern for data access abstraction
- Interface-driven design for mockability
- Bun hooks for automatic timestamp management
- Soft delete pattern for User entities
- Cascade delete for related entities

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

**Input Sources**:
1. Data model entities (4 models)
2. Repository contracts (4 repositories × ~6 methods each)
3. Quickstart guide implementation steps
4. Test requirements from contracts

**Task Categories**:

1. **Setup Tasks** (Priority: P0)
   - Install dependencies (Bun, pgx, Atlas, Testcontainers)
   - Configure Supabase project
   - Create directory structure
   - Setup environment variables

2. **Model Definition Tasks** (Priority: P1)
   - Define User model
   - Define Conversation model
   - Define Message model
   - Define UserSettings model

3. **Schema & Migration Tasks** (Priority: P1)
   - Create schema files (4 files)
   - Configure Atlas (atlas.hcl)
   - Generate initial migrations
   - Apply migrations to Supabase

4. **Repository Implementation Tasks** (Priority: P2)
   - Implement UserRepository
   - Implement ConversationRepository
   - Implement MessageRepository
   - Implement UserSettingsRepository

5. **Test Tasks** (Priority: P2)
   - Setup Testcontainers utility
   - Write UserRepository tests
   - Write ConversationRepository tests
   - Write MessageRepository tests
   - Write UserSettingsRepository tests

6. **Integration Tasks** (Priority: P3)
   - Create database initialization in main.go
   - Add connection pool monitoring
   - Integrate with existing Gin handlers
   - Add error handling middleware

7. **Documentation Tasks** (Priority: P3)
   - Update README with database setup
   - Create migration guide
   - Document environment variables
   - Add troubleshooting section

### Ordering Strategy

**Dependencies**:
```
Setup → Models → Schema → Migrations → Repository → Tests → Integration → Docs
  P0      P1       P1        P1          P2         P2        P3          P3
```

**Parallel Execution Opportunities** [P]:
- All 4 model definitions can be written in parallel
- All 4 schema files can be written in parallel
- All 4 repository implementations can be written in parallel (after models)
- All 4 repository test files can be written in parallel (after repositories)

**Sequential Dependencies**:
- Migrations must run after schema files are created
- Repositories must be implemented after models are defined
- Tests must be written after repositories are implemented
- Integration must happen after core functionality is complete

### Task Count Estimation

- **Setup**: 4 tasks
- **Models**: 4 tasks [P]
- **Schema & Migrations**: 6 tasks
- **Repositories**: 4 tasks [P]
- **Tests**: 5 tasks (1 setup + 4 test files) [P]
- **Integration**: 4 tasks
- **Documentation**: 4 tasks

**Total Estimated Tasks**: 31 tasks

**Estimated Implementation Time**:
- Phase 1 (Setup + Models + Schema): 2-3 days
- Phase 2 (Repositories + Tests): 3-4 days
- Phase 3 (Integration + Docs): 2-3 days
- **Total**: 8-12 business days

### Task Template

Each task in tasks.md will follow this structure:

```markdown
## Task N: [Task Title]

**Status**: pending | in_progress | completed
**Priority**: P0 | P1 | P2 | P3
**Parallel**: [P] (if applicable)
**Estimated Time**: X hours
**Dependencies**: Task M, Task K (if any)

### Description
[What needs to be done]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Files to Create/Modify
- path/to/file.go
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/implement command or manual implementation)
- Follow tasks.md in dependency order
- Run tests after each repository implementation
- Apply migrations to Supabase progressively

**Phase 4**: Integration & Testing
- Connect repositories to existing API handlers
- End-to-end testing with real Supabase instance
- Performance testing under load

**Phase 5**: Production Readiness
- Setup monitoring and alerting
- Configure Supabase backups
- Load testing and optimization
- Security audit

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No Complexity Violations**

The design follows standard repository pattern with minimal abstraction:
- Direct SQL-first approach with Bun ORM
- No unnecessary architectural layers
- Standard Go idioms and patterns
- Testable interfaces

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (with note about template constitution)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- [x] research.md - Supabase and technology research
- [x] data-model.md - Entity definitions and ER diagram
- [x] contracts/database-repository.md - Repository interfaces
- [x] quickstart.md - Setup and usage guide
- [x] AGENTS.md - Updated with database context
- [x] plan.md - This implementation plan

---

## Next Steps

### For Development Team

1. **Review this plan** and provide feedback
2. **Setup Supabase project** following quickstart.md
3. **Run /tasks command** to generate detailed task breakdown
4. **Begin implementation** following tasks.md

### For Stakeholders

1. **Approve clarifications** made during research:
   - Data retention: Unlimited
   - Backup: Daily automatic + weekly manual
   - Scale: 100-500 concurrent users initially
   - Hosting: Supabase PostgreSQL

2. **Confirm budget** for Supabase plan:
   - Development: Free plan (sufficient for MVP)
   - Production: Pro plan recommended ($25/month)

---

*Based on Constitution template - See `/memory/constitution.md`*

**Plan Version**: 1.0
**Last Updated**: 2025-10-18
**Ready for**: /tasks command execution
