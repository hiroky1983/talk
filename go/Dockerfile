FROM golang:1.24.1-alpine AS base

WORKDIR /app

COPY go.mod go.sum ./

CMD ["air", "-c", "debug/.air.toml"]
