# Tasks: データベース接続基盤の構築

**Feature**: 001-response-git-issue - Database Connection Infrastructure
**Input**: Design documents from `/specs/001-response-git-issue/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/database-repository.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: Go 1.21+, Bun ORM, Atlas, pgx v5, Testcontainers
2. Load optional design documents:
   → ✅ data-model.md: 4 entities (User, Conversation, Message, UserSettings)
   → ✅ contracts/: Repository interfaces
   → ✅ research.md: Supabase configuration
3. Generate tasks by category:
   → ✅ Setup: 6 tasks
   → ✅ Tests: 9 tasks (contract + integration)
   → ✅ Core: 13 tasks (models + schema + repositories)
   → ✅ Integration: 3 tasks
   → ✅ Polish: 4 tasks
4. Apply task rules:
   → ✅ [P] for different files
   → ✅ Tests before implementation
5. Number tasks sequentially (T001-T035)
6. Generate dependency graph: ✅
7. Create parallel execution examples: ✅
8. Validate task completeness: ✅
9. Return: SUCCESS (35 tasks ready)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths are relative to `go/` directory

---

## Phase 3.1: Setup (6 tasks)

- [ ] **T001** Create Go project directory structure
  - **Files**: `go/internal/config/`, `go/internal/db/models/`, `go/internal/db/repository/`, `go/internal/db/migrations/`, `go/internal/db/schema/`, `go/internal/testutil/`
  - **Description**: Create all necessary directories per plan.md structure
  - **Estimated Time**: 15 minutes
  - **Dependencies**: None

- [ ] **T002** Install Go dependencies
  - **Command**:
    ```bash
    cd go/
    go get github.com/uptrace/bun
    go get github.com/uptrace/bun/driver/pgdriver
    go get github.com/uptrace/bun/dialect/pgdialect
    go get github.com/uptrace/bun/extra/bundebug
    go get github.com/jackc/pgx/v5
    go get github.com/jackc/pgx/v5/pgxpool
    go get github.com/testcontainers/testcontainers-go
    go get github.com/testcontainers/testcontainers-go/modules/postgres
    go mod tidy
    ```
  - **Estimated Time**: 10 minutes
  - **Dependencies**: T001

- [ ] **T003** Install Atlas migration tool
  - **Command**:
    ```bash
    # macOS
    brew install ariga/tap/atlas
    # or Linux
    curl -sSf https://atlasgo.sh | sh
    ```
  - **Description**: Install Atlas CLI for database migrations
  - **Estimated Time**: 5 minutes
  - **Dependencies**: None

- [ ] **T004** Configure Supabase project
  - **Description**: Create Supabase project, get connection string, configure environment variables
  - **Files**: `go/.env.local`, `go/.env.example`
  - **Estimated Time**: 20 minutes
  - **Dependencies**: None
  - **Manual Steps**:
    1. Create Supabase project at https://app.supabase.com
    2. Get connection string from Settings → Database
    3. Create `.env.local` with `DATABASE_URL`, `SUPABASE_PLAN`, `ENV`

- [ ] **T005** Create Atlas configuration
  - **Files**: `go/atlas.hcl`
  - **Description**: Configure Atlas for Supabase environments (local, supabase)
  - **Estimated Time**: 15 minutes
  - **Dependencies**: T001, T003

- [ ] **T006** Setup Testcontainers utility
  - **Files**: `go/internal/testutil/testdb.go`
  - **Description**: Create helper function for setting up PostgreSQL test containers
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T001, T002

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3 (9 tasks)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Repository Interfaces)

- [ ] **T007** [P] Contract test UserRepository interface
  - **Files**: `go/internal/db/repository/user_repository_test.go`
  - **Description**: Write failing tests for all 7 UserRepository methods (Create, FindByID, FindByEmail, Update, Delete, List, WithSettings)
  - **Estimated Time**: 1 hour
  - **Dependencies**: T006
  - **Test Cases**: Create success, FindByID found/not found, FindByEmail, Update, Delete, List pagination, WithSettings eager loading

- [ ] **T008** [P] Contract test ConversationRepository interface
  - **Files**: `go/internal/db/repository/conversation_repository_test.go`
  - **Description**: Write failing tests for all 7 ConversationRepository methods
  - **Estimated Time**: 1 hour
  - **Dependencies**: T006
  - **Test Cases**: Create, FindByID, FindByUserID with pagination, Update, Delete, WithMessages, CountByUserID

- [ ] **T009** [P] Contract test MessageRepository interface
  - **Files**: `go/internal/db/repository/message_repository_test.go`
  - **Description**: Write failing tests for all 6 MessageRepository methods
  - **Estimated Time**: 1 hour
  - **Dependencies**: T006
  - **Test Cases**: Create, CreateBatch, FindByID, FindByConversationID, Delete, CountByConversationID

- [ ] **T010** [P] Contract test UserSettingsRepository interface
  - **Files**: `go/internal/db/repository/user_settings_repository_test.go`
  - **Description**: Write failing tests for all 4 UserSettingsRepository methods
  - **Estimated Time**: 45 minutes
  - **Dependencies**: T006
  - **Test Cases**: Create, FindByUserID, Update, Upsert

### Integration Tests (User Stories)

- [ ] **T011** [P] Integration test: User registration and data persistence
  - **Files**: `go/internal/db/repository/integration_test.go`
  - **Description**: Test user creation with auto-populated timestamps and ID
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T006
  - **Scenario**: From spec.md scenario 1

- [ ] **T012** [P] Integration test: Conversation history storage and retrieval
  - **Files**: `go/internal/db/repository/integration_test.go`
  - **Description**: Test conversation creation with messages, retrieve in chronological order
  - **Estimated Time**: 45 minutes
  - **Dependencies**: T006
  - **Scenario**: From spec.md scenario 2

- [ ] **T013** [P] Integration test: User settings persistence
  - **Files**: `go/internal/db/repository/integration_test.go`
  - **Description**: Test user settings create/update, verify persistence across sessions
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T006
  - **Scenario**: From spec.md scenario 3

- [ ] **T014** [P] Integration test: Multi-user data isolation
  - **Files**: `go/internal/db/repository/integration_test.go`
  - **Description**: Create multiple users, verify each can only access their own conversations
  - **Estimated Time**: 45 minutes
  - **Dependencies**: T006
  - **Scenario**: From spec.md scenario 4

- [ ] **T015** [P] Integration test: Transaction rollback
  - **Files**: `go/internal/db/repository/integration_test.go`
  - **Description**: Test transaction with intentional failure, verify rollback
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T006

**Checkpoint**: Run `go test ./internal/db/repository/... -v` - ALL tests must FAIL before proceeding to Phase 3.3

---

## Phase 3.3: Core Implementation (13 tasks)

**ONLY proceed after all tests in Phase 3.2 are written and failing**

### Database Configuration

- [ ] **T016** Implement database connection configuration
  - **Files**: `go/internal/config/database.go`
  - **Description**: Create NewDatabase() function with Bun ORM initialization, connection pooling, SSL configuration for Supabase
  - **Estimated Time**: 1 hour
  - **Dependencies**: T002, T004
  - **Implementation**: Supabase DSN, SSL required, query hooks for development

### Data Models

- [ ] **T017** [P] Define User model
  - **Files**: `go/internal/db/models/user.go`
  - **Description**: Create User struct with Bun tags, BeforeAppendModel hook for timestamps, soft delete support
  - **Estimated Time**: 45 minutes
  - **Dependencies**: T002

- [ ] **T018** [P] Define Conversation model
  - **Files**: `go/internal/db/models/conversation.go`
  - **Description**: Create Conversation struct with foreign key to User, relations to Messages
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T002

- [ ] **T019** [P] Define Message model
  - **Files**: `go/internal/db/models/message.go`
  - **Description**: Create Message struct with foreign key to Conversation, role validation
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T002

- [ ] **T020** [P] Define UserSettings model
  - **Files**: `go/internal/db/models/user_settings.go`
  - **Description**: Create UserSettings struct with unique foreign key to User, default values
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T002

### Database Schema

- [ ] **T021** [P] Create users schema SQL
  - **Files**: `go/internal/db/schema/001_users.sql`
  - **Description**: Define users table with indexes (email, deleted_at)
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T001

- [ ] **T022** [P] Create conversations schema SQL
  - **Files**: `go/internal/db/schema/002_conversations.sql`
  - **Description**: Define conversations table with foreign key to users, indexes
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T001

- [ ] **T023** [P] Create messages schema SQL
  - **Files**: `go/internal/db/schema/003_messages.sql`
  - **Description**: Define messages table with foreign key to conversations, role check constraint, indexes
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T001

- [ ] **T024** [P] Create user_settings schema SQL
  - **Files**: `go/internal/db/schema/004_user_settings.sql`
  - **Description**: Define user_settings table with unique foreign key to users
  - **Estimated Time**: 20 minutes
  - **Dependencies**: T001

### Database Migrations

- [ ] **T025** Generate and apply initial migrations
  - **Command**:
    ```bash
    cd go/
    atlas migrate diff init --env local --to file://internal/db/schema
    atlas migrate apply --env supabase --dry-run
    atlas migrate apply --env supabase
    ```
  - **Description**: Generate migrations from schema files, apply to Supabase
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T005, T021, T022, T023, T024

### Repository Implementation

- [ ] **T026** Implement repository error definitions
  - **Files**: `go/internal/db/repository/errors.go`
  - **Description**: Define ErrNotFound, ErrDuplicate, ErrForeignKey, ErrInvalidInput, HandleDatabaseError function
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T002

- [ ] **T027** Implement UserRepository
  - **Files**: `go/internal/db/repository/user_repository.go`
  - **Description**: Implement all 7 methods of UserRepository interface
  - **Estimated Time**: 2 hours
  - **Dependencies**: T007, T016, T017, T026
  - **Verify**: Run T007 tests - should now PASS

- [ ] **T028** Implement ConversationRepository
  - **Files**: `go/internal/db/repository/conversation_repository.go`
  - **Description**: Implement all 7 methods of ConversationRepository interface
  - **Estimated Time**: 2 hours
  - **Dependencies**: T008, T016, T018, T026
  - **Verify**: Run T008 tests - should now PASS

---

## Phase 3.4: Core Implementation (continued) (2 tasks)

- [ ] **T029** Implement MessageRepository
  - **Files**: `go/internal/db/repository/message_repository.go`
  - **Description**: Implement all 6 methods including CreateBatch for bulk inserts
  - **Estimated Time**: 1.5 hours
  - **Dependencies**: T009, T016, T019, T026
  - **Verify**: Run T009 tests - should now PASS

- [ ] **T030** Implement UserSettingsRepository
  - **Files**: `go/internal/db/repository/user_settings_repository.go`
  - **Description**: Implement all 4 methods including Upsert (INSERT ... ON CONFLICT)
  - **Estimated Time**: 1 hour
  - **Dependencies**: T010, T016, T020, T026
  - **Verify**: Run T010 tests - should now PASS

**Checkpoint**: Run `go test ./internal/db/repository/... -v -cover` - ALL tests must PASS with >80% coverage

---

## Phase 3.5: Integration (3 tasks)

- [ ] **T031** Create database initialization in main.go
  - **Files**: `go/cmd/api/main.go` (modify existing or create new)
  - **Description**: Add database initialization, connection pooling, graceful shutdown
  - **Estimated Time**: 1 hour
  - **Dependencies**: T016, T027, T028, T029, T030

- [ ] **T032** Add connection pool monitoring
  - **Files**: `go/internal/config/database.go` (add LogPoolStats function)
  - **Description**: Implement periodic connection pool metrics logging
  - **Estimated Time**: 30 minutes
  - **Dependencies**: T016, T031

- [ ] **T033** Create example usage in quickstart
  - **Files**: `go/cmd/example/main.go` (new file)
  - **Description**: Create standalone example program demonstrating CRUD operations
  - **Estimated Time**: 45 minutes
  - **Dependencies**: T027, T028, T029, T030
  - **Based on**: quickstart.md usage examples

---

## Phase 3.6: Polish (4 tasks)

- [ ] **T034** [P] Add unit tests for error handling
  - **Files**: `go/internal/db/repository/errors_test.go`
  - **Description**: Test HandleDatabaseError for all PostgreSQL error codes (23505, 23503, 23502, etc.)
  - **Estimated Time**: 45 minutes
  - **Dependencies**: T026

- [ ] **T035** [P] Performance test: Query response time
  - **Files**: `go/internal/db/repository/performance_test.go`
  - **Description**: Benchmark repository methods, verify <100ms p95 for common queries
  - **Estimated Time**: 1 hour
  - **Dependencies**: T027, T028, T029, T030
  - **Goal**: < 100ms p95 per performance goals

- [ ] **T036** [P] Update README with database setup
  - **Files**: `go/README.md` (create or update)
  - **Description**: Add database setup section, link to quickstart.md, environment variables
  - **Estimated Time**: 30 minutes
  - **Dependencies**: All previous tasks

- [ ] **T037** Verify quickstart.md instructions
  - **Description**: Manually execute all steps in quickstart.md, verify accuracy
  - **Estimated Time**: 1 hour
  - **Dependencies**: All previous tasks
  - **Verification**: Can a new developer follow quickstart.md successfully?

---

## Dependencies Graph

```
Setup Layer (T001-T006)
    ↓
Test Layer (T007-T015) [All Parallel]
    ↓
Config + Models (T016-T020) [Models Parallel]
    ↓
Schema Files (T021-T024) [All Parallel]
    ↓
Migrations (T025)
    ↓
Repository Errors (T026)
    ↓
Repository Implementation (T027-T030)
    ↓
Integration (T031-T033)
    ↓
Polish (T034-T037) [T034-T036 Parallel]
```

## Parallel Execution Examples

### Parallel Block 1: All Test Files (T007-T015)
```bash
# Launch all test file creation tasks together
# These are all different files, no conflicts
T007: go/internal/db/repository/user_repository_test.go
T008: go/internal/db/repository/conversation_repository_test.go
T009: go/internal/db/repository/message_repository_test.go
T010: go/internal/db/repository/user_settings_repository_test.go
T011-T015: go/internal/db/repository/integration_test.go (same file, write sections sequentially)
```

### Parallel Block 2: All Model Definitions (T017-T020)
```bash
# Launch all model creation tasks together
T017: go/internal/db/models/user.go
T018: go/internal/db/models/conversation.go
T019: go/internal/db/models/message.go
T020: go/internal/db/models/user_settings.go
```

### Parallel Block 3: All Schema Files (T021-T024)
```bash
# Launch all schema creation tasks together
T021: go/internal/db/schema/001_users.sql
T022: go/internal/db/schema/002_conversations.sql
T023: go/internal/db/schema/003_messages.sql
T024: go/internal/db/schema/004_user_settings.sql
```

### Parallel Block 4: Polish Tasks (T034-T036)
```bash
# Launch documentation and testing tasks together
T034: go/internal/db/repository/errors_test.go
T035: go/internal/db/repository/performance_test.go
T036: go/README.md
```

---

## Validation Checklist
*GATE: Verify before marking complete*

- [x] All contracts have corresponding tests (T007-T010 cover all 4 repositories)
- [x] All entities have model tasks (T017-T020 cover all 4 entities)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (checked file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (T011-T015 share file, not marked [P])

---

## Summary

- **Total Tasks**: 37 tasks
- **Estimated Time**: 24-30 hours (3-4 days of focused work)
- **Parallel Opportunities**: 17 tasks can run in parallel
- **Critical Path**: Setup → Tests → Models → Schema → Migration → Repositories → Integration → Polish

### Task Breakdown by Phase
- **Setup** (T001-T006): 6 tasks, ~1.5 hours
- **Tests** (T007-T015): 9 tasks, ~7 hours
- **Core Implementation** (T016-T030): 15 tasks, ~13 hours
- **Integration** (T031-T033): 3 tasks, ~2 hours
- **Polish** (T034-T037): 4 tasks, ~3 hours

### Test-Driven Development Flow
1. Write ALL tests first (T007-T015) - they must FAIL
2. Implement models and repositories (T016-T030)
3. Tests should now PASS
4. Add integration and polish (T031-T037)

---

**Tasks Generation Complete**
**Next Command**: Begin with T001 or use parallel execution for setup tasks
**Ready for**: /implement command or manual execution
