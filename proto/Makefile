SHELL = /usr/bin/env bash
BUF = $(HOME)/go/bin/buf

.PHONY: all
all: fmt lint generate docs

.PHONY: docs
docs:
	@mkdir -p ../docs

.PHONY: generate
generate:
	@$(BUF) generate
	@rm -rf ../go/gen/google
	@rm -rf ../python/google
	@find ../next/src/gen/app -name "*.ts" -exec sed -i '' '/import { file_google_api_annotations }/d' {} +
	@find ../next/src/gen/app -name "*.ts" -exec sed -i '' 's/, file_google_api_annotations//g' {} +
	@rm -rf ../next/src/gen/google

.PHONY: lint
lint:
	@$(BUF) lint

.PHONY: fmt
fmt:
	@$(BUF) format -w

.PHONY: update
update:
	@$(BUF) mod update

.PHONY: setup
setup:
	@go install github.com/bufbuild/buf/cmd/buf@latest
