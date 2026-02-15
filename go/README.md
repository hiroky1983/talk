# Go Backend

Go (Gin, Connect RPC) によるバックエンドサービス。

## セットアップ

```bash
# 依存関係
go mod tidy

# DB 起動
docker compose up -d

# サーバー起動
go run main.go
```

### 環境変数

`go/.env` に設定:

```
DB_HOST=localhost
DB_PORT=5434
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=talk
DB_SSLMODE=disable
JWT_SECRET_KEY=secret
AI_SERVICE_HOST=localhost
GO_ENV=development
```

## データベースマイグレーション

[Atlas](https://atlasgo.io/) + [atlas-provider-gorm](https://github.com/ariga/atlas-provider-gorm) を使用。GORM モデル (`internal/models/`) が Single Source of Truth。

### 前提条件

- [Atlas CLI](https://atlasgo.sh): `curl -sSf https://atlasgo.sh | sh`
- Docker (dev DB 用の一時コンテナに使用)

### コマンド

```bash
make migrate-diff name=<name>  # GORM モデルの差分からマイグレーション SQL を自動生成
make migrate-apply              # マイグレーション適用
make migrate-status             # 適用状態の確認
make migrate-hash               # チェックサム再生成 (手動編集時)
make er                         # ER 図生成 → docs/db/er.md
```

### 開発フロー

1. GORM モデルを編集 (`internal/models/*.go`)
2. `make migrate-diff name=add_xxx` で差分マイグレーション生成
3. `migrations/` に生成された SQL を確認
4. `make migrate-apply` で適用

### 注意事項

- 適用済みのマイグレーションファイルは変更しない (新しいマイグレーションを作成する)
- 新しいモデルを追加した場合は `cmd/atlas-loader/main.go` にモデルを登録する
- `atlas.sum` はチェックサムファイル (自動生成、コミット対象)

## ディレクトリ構成

```
go/
├── main.go                    # エントリーポイント
├── atlas.hcl                  # Atlas 設定
├── Makefile
├── cmd/
│   └── atlas-loader/          # GORM → SQL 変換 (Atlas 用)
├── internal/
│   ├── auth/                  # JWT
│   ├── database/              # DB 接続
│   ├── models/                # GORM モデル (スキーマ定義)
│   ├── repository/            # リポジトリインターフェース
│   ├── gateway/               # リポジトリ実装
│   ├── handlers/              # Connect RPC ハンドラー
│   └── websocket/             # WebSocket ハンドラー
├── middleware/                 # Gin ミドルウェア
└── migrations/                # Atlas マイグレーション (自動生成)
```
