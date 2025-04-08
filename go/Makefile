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
