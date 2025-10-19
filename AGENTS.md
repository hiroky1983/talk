# Repository Guidelines

## Architecture Overview
- Monorepo with Go backend (`go/`), Next.js frontend (`next/`), and Python AI service (`python/`).
- gRPC APIs defined in `proto/app/` with Buf-driven codegen to `go/gen/`, `next/src/gen/`, and Python stubs.
- Database: Supabase (PostgreSQL 15) with Bun ORM and Atlas migrations.
- Local dev via Docker Compose with hot reload; Go debugger on port `2349`.

## Project Structure & Module Organization
- `next/` — Next.js app (App Router, TypeScript, Tailwind). Tests near code or `next/__tests__/`.
- `go/` — Gin + Connect RPC backend. Tests with `*_test.go`.
  - `internal/db/models/` — Bun ORM models (User, Conversation, Message, UserSettings).
  - `internal/db/repository/` — Repository layer for database access.
  - `internal/db/migrations/` — Atlas migration files.
  - `internal/config/` — Database connection and configuration.
- `python/` — AI service (Gemini integration). Tests in `python/tests/`.
- `proto/` — Protobuf schemas. Use Buf for lint/format/generate.
- `docs/`, `.github/`, `docker-compose.yaml` — docs, CI, and local stack.
- `specs/` — Feature specifications and implementation plans.

## Build, Test, and Development Commands
- Docker: `docker compose up -d` (start) · `docker compose logs -f` (tail).
- Proto (from `proto/`): `make setup` · `make fmt` · `make lint` · `make generate`.
- Go (from `go/`): `make run` (hot reload) · `make build` · `make tidy` · `make lint-fix` · `go test ./... -race -cover`.
  - Database (from `go/`): `atlas migrate diff <name> --env supabase` (generate migration) · `atlas migrate apply --env supabase` (apply migrations) · `atlas migrate status --env supabase` (check status).
- Next (from `next/`): `npm i` · `npm run dev` · `npm run build && npm start` · `npm run lint` · `npm test`.
- Python (from `python/`): `pip install -r requirements.txt` · `pytest -q --maxfail=1 --disable-warnings`.

## Coding Style & Naming Conventions
- Go: `go fmt ./...`; exported `CamelCase`; packages lower-case; one package per folder.
- TypeScript: ESLint + Prettier (`npm run lint`); files `kebab-case.ts/tsx`; React components `PascalCase`.
- Python: `ruff .` and `black .`; modules `snake_case.py`; classes `CapWords`; functions `snake_case`.

## Testing Guidelines
- Frontend: `*.test.ts(x)` next to code or `next/__tests__/`; run `npm test`.
- Go: table-driven tests; run `go test ./... -race -cover`.
- Python: tests under `python/tests/`; run `pytest` (add `--cov` for coverage).
- Aim for high confidence on changed lines; include error paths.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:` (optional scope, e.g., `feat(next): ...`).
- PRs: describe intent and approach, link issues (e.g., `Closes #123`), include screenshots/GIFs for UI, test notes, and doc updates when relevant.

## Security & Configuration Tips
- Do not commit secrets. Keep env in `.env`/`.env.local` (ignored by Git).
- Database: Supabase connection string must include `sslmode=require`. Store in `DATABASE_URL` environment variable.
- Ports: Go `8000`, Next `3000`, Python `50051`. Update `docker-compose.yaml` minimally.
- After changing `.proto` files, run `make generate` in `proto/` and commit generated code.
- After changing database schema, run `atlas migrate diff <name> --env supabase` and commit migration files.

## Agent-Specific Instructions
- Follow these conventions for any edits; keep changes minimal and focused.
- Honor directory scopes and naming patterns; avoid unrelated refactors.
- Update tests and docs alongside code; prefer root-cause fixes over workarounds.
