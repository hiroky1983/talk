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

# Database migration commands
.PHONY: migrate-up
migrate-up:
	go run cmd/migrate/main.go -cmd up

.PHONY: migrate-down
migrate-down:
	go run cmd/migrate/main.go -cmd down

.PHONY: migrate-status
migrate-status:
	go run cmd/migrate/main.go -cmd status

.PHONY: migrate-create
migrate-create:
	@if [ -z "$(name)" ]; then \
		echo "Usage: make migrate-create name=<migration_name>"; \
		exit 1; \
	fi
	go run cmd/migrate/main.go -cmd create -name $(name)
