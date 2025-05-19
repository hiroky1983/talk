FROM golang:1.24.1-alpine AS base

WORKDIR /go

# go.mod と go.sum を先にコピーして依存関係をダウンロード
# これにより、ソースコードが変更されても依存関係のレイヤーはキャッシュされる
COPY ./go/go.mod ./go/go.sum ./
RUN go mod download

# air と delve のインストール
RUN go install github.com/air-verse/air@latest
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# ソースコードのコピー
# ./go ディレクトリ内の全てのファイルを /go (現在のWORKDIR) にコピー
COPY ./go/ ./

# airの設定ファイルをデバッグディレクトリのパスに修正
# WORKDIRが /go なので、相対パスで指定
CMD ["air", "-c", "debug/.air.toml"]