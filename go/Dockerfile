FROM golang:1.24.1-alpine AS base

WORKDIR /app

# go.mod と go.sum を先にコピーして依存関係をダウンロード
# これにより、ソースコードが変更されても依存関係のレイヤーはキャッシュされる
COPY go/go.mod .
COPY go/go.sum .
RUN go mod download

# air と delve のインストール
RUN go install github.com/air-verse/air@latest
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# ソースコードのコピー
COPY go/ .

# airの設定ファイルを指定して実行
CMD ["air", "-c", "debug/.air.toml"]
# CMD ["/bin/sh", "-c", "cd debug && ls -la"]
