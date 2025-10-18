# Repository Guidelines

## Architecture Overview

This is a Go + Next.js monorepo with gRPC communication using Protocol Buffers and a Python AI service:

- **Go Backend**: Gin-based HTTP server with Connect RPC (gRPC-compatible)
- **Next.js Frontend**: App Router architecture with TypeScript and Tailwind CSS
- **Python AI Service**: Provides AI-powered features (Gemini integration)
- **Protocol Buffers**: Shared API definitions with auto-generated code for Go, TypeScript, and Python
- **Buf**: Used for proto file management, linting, and code generation

### Code Generation Flow

Proto files in `proto/app/` → Buf generates → Go code in `go/gen/` + TypeScript code in `next/src/gen/` + Python code

### Service Architecture

1. **Go Backend (`app`)**: Exposes gRPC API, handles core business logic, communicates with Python AI service
2. **Next.js Frontend**: Modern web interface, interacts with Go backend using gRPC-web
3. **Python AI Service (`ai-service`)**: Provides AI-powered features to the Go backend

## Project Structure & Module Organization

- `next/` — Next.js app (UI, pages, components, assets)
- `go/` — Go services and libraries
- `python/` — Python AI service and tooling
- `proto/` — Protocol Buffer schemas shared across services
- `docs/` — Design notes and reference docs
- Root files: `docker-compose.yaml` (local stack), `.github/` (CI/CD), `.node-version`

## Build, Test, and Development Commands

### Docker Development (Recommended)

- **Full stack**: `docker compose up -d` — runs all services with hot reload
- **Logs**: `docker compose logs -f` — tail all service logs
- **Ports**: Go backend (8000), Next.js (3000), Python AI service (50051)
- **Debugger**: Delve debugger available on port 2349

### Proto/Buf Commands (from `proto/` directory)

- **Generate code**: `make generate` — generates Go, TypeScript, and Python code
- **Lint**: `make lint` — lint proto files
- **Format**: `make fmt` — format proto files
- **Setup**: `make setup` — install buf CLI

### Go Backend Commands (from `go/` directory)

- **Development**: `make run` — run with Docker (hot reload + debugger)
- **Build**: `make build` — build Docker containers
- **Lint**: `make lint-fix` — lint and format Go code
- **Dependencies**: `make tidy` — tidy Go dependencies
- **Tests**: `go test ./... -race -cover`

### Next.js Frontend Commands (from `next/` directory)

- **Development**: `npm run dev` — development server with Turbopack
- **Production**: `npm run build && npm start`
- **Lint**: `npm run lint`
- **Tests**: `npm test`
- **Install**: `npm i`

### Python AI Service Commands (from `python/` directory)

- **Install**: `pip install -r requirements.txt`
- **Tests**: `pytest -q --maxfail=1 --disable-warnings`
- **Development**: Service runs automatically with Docker compose

## Coding Style & Naming Conventions

- Go: run `go fmt ./...`; exported names use `CamelCase`, packages lower-case; one package per folder.
- TypeScript/JavaScript: prefer ESLint + Prettier if configured (`npm run lint`, `npm run format`); files `kebab-case.ts/tsx`, React components `PascalCase`.
- Python: prefer `ruff` and `black` if available (`ruff .`, `black .`); modules `snake_case.py`, classes `CapWords`, functions `snake_case`.

## Testing Guidelines

- Frontend: place tests next to code as `*.test.ts(x)` or under `next/__tests__/`; run `npm test`.
- Go: name tests `*_test.go`; use table tests; run `go test ./... -race -cover`.
- Python: tests under `python/tests/` named `test_*.py`; run `pytest --cov` when adding logic.
- Aim for high confidence on changed lines; include edge cases and error paths.

## Commit & Pull Request Guidelines

- Use Conventional Commits where possible: `feat:`, `fix:`, `docs:`, `chore:`, optional scope (e.g., `feat(next): ...`). Avoid `wip` on main.
- Keep messages imperative and concise; reference issues (`Closes #123`).
- PRs: describe intent and approach, link issues, include screenshots/GIFs for UI changes, add test notes, and update docs when needed.

## Key Technologies

- **Go 1.24.1** with Gin framework and Connect RPC
- **Next.js 15.2.4** with App Router and Turbopack
- **Python** with Gemini AI integration
- **Buf v2** for Protocol Buffer management
- **Docker** with hot reload support via Air
- **Delve** debugger integration

## Development Setup

1. **Docker Development**: Use `docker compose up -d` from root - includes hot reload and debugger on port 2349
2. **Port Configuration**: Go server runs on port 8000, Next.js on port 3000, Python AI service on port 50051
3. **Code Generation**: Always run `make generate` in `proto/` directory after modifying .proto files

## Security & Configuration Tips

- Do not commit secrets. Keep env in `.env.local`/`.env` files ignored by Git.
- When adding services, update `docker-compose.yaml` minimally and document ports.
- For Protobufs, generate code into language folders using `make generate` in `proto/` directory.
- API communication between frontend and backend is done through gRPC as defined in `.proto` files.
