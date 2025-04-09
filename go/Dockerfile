FROM golang:1.24.1-alpine AS base

WORKDIR /go

COPY ./go /go
RUN go mod download

# air のインストール
RUN go install github.com/air-verse/air@latest
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# ソースコードのコピー
COPY . .

# airの設定ファイルをデバッグディレクトリのパスに修正
CMD ["air", "-c", "/go/debug/.air.toml"]
