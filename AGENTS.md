# Repository Guidelines

## Project Structure & Module Organization
- `next/` — Next.js app (UI, pages, components, assets).
- `go/` — Go services and libraries.
- `python/` — Python tooling/services.
- `proto/` — Protocol Buffer schemas shared across services.
- `docs/` — Design notes and reference docs.
- Root files: `docker-compose.yaml` (local stack), `.github/` (CI/CD), `.node-version`.

## Build, Test, and Development Commands
- Frontend: `cd next && npm i && npm run dev` (local), `npm run build && npm start` (prod), `npm test`.
- Go: `cd go && go build ./...` (build) and `go test ./... -race -cover` (tests).
- Python: `cd python && pip install -r requirements.txt && pytest -q --maxfail=1 --disable-warnings`.
- Docker stack: `docker compose up -d` to run services locally; `docker compose logs -f` to tail.

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

## Security & Configuration Tips
- Do not commit secrets. Keep env in `.env.local`/`.env` files ignored by Git.
- When adding services, update `docker-compose.yaml` minimally and document ports.
- For Protobufs, generate code into language folders (example): `protoc --go_out=go --python_out=python proto/*.proto`.
