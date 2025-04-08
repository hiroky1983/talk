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
