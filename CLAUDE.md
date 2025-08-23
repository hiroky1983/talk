# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Go + Next.js template project with gRPC communication using Protocol Buffers:

- **Go Backend**: Gin-based HTTP server with Connect RPC (gRPC-compatible)
- **Next.js Frontend**: App Router architecture with TypeScript
- **Protocol Buffers**: Shared API definitions with auto-generated code for both Go and TypeScript
- **Buf**: Used for proto file management, linting, and code generation

### Code Generation Flow
Proto files in `proto/app/` → Buf generates → Go code in `go/gen/` + TypeScript code in `next/src/gen/`

## Development Commands

### Proto/Buf Commands (from `proto/` directory)
```bash
# Generate code for both Go and TypeScript
make generate

# Lint proto files
make lint

# Format proto files
make fmt

# Setup buf (install buf CLI)
make setup
```

### Go Backend Commands (from `go/` directory)
```bash
# Run with Docker (includes hot reload + delve debugger)
make run

# Build Docker containers
make build

# Lint and format Go code
make lint-fix

# Tidy dependencies
make tidy
```

### Next.js Frontend Commands (from `next/` directory)
```bash
# Development server with Turbopack
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Development Setup

1. **Docker Development**: Use `docker compose up -d` from root - includes hot reload and debugger on port 2349
2. **Port Configuration**: Go server runs on port 8000, Next.js on port 3000
3. **Code Generation**: Always run `make generate` in `proto/` directory after modifying .proto files

## Key Technologies

- Go 1.24.1 with Gin framework and Connect RPC
- Next.js 15.2.4 with App Router and Turbopack
- Buf v2 for Protocol Buffer management
- Docker with hot reload support via Air
- Delve debugger integration