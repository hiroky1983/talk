.PHONY: tidy
tidy:
	go mod tidy

.PHONY: build
build:
	docker compose build

.PHONY: run
run:
	docker compose up -d

.PHONY: lint-fix
lint-fix:
	@go fmt ./...
	@goimports -w ./
	@go run github.com/golangci/golangci-lint run --fix

# Atlas migration commands
.PHONY: migrate-diff
migrate-diff:
	@if [ -z "$(name)" ]; then \
		echo "Error: Please provide a migration name using 'make migrate-diff name=<migration_name>'"; \
		exit 1; \
	fi
	@export $$(grep -v '^\s*#' .env | grep -v '^\s*$$' | xargs) && atlas migrate diff $(name) --env local

.PHONY: migrate-apply
migrate-apply:
	@export $$(grep -v '^\s*#' .env | grep -v '^\s*$$' | xargs) && atlas migrate apply --env local

.PHONY: migrate-status
migrate-status:
	@export $$(grep -v '^\s*#' .env | grep -v '^\s*$$' | xargs) && atlas migrate status --env local

.PHONY: migrate-hash
migrate-hash:
	@export $$(grep -v '^\s*#' .env | grep -v '^\s*$$' | xargs) && atlas migrate hash --env local

.PHONY: er
er:
	@mkdir -p ../docs/db
	@export $$(grep -v '^\s*#' .env | grep -v '^\s*$$' | xargs) && atlas schema inspect --env local --schema public --format '{{ mermaid . }}' > ../docs/db/er.md
	@echo "ER diagram generated at docs/db/er.md"
