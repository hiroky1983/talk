# データベース接続基盤 クイックスタートガイド

**プロジェクト**: Talk - AI言語学習アプリケーション
**日付**: 2025-10-18

このガイドでは、Supabase PostgreSQLデータベース接続基盤のセットアップから基本的な使用方法までを説明します。

---

## 前提条件

- Go 1.21以上がインストールされている
- Supabaseアカウントを持っている、またはローカルPostgreSQL（開発用）
- Dockerがインストールされている（テスト用）

---

## セットアップ手順

### 1. Supabaseプロジェクト作成

#### Supabaseダッシュボードから

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. "New Project"をクリック
3. プロジェクト情報を入力：
   - **Name**: talk-dev（または任意の名前）
   - **Database Password**: 強力なパスワードを生成
   - **Region**: Northeast Asia (Tokyo) - ap-northeast-1
4. プロジェクト作成完了を待つ（約2分）

#### 接続情報の取得

1. プロジェクトダッシュボード → Settings → Database
2. "Connection string"セクションから以下を取得：
   - **URI**: セッションプーリング用（ポート5432）
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
   ```

### 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成：

```bash
# go/.env.local

# Supabase Database Connection
DATABASE_URL="postgresql://postgres.[your-project-ref]:[your-password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase Plan (free or pro)
SUPABASE_PLAN="free"

# Environment
ENV="development"

# Application Settings
DB_MAX_CONNS=10
DB_MIN_CONNS=2
```

**重要**: `.env.local` を `.gitignore` に追加してください。

### 3. Go依存関係のインストール

```bash
cd go/

# Bun ORM
go get github.com/uptrace/bun
go get github.com/uptrace/bun/driver/pgdriver
go get github.com/uptrace/bun/dialect/pgdialect
go get github.com/uptrace/bun/extra/bundebug

# pgx connection pool
go get github.com/jackc/pgx/v5
go get github.com/jackc/pgx/v5/pgxpool

# Testcontainers (for testing)
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
```

### 4. Atlasマイグレーションツールのインストール

```bash
# macOS (Homebrew)
brew install ariga/tap/atlas

# Linux
curl -sSf https://atlasgo.sh | sh

# バージョン確認
atlas version
```

### 5. ディレクトリ構造の作成

```bash
cd go/

# 必要なディレクトリを作成
mkdir -p internal/config
mkdir -p internal/db/models
mkdir -p internal/db/repository
mkdir -p internal/db/migrations
mkdir -p internal/db/schema

# Atlasの設定ファイル
touch atlas.hcl
```

---

## 基本的な使用方法

### 1. データベース接続の初期化

```go
// internal/config/database.go
package config

import (
    "context"
    "database/sql"
    "fmt"
    "os"
    "time"

    "github.com/uptrace/bun"
    "github.com/uptrace/bun/dialect/pgdialect"
    "github.com/uptrace/bun/driver/pgdriver"
    "github.com/uptrace/bun/extra/bundebug"
)

func NewDatabase() (*bun.DB, error) {
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        return nil, fmt.Errorf("DATABASE_URL is not set")
    }

    connector := pgdriver.NewConnector(
        pgdriver.WithDSN(dsn),
    )

    sqldb := sql.OpenDB(connector)
    db := bun.NewDB(sqldb, pgdialect.New())

    // 開発環境ではクエリログを有効化
    if os.Getenv("ENV") == "development" {
        db.AddQueryHook(bundebug.NewQueryHook(
            bundebug.WithVerbose(true),
        ))
    }

    // 接続確認
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := db.PingContext(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return db, nil
}
```

### 2. モデルの定義

```go
// internal/db/models/user.go
package models

import (
    "context"
    "time"

    "github.com/uptrace/bun"
)

type User struct {
    bun.BaseModel `bun:"table:users,alias:u"`

    ID        int64     `bun:"id,pk,autoincrement"`
    Email     string    `bun:"email,notnull,unique"`
    Name      string    `bun:"name,notnull"`
    CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
    UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
    DeletedAt time.Time `bun:"deleted_at,soft_delete,nullzero"`

    // Relations
    Conversations []Conversation `bun:"rel:has-many,join:id=user_id"`
    Settings      *UserSettings  `bun:"rel:has-one,join:id=user_id"`
}

var _ bun.BeforeAppendModelHook = (*User)(nil)

func (u *User) BeforeAppendModel(ctx context.Context, query bun.Query) error {
    switch query.(type) {
    case *bun.InsertQuery:
        u.CreatedAt = time.Now()
        u.UpdatedAt = time.Now()
    case *bun.UpdateQuery:
        u.UpdatedAt = time.Now()
    }
    return nil
}
```

### 3. Repositoryの実装

```go
// internal/db/repository/user_repository.go
package repository

import (
    "context"
    "database/sql"
    "errors"
    "fmt"

    "github.com/uptrace/bun"
    "talk/go/internal/db/models"
)

type UserRepository struct {
    db *bun.DB
}

func NewUserRepository(db *bun.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
    _, err := r.db.NewInsert().
        Model(user).
        Exec(ctx)

    if err != nil {
        return HandleDatabaseError(err)
    }

    return nil
}

func (r *UserRepository) FindByID(ctx context.Context, id int64) (*models.User, error) {
    user := new(models.User)

    err := r.db.NewSelect().
        Model(user).
        Where("id = ?", id).
        Scan(ctx)

    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrNotFound
        }
        return nil, fmt.Errorf("failed to find user: %w", err)
    }

    return user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
    user := new(models.User)

    err := r.db.NewSelect().
        Model(user).
        Where("LOWER(email) = LOWER(?)", email).
        Scan(ctx)

    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrNotFound
        }
        return nil, fmt.Errorf("failed to find user: %w", err)
    }

    return user, nil
}
```

### 4. マイグレーションの作成

#### スキーマファイルの作成

```sql
-- internal/db/schema/001_users.sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
```

#### Atlasの設定

```hcl
# go/atlas.hcl

env "local" {
  src = "file://internal/db/schema"
  dev = "docker://postgres/15/dev?search_path=public"

  migration {
    dir = "file://internal/db/migrations"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}

env "supabase" {
  src = "file://internal/db/schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://internal/db/migrations"
    tx_mode = "all"
  }
}
```

#### マイグレーション生成と適用

```bash
cd go/

# マイグレーションを生成
atlas migrate diff init \
  --env local \
  --to file://internal/db/schema

# Supabaseに適用（ドライラン）
atlas migrate apply \
  --env supabase \
  --dry-run

# Supabaseに適用（実行）
atlas migrate apply \
  --env supabase
```

---

## 使用例

### メインアプリケーション

```go
// cmd/api/main.go
package main

import (
    "context"
    "log"
    "os"

    "github.com/joho/godotenv"
    "talk/go/internal/config"
    "talk/go/internal/db/models"
    "talk/go/internal/db/repository"
)

func main() {
    // 環境変数のロード
    if err := godotenv.Load(".env.local"); err != nil {
        log.Printf("Warning: .env.local not found")
    }

    // データベース接続
    db, err := config.NewDatabase()
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()

    log.Println("Successfully connected to Supabase!")

    // Repositoryの初期化
    userRepo := repository.NewUserRepository(db)

    // 使用例
    ctx := context.Background()

    // ユーザーの作成
    user := &models.User{
        Email: "test@example.com",
        Name:  "Test User",
    }

    if err := userRepo.Create(ctx, user); err != nil {
        log.Printf("Failed to create user: %v", err)
    } else {
        log.Printf("Created user with ID: %d", user.ID)
    }

    // ユーザーの取得
    foundUser, err := userRepo.FindByEmail(ctx, "test@example.com")
    if err != nil {
        log.Printf("Failed to find user: %v", err)
    } else {
        log.Printf("Found user: %s (%s)", foundUser.Name, foundUser.Email)
    }
}
```

### 実行

```bash
cd go/

# アプリケーションの実行
go run cmd/api/main.go
```

---

## テストの実行

### テストファイルの例

```go
// internal/db/repository/user_repository_test.go
package repository_test

import (
    "context"
    "testing"

    "talk/go/internal/db/models"
    "talk/go/internal/db/repository"
    "talk/go/internal/testutil"
)

func TestUserRepository_Create(t *testing.T) {
    // Testcontainersでテスト用DBをセットアップ
    testDB := testutil.SetupTestDB(t)
    repo := repository.NewUserRepository(testDB)

    ctx := context.Background()

    user := &models.User{
        Email: "test@example.com",
        Name:  "Test User",
    }

    err := repo.Create(ctx, user)
    if err != nil {
        t.Fatalf("Failed to create user: %v", err)
    }

    if user.ID == 0 {
        t.Error("Expected user ID to be set")
    }

    // 取得して確認
    found, err := repo.FindByEmail(ctx, "test@example.com")
    if err != nil {
        t.Fatalf("Failed to find user: %v", err)
    }

    if found.Name != user.Name {
        t.Errorf("Expected name %s, got %s", user.Name, found.Name)
    }
}
```

### テスト実行

```bash
cd go/

# すべてのテストを実行
go test ./... -v

# カバレッジ付きで実行
go test ./... -race -cover -v

# 特定のパッケージのみ
go test ./internal/db/repository/... -v
```

---

## トラブルシューティング

### 接続エラー

```
failed to ping database: failed to connect to `host=...`: dial tcp: i/o timeout
```

**解決策**:
1. DATABASE_URLが正しいか確認
2. Supabaseプロジェクトがアクティブか確認
3. ファイアウォール設定を確認
4. `sslmode=require` が設定されているか確認

### SSL接続エラー

```
pq: SSL is not enabled on the server
```

**解決策**:
接続文字列に `?sslmode=require` を追加：
```
DATABASE_URL="postgresql://...?sslmode=require"
```

### マイグレーションエラー

```
atlas migrate apply: Error: unable to connect to database
```

**解決策**:
1. DATABASE_URL環境変数が設定されているか確認
   ```bash
   echo $DATABASE_URL
   ```
2. Supabaseへの接続を確認
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

### 接続プール枯渇

```
Error: cannot acquire connection: all connections are busy
```

**解決策**:
1. `DB_MAX_CONNS` を増やす（Supabase制限内で）
2. 接続のクローズ漏れがないか確認
3. 長時間実行クエリを最適化

---

## 次のステップ

### 1. 他のモデルの実装

- Conversation
- Message
- UserSettings

### 2. Service層の追加

```go
// internal/service/user_service.go
type UserService struct {
    repo *repository.UserRepository
}

func (s *UserService) RegisterUser(ctx context.Context, email, name string) (*models.User, error) {
    // ビジネスロジック
    // バリデーション
    // Repository呼び出し
}
```

### 3. API Handlerとの統合

```go
// internal/handler/user_handler.go
func (h *UserHandler) CreateUser(c *gin.Context) {
    // リクエストパース
    // Serviceレイヤー呼び出し
    // レスポンス返却
}
```

### 4. 監視の追加

- 接続プールメトリクス
- スロークエリログ
- エラーレート監視

---

## 便利なコマンド集

```bash
# データベース接続確認
psql $DATABASE_URL -c "SELECT version();"

# テーブル一覧表示
psql $DATABASE_URL -c "\dt"

# スキーマのエクスポート
pg_dump $DATABASE_URL --schema-only > schema.sql

# データのエクスポート
pg_dump $DATABASE_URL > backup.sql

# Atlas: マイグレーション状態確認
atlas migrate status --env supabase

# Atlas: マイグレーション履歴
atlas migrate status --env supabase --log

# Go: 依存関係の整理
go mod tidy

# Go: ベンダーディレクトリ作成
go mod vendor
```

---

## リファレンス

### ドキュメント
- [Bun ORM Documentation](https://bun.uptrace.dev/)
- [Atlas Documentation](https://atlasgo.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [pgx Documentation](https://pkg.go.dev/github.com/jackc/pgx/v5)

### プロジェクト内ドキュメント
- [data-model.md](./data-model.md) - データモデル詳細
- [research.md](./research.md) - 技術調査とベストプラクティス
- [contracts/database-repository.md](./contracts/database-repository.md) - Repository契約

---

## サポート

問題が発生した場合：

1. このドキュメントのトラブルシューティングセクションを確認
2. プロジェクトのissueを検索
3. 新しいissueを作成（エラーメッセージと環境情報を含める）

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2025-10-18
