FROM golang:1.24.1-alpine AS base

WORKDIR /go

COPY go.mod go.sum ./
RUN go mod download

# air のインストール
RUN go install github.com/cosmtrek/air@latest

# ソースコードのコピー
COPY . .

CMD ["air", "-c", "debug/.air.toml"]
