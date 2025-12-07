# GORM + Atlas Setup Guide

このドキュメントでは、GORMとAtlasを使用したデータベースORM・マイグレーション基盤のセットアップ方法を説明します。

## 概要

- **GORM**: Goの強力なORMライブラリ。モデル定義とデータベース操作を簡単にします
- **Atlas**: GORMモデルからSQLマイグレーションを自動生成するスキーママイグレーションツール

## アーキテクチャ

```
go/
├── internal/
│   ├── models/           # GORMモデル定義
│   │   ├── user.go
│   │   ├── conversation.go
│   │   ├── message.go
│   │   └── models.go     # モデル一覧
│   └── database/
│       ├── gorm.go       # GORM接続
│       ├── postgres.go   # レガシー pgx 接続
│       ├── atlas_loader.go  # Atlasローダー
│       └── migrations/   # マイグレーションファイル
├── atlas.hcl             # Atlas設定
└── Makefile              # マイグレーションコマンド
```

## セットアップ手順

### 1. Atlas CLIのインストール

```bash
cd go
make atlas-install
```

または手動でインストール:

```bash
curl -sSf https://atlasgo.sh | sh
```

### 2. データベースの起動

```bash
# プロジェクトルートから
docker compose up -d postgres
```

### 3. 環境変数の設定

`.env`ファイルに以下の環境変数が設定されていることを確認:

```env
DB_HOST=localhost
DB_PORT=5434
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=talk
DB_SSLMODE=disable

# PostgreSQL (docker-compose用)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=talk
```

### 4. 初回マイグレーションの作成

```bash
cd go
make migration-new NAME=initial_schema
```

これにより、GORMモデルからSQLマイグレーションファイルが生成されます。

### 5. マイグレーションの適用

```bash
make migration-apply
```

## モデルの定義方法

`internal/models/`ディレクトリに新しいモデルを作成します。

### 基本的なモデルの例

```go
package models

import (
    "time"
    "gorm.io/gorm"
)

type User struct {
    ID        string         `gorm:"type:varchar(255);primaryKey" json:"id"`
    Email     string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
    Name      string         `gorm:"type:varchar(255);not null" json:"name"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (User) TableName() string {
    return "users"
}
```

### リレーションの定義

```go
type Conversation struct {
    ID        string         `gorm:"type:varchar(255);primaryKey"`
    UserID    string         `gorm:"type:varchar(255);not null;index"`

    // リレーション
    User     User      `gorm:"foreignKey:UserID;references:ID"`
    Messages []Message `gorm:"foreignKey:ConversationID;references:ID"`
}
```

### モデル一覧への追加

新しいモデルを作成したら、`internal/models/models.go`の`AllModels()`関数に追加:

```go
func AllModels() []interface{} {
    return []interface{}{
        &User{},
        &Conversation{},
        &Message{},
        &YourNewModel{},  // 追加
    }
}
```

## マイグレーションワークフロー

### 1. モデルの変更

`internal/models/`でGORMモデルを変更します。

例: 新しいフィールドの追加

```go
type User struct {
    ID        string         `gorm:"type:varchar(255);primaryKey"`
    Email     string         `gorm:"type:varchar(255);uniqueIndex;not null"`
    Name      string         `gorm:"type:varchar(255);not null"`
    Avatar    string         `gorm:"type:varchar(500)"` // 新規追加
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}
```

### 2. マイグレーションの生成

```bash
make migration-new NAME=add_avatar_to_users
```

Atlasが変更を検出し、SQLマイグレーションファイルを生成します。

### 3. マイグレーションファイルの確認

`internal/database/migrations/`に生成されたファイルを確認し、SQLが正しいことを検証します。

### 4. マイグレーションの適用

```bash
make migration-apply
```

### 5. 変更をコミット

モデルの変更とマイグレーションファイルの両方をコミットします:

```bash
git add internal/models/ internal/database/migrations/
git commit -m "feat: add avatar field to users"
```

## 利用可能なコマンド

### マイグレーション関連

```bash
# 新しいマイグレーションを作成
make migration-new NAME=description

# 保留中のマイグレーションを適用
make migration-apply

# マイグレーションステータスの確認
make migration-status

# マイグレーションディレクトリのハッシュ再計算
make migration-hash

# 現在のデータベーススキーマを検査
make db-inspect

# GORMスキーマをデータベースに直接適用（開発専用）
make db-apply
```

### その他

```bash
# ヘルプを表示
make help

# テストを実行
make test

# リンターを実行
make lint-fix
```

## GORMの使用方法

### アプリケーションでの使用

`main.go`でGORM接続が初期化されています:

```go
gormDB, err := database.NewGormDB()
if err != nil {
    log.Fatal("Failed to connect to database with GORM:", err)
}
```

### CRUD操作の例

```go
import (
    "github.com/hiroky1983/talk/go/internal/models"
)

// Create
user := models.User{
    ID:    "user-123",
    Email: "user@example.com",
    Name:  "John Doe",
}
result := gormDB.Create(&user)

// Read
var foundUser models.User
gormDB.First(&foundUser, "id = ?", "user-123")

// Update
gormDB.Model(&foundUser).Update("Name", "Jane Doe")

// Delete (soft delete)
gormDB.Delete(&foundUser)

// リレーションを含めて取得
var conversation models.Conversation
gormDB.Preload("User").Preload("Messages").First(&conversation, "id = ?", "conv-123")
```

## トラブルシューティング

### Atlas が GORM モデルを読み込めない

1. `go mod tidy`を実行
2. モデルが`internal/models/models.go`の`AllModels()`に追加されているか確認
3. `internal/database/atlas_loader.go`が正しく実装されているか確認

### マイグレーションの適用に失敗

1. PostgreSQLが実行中か確認: `docker compose ps`
2. データベース接続情報が正しいか確認
3. マイグレーションステータスを確認: `make migration-status`

### Docker環境でのマイグレーション

Dockerコンテナ内でマイグレーションを実行する場合:

```bash
docker compose exec app sh
cd /app
make migration-apply
```

## ベストプラクティス

1. **常にマイグレーションを使用**: データベースを直接変更せず、必ずマイグレーションを作成
2. **適用済みマイグレーションは編集しない**: 新しいマイグレーションを作成して変更を適用
3. **モデルとマイグレーションを一緒にコミット**: 一貫性を保つため
4. **マイグレーションをレビュー**: 自動生成されたSQLを必ず確認
5. **本番環境では慎重に**: マイグレーションは不可逆的な変更を含む可能性があります

## 参考リンク

- [GORM Documentation](https://gorm.io/docs/)
- [Atlas Documentation](https://atlasgo.io/docs)
- [Atlas GORM Integration](https://atlasgo.io/guides/orms/gorm)
