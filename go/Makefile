.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: tidy
tidy: ## Tidy go modules
	go mod tidy

.PHONY: build
build: ## Build docker containers
	docker compose build

.PHONY: run
run: ## Run docker compose stack
	docker compose up -d

.PHONY: lint-fix
lint-fix: ## Run linter with auto-fix
	@go fmt ./...
	@goimports -w ./
	@go run github.com/golangci/golangci-lint run --fix

.PHONY: test
test: ## Run tests
	go test ./... -race -cover

# Atlas migration commands
.PHONY: atlas-install
atlas-install: ## Install Atlas CLI
	@echo "Installing Atlas CLI..."
	@curl -sSf https://atlasgo.sh | sh

.PHONY: migration-new
migration-new: ## Create a new migration (usage: make migration-new NAME=description)
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make migration-new NAME=description"; \
		exit 1; \
	fi
	atlas migrate diff $(NAME) \
		--env gorm

.PHONY: migration-apply
migration-apply: ## Apply pending migrations
	atlas migrate apply \
		--env gorm \
		--url "postgres://postgres:password@localhost:5434/talk?sslmode=disable"

.PHONY: migration-status
migration-status: ## Show migration status
	atlas migrate status \
		--env gorm \
		--url "postgres://postgres:password@localhost:5434/talk?sslmode=disable"

.PHONY: migration-hash
migration-hash: ## Re-hash migration directory
	atlas migrate hash \
		--env gorm

.PHONY: db-inspect
db-inspect: ## Inspect current database schema
	atlas schema inspect \
		--env gorm \
		--url "postgres://postgres:password@localhost:5434/talk?sslmode=disable"

.PHONY: db-apply
db-apply: ## Apply GORM schema to database (for development only)
	atlas schema apply \
		--env gorm \
		--url "postgres://postgres:password@localhost:5434/talk?sslmode=disable" \
		--dev-url "docker://postgres/16/dev?search_path=public" \
		--auto-approve
