# Repository Guidelines

## Architecture Overview

- Monorepo with Go backend (`go/`), Next.js frontend (`next/`), and Python AI service (`python/`).
- **Real-time Communication**:
  - Frontend <-> Backend: **WebSocket** for bidirectional audio/text streaming.
  - Backend <-> AI Service: **gRPC Bidirectional Streaming**.
- **Dual-Mode AI Service**:
  - **Premium**: Uses Gemini Live API for true real-time, interruptible bidirectional audio streaming.
  - **Lite**: Uses buffered processing with standard Gemini 1.5 Flash API (fallback mode).
- gRPC APIs defined in `proto/` with Buf-driven codegen.
- Local dev via Docker Compose with hot reload.
- React Native mobile clients live under `mobile/`.
- Local dev via Docker Compose with hot reload; Go debugger on port `2349`.
- React Native mobile clients live under `mobile/` with shared business logic mirroring the web app's flows.

## Project Structure & Module Organization

- `next/` — Next.js app (App Router, TypeScript, Tailwind). Tests near code or `next/__tests__/`.
- `mobile/` — React Native app using Expo. Keep feature modules aligned with `next/` counterparts for parity.
- `go/` — Gin + Connect RPC backend. Tests with `*_test.go`.
- `python/` — AI service with dual-mode controllers (`premium` for Live API, `light` for standard API). Tests in `python/tests/`.
- `proto/` — Protobuf schemas. Use Buf for lint/format/generate.
- `docs/`, `.github/`, `docker-compose.yaml` — docs, CI, and local stack.

## Build, Test, and Development Commands

- Docker: `docker compose up -d` (start) · `docker compose logs -f` (tail).
- Proto (from `proto/`): `make setup` · `make fmt` · `make lint` · `make generate`.
- Go (from `go/`): `make run` (hot reload) · `make build` · `make tidy` · `make lint-fix` · `go test ./... -race -cover`.
- Next (from `next/`): `npm i` · `npm run dev` · `npm run build && npm start` · `npm run lint` · `npm test`.
- Mobile (from `mobile/`): `npm i` · `npx expo start` for local dev · `npm run lint` · `npm test` (Jest) · use Expo Go or emulator for verification.
- Python (from `python/`): `pip install -r requirements.txt` · `pytest -q --maxfail=1 --disable-warnings`.

## Coding Style & Naming Conventions

- Go: `go fmt ./...`; exported `CamelCase`; packages lower-case; one package per folder.
- TypeScript: ESLint + Prettier (`npm run lint`); files `kebab-case.ts/tsx`; React components `PascalCase`.
- Mobile: Follow React Native conventions; leverage shared UI primitives in `mobile/src/components/`; prefer TypeScript with `PascalCase` components and hooks in `camelCase`.
- Python: `ruff .` and `black .`; modules `snake_case.py`; classes `CapWords`; functions `snake_case`.

## Testing Guidelines

- Frontend: `*.test.ts(x)` next to code or `next/__tests__/`; run `npm test`.
- Mobile: colocate Jest and Detox tests beside features under `mobile/src/`; favor React Native Testing Library for component coverage.
- Go: table-driven tests; run `go test ./... -race -cover`.
- Python: tests under `python/tests/`; run `pytest` (add `--cov` for coverage).
- Aim for high confidence on changed lines; include error paths.

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:` (optional scope, e.g., `feat(next): ...`).
- PRs: describe intent and approach, link issues (e.g., `Closes #123`), include screenshots/GIFs for UI, test notes, and doc updates when relevant.

## Security & Configuration Tips

- Do not commit secrets. Keep env in `.env`/`.env.local` (ignored by Git).
- Ports: Go `8000`, Next `3000`, Python `50051`. Update `docker-compose.yaml` minimally.
- After changing `.proto` files, run `make generate` in `proto/` and commit generated code.

## Database Schema Conventions

- **Primary Keys**: All tables must use `tablename_id` format for primary keys (e.g., `users_id`, `refresh_tokens_id`) instead of `id`.

## Code Architecture

- **Go Backend**:
  - `internal/repository`: Contains **interfaces only**. No database implementation logic here.
  - `internal/gateway`: Contains the **concrete implementations** of the repositories (e.g., PostgreSQL, Redis access).

## Agent-Specific Instructions

- Follow these conventions for any edits; keep changes minimal and focused.
- Honor directory scopes and naming patterns; avoid unrelated refactors.
- Update tests and docs alongside code; prefer root-cause fixes over workarounds.
