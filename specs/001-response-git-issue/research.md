# データベース接続基盤リサーチ

**日付**: 2025-10-18
**プロジェクト**: Talk - AI言語学習アプリケーション
**技術スタック**: Go (Gin + Connect RPC), Supabase (PostgreSQL), Next.js, Python AI Service

## エグゼクティブサマリー

Supabase（PostgreSQL）への接続を前提としたデータベース接続基盤の実装について調査しました。以下の技術スタックを推奨します：

- **Bun ORM**: 型安全でSQL優先のデータベース操作
- **Atlas**: 宣言的スキーマ管理とマイグレーション
- **pgxpool** (pgx v5 driver): 高性能な接続プーリング
- **Testcontainers**: 統合テスト用

---

## 1. Supabase接続設定

### Supabaseの概要

Supabaseは、オープンソースのFirebase代替で、以下の機能を提供します：
- PostgreSQL 15データベース（フルコントロール）
- REST/GraphQL API（自動生成）
- リアルタイムサブスクリプション
- 認証機能（組み込み）
- ストレージ

### 接続情報の取得

Supabaseダッシュボードから以下の情報を取得：

```bash
# Supabase Project Settings > Database > Connection string
# Direct connection (推奨: セッションモード)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Transaction mode (PgBouncerトランザクションプーリング)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session mode (PgBouncerセッションプーリング)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### Supabase固有の考慮事項

#### 1. 接続プーリングモード

Supabaseは2つの接続モードを提供：

**セッションモード（ポート5432）**
- 推奨: アプリケーションレベルの接続プーリング用
- Prepared Statementsサポート
- すべてのPostgreSQL機能が利用可能
- 接続制限: Pro plan 40接続、Free plan 15接続

**トランザクションモード（ポート6543）**
- サーバーレス/短命な接続用
- Prepared Statementsなし
- 一部の機能制限あり
- 高い同時接続数をサポート

**推奨**: Go APIサーバーでは**セッションモード（ポート5432）**を使用し、アプリケーション側でpgxpoolによる接続プーリングを実装。

#### 2. 接続制限

| プラン | セッションモード最大接続数 |
|--------|--------------------------|
| Free   | 15                       |
| Pro    | 40                       |
| Team   | 90                       |
| Enterprise | カスタム            |

**対策**: アプリケーション側の接続プールサイズを適切に設定（Free: MaxConns=10, Pro: MaxConns=30）

#### 3. SSL接続

Supabaseは常にSSL接続を要求：

```go
// SSL設定が必須
config, err := pgxpool.ParseConfig(
    "postgresql://user:pass@host:5432/db?sslmode=require"
)
```

---

## 2. Bun ORM設定（Supabase用）

### 接続設定

```go
package config

import (
    "database/sql"
    "os"

    "github.com/uptrace/bun"
    "github.com/uptrace/bun/dialect/pgdialect"
    "github.com/uptrace/bun/driver/pgdriver"
    "github.com/uptrace/bun/extra/bundebug"
)

func NewSupabaseDB() *bun.DB {
    // Supabaseの接続文字列を環境変数から取得
    dsn := os.Getenv("DATABASE_URL")

    // pgdriver connector with SSL
    connector := pgdriver.NewConnector(
        pgdriver.WithDSN(dsn),
        pgdriver.WithTLSConfig(nil), // Use default TLS config
    )

    sqldb := sql.OpenDB(connector)

    // Bunデータベースインスタンス作成
    db := bun.NewDB(sqldb, pgdialect.New())

    // 開発環境でのクエリログ（本番では無効化）
    if os.Getenv("ENV") != "production" {
        db.AddQueryHook(bundebug.NewQueryHook(
            bundebug.WithVerbose(true),
        ))
    }

    return db
}
```

### モデル定義（Supabase対応）

```go
package models

import (
    "context"
    "time"

    "github.com/uptrace/bun"
)

// User - Supabaseのusersテーブル
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

// BeforeAppendModel hook for auto-updating timestamps
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

// Conversation - ユーザーとAI間の会話セッション
type Conversation struct {
    bun.BaseModel `bun:"table:conversations,alias:c"`

    ID        int64     `bun:"id,pk,autoincrement"`
    UserID    int64     `bun:"user_id,notnull"`
    Title     string    `bun:"title"`
    CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
    UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`

    // Relations
    User     *User     `bun:"rel:belongs-to,join:user_id=id"`
    Messages []Message `bun:"rel:has-many,join:id=conversation_id"`
}

// Message - 会話内の個別メッセージ
type Message struct {
    bun.BaseModel `bun:"table:messages,alias:m"`

    ID             int64     `bun:"id,pk,autoincrement"`
    ConversationID int64     `bun:"conversation_id,notnull"`
    Role           string    `bun:"role,notnull"` // 'user' or 'assistant'
    Content        string    `bun:"content,notnull"`
    CreatedAt      time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`

    // Relations
    Conversation *Conversation `bun:"rel:belongs-to,join:conversation_id=id"`
}

// UserSettings - ユーザー個人設定
type UserSettings struct {
    bun.BaseModel `bun:"table:user_settings,alias:us"`

    ID              int64  `bun:"id,pk,autoincrement"`
    UserID          int64  `bun:"user_id,notnull,unique"`
    Language        string `bun:"language,notnull,default:'ja'"`
    SelectedCharacter string `bun:"selected_character"`
    Theme           string `bun:"theme,default:'light'"`

    // Relations
    User *User `bun:"rel:belongs-to,join:user_id=id"`
}
```

---

## 3. 接続プーリング設定（Supabase用）

### Supabase向け推奨設定

```go
package config

import (
    "context"
    "fmt"
    "os"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

type SupabaseDatabaseConfig struct {
    MaxConns          int32
    MinConns          int32
    MaxConnLifetime   time.Duration
    MaxConnIdleTime   time.Duration
    HealthCheckPeriod time.Duration
    ConnectTimeout    time.Duration
}

// Supabase Free Plan設定（最大15接続）
func FreeSupabaseConfig() *SupabaseDatabaseConfig {
    return &SupabaseDatabaseConfig{
        MaxConns:          10,  // Supabase Free limit: 15, 余裕を持たせる
        MinConns:          2,   // 最小接続を維持
        MaxConnLifetime:   1 * time.Hour,
        MaxConnIdleTime:   30 * time.Minute,
        HealthCheckPeriod: 1 * time.Minute,
        ConnectTimeout:    10 * time.Second, // Supabaseは接続に時間がかかる可能性
    }
}

// Supabase Pro Plan設定（最大40接続）
func ProSupabaseConfig() *SupabaseDatabaseConfig {
    return &SupabaseDatabaseConfig{
        MaxConns:          30,  // Supabase Pro limit: 40
        MinConns:          5,
        MaxConnLifetime:   1 * time.Hour,
        MaxConnIdleTime:   30 * time.Minute,
        HealthCheckPeriod: 1 * time.Minute,
        ConnectTimeout:    10 * time.Second,
    }
}

func NewSupabaseConnectionPool(ctx context.Context) (*pgxpool.Pool, error) {
    databaseURL := os.Getenv("DATABASE_URL")
    if databaseURL == "" {
        return nil, fmt.Errorf("DATABASE_URL not set")
    }

    config, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, fmt.Errorf("failed to parse database URL: %w", err)
    }

    // Supabase plan に応じた設定を適用
    var dbConfig *SupabaseDatabaseConfig
    if os.Getenv("SUPABASE_PLAN") == "pro" {
        dbConfig = ProSupabaseConfig()
    } else {
        dbConfig = FreeSupabaseConfig()
    }

    config.MaxConns = dbConfig.MaxConns
    config.MinConns = dbConfig.MinConns
    config.MaxConnLifetime = dbConfig.MaxConnLifetime
    config.MaxConnIdleTime = dbConfig.MaxConnIdleTime
    config.HealthCheckPeriod = dbConfig.HealthCheckPeriod
    config.ConnConfig.ConnectTimeout = dbConfig.ConnectTimeout

    // SSL設定（Supabase必須）
    config.ConnConfig.RuntimeParams["sslmode"] = "require"

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, fmt.Errorf("failed to create connection pool: %w", err)
    }

    // 接続確認
    if err := pool.Ping(ctx); err != nil {
        pool.Close()
        return nil, fmt.Errorf("failed to ping Supabase database: %w", err)
    }

    return pool, nil
}
```

### 環境変数設定

```bash
# .env.local (開発環境)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
SUPABASE_PLAN="free"  # or "pro"
ENV="development"

# .env.production (本番環境)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
SUPABASE_PLAN="pro"
ENV="production"
```

---

## 4. Atlas マイグレーション設定（Supabase用）

### Atlas設定ファイル

```hcl
# go/atlas.hcl

env "dev" {
  # ローカル開発: Dockerコンテナ
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

env "supabase_local" {
  # Supabaseローカル開発
  src = "file://internal/db/schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://internal/db/migrations"
    tx_mode = "all"  # 全マイグレーションを1トランザクションで実行
  }
}

env "supabase_production" {
  # Supabase本番環境
  src = "file://internal/db/schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://internal/db/migrations"
    tx_mode = "all"

    # 本番環境では慎重に
    baseline = getenv("MIGRATION_BASELINE")
  }
}
```

### スキーマ定義

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

-- internal/db/schema/002_conversations.sql
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- internal/db/schema/003_messages.sql
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at);

-- internal/db/schema/004_user_settings.sql
CREATE TABLE IF NOT EXISTS user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'ja',
    selected_character VARCHAR(100),
    theme VARCHAR(20) DEFAULT 'light'
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

### マイグレーション実行

```bash
# マイグレーション生成
atlas migrate diff init \
  --env supabase_local \
  --to file://internal/db/schema

# ドライラン（本番環境適用前）
atlas migrate apply \
  --env supabase_production \
  --dry-run

# Supabase本番環境へ適用
atlas migrate apply \
  --env supabase_production \
  --url "$DATABASE_URL"
```

---

## 5. Supabase特有の機能統合

### Row Level Security (RLS)との統合

SupabaseのRLS機能を使用する場合：

```go
// RLS用のコンテキスト設定
func SetSupabaseUserContext(ctx context.Context, db *bun.DB, userID int64) error {
    _, err := db.ExecContext(ctx,
        "SELECT set_config('request.jwt.claim.sub', $1, true)",
        fmt.Sprintf("%d", userID),
    )
    return err
}

// 使用例
func (r *UserRepository) FindByID(ctx context.Context, userID int64) (*User, error) {
    // RLSコンテキストを設定
    if err := SetSupabaseUserContext(ctx, r.db, userID); err != nil {
        return nil, err
    }

    var user User
    err := r.db.NewSelect().
        Model(&user).
        Where("id = ?", userID).
        Scan(ctx)

    return &user, err
}
```

### Supabase Realtime統合

```go
// リアルタイム変更通知用のLISTEN/NOTIFY
func (r *MessageRepository) NotifyNewMessage(ctx context.Context, conversationID int64) error {
    _, err := r.db.ExecContext(ctx,
        "SELECT pg_notify('new_message', $1)",
        fmt.Sprintf(`{"conversation_id": %d}`, conversationID),
    )
    return err
}
```

---

## 6. テスト戦略（Supabase環境）

### ローカルテスト: Testcontainers

```go
func SetupTestDB(t *testing.T) *bun.DB {
    ctx := context.Background()

    // PostgreSQL 15コンテナ（Supabaseと同じバージョン）
    pgContainer, err := postgres.Run(ctx,
        "postgres:15-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("postgres"),
        postgres.WithPassword("postgres"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready").
                WithOccurrence(2).
                WithStartupTimeout(30*time.Second),
        ),
    )
    if err != nil {
        t.Fatalf("failed to start container: %s", err)
    }

    connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    if err != nil {
        t.Fatalf("failed to get connection string: %s", err)
    }

    sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(connStr)))
    db := bun.NewDB(sqldb, pgdialect.New())

    t.Cleanup(func() {
        db.Close()
        pgContainer.Terminate(ctx)
    })

    return db
}
```

### Supabase テスト環境

```bash
# Supabase CLI でローカル環境を起動
supabase start

# テスト実行
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres" \
  go test ./... -v

# 停止
supabase stop
```

---

## 7. 決定事項サマリー

### データベースホスト

✅ **決定**: Supabase (PostgreSQL 15)

**理由**:
- マネージドサービスで運用コスト削減
- 自動バックアップとポイントインタイムリカバリ
- 組み込み認証機能
- リアルタイムサブスクリプション
- スケーラブルなインフラ

**接続モード**: セッションモード（ポート5432）+ アプリケーションレベルプーリング

### 接続プール設定

| 環境 | プラン | MaxConns | MinConns |
|------|--------|----------|----------|
| 開発 | Free   | 10       | 2        |
| 本番 | Pro    | 30       | 5        |

**制約**:
- Supabase Free: 最大15接続
- Supabase Pro: 最大40接続
- 余裕を持たせて設定（障害時の余裕）

### データ保持期間

✅ **決定**: 無期限保存

**理由**:
- 会話履歴は学習データとして価値がある
- ユーザーが過去の会話を参照できる
- GDPR対応: ユーザーが明示的に削除リクエストした場合のみ削除

### バックアップポリシー

✅ **決定**: Supabaseの自動バックアップを使用

**Supabase提供機能**:
- 自動日次バックアップ（7日間保持）
- ポイントインタイムリカバリ（Pro plan: 7日、Team plan: 28日）
- 手動バックアップも可能

**追加対策**:
- 重要データの定期的なエクスポート（週次）
- 本番環境のマイグレーション前に手動バックアップ

### スケール想定

✅ **決定**: 初期フェーズ

**想定規模**:
- 同時接続ユーザー数: 100-500
- 総ユーザー数: 1,000-10,000
- 会話データ: 月間10,000会話
- メッセージ: 月間100,000メッセージ

**スケーリング戦略**:
- Phase 1: Supabase Free（検証用）
- Phase 2: Supabase Pro（正式ローンチ）
- Phase 3: 必要に応じてTeam/Enterpriseプランへ

---

## 8. 実装ロードマップ

### Phase 1: 基盤構築（Week 1）

1. **Supabaseプロジェクト作成**
   - Supabaseアカウント作成
   - 新規プロジェクト作成（ap-northeast-1リージョン）
   - 接続情報の取得

2. **Go依存関係のインストール**
   ```bash
   go get github.com/uptrace/bun
   go get github.com/uptrace/bun/driver/pgdriver
   go get github.com/uptrace/bun/dialect/pgdialect
   go get github.com/jackc/pgx/v5/pgxpool
   ```

3. **接続設定の実装**
   - `internal/config/database.go` 作成
   - Supabase接続プール設定
   - 環境変数管理

4. **モデル定義**
   - User, Conversation, Message, UserSettings

### Phase 2: スキーマ管理（Week 1-2）

1. **Atlas導入**
   ```bash
   curl -sSf https://atlasgo.sh | sh
   ```

2. **スキーマファイル作成**
   - `internal/db/schema/*.sql`
   - インデックス定義

3. **初期マイグレーション**
   ```bash
   atlas migrate diff init --env supabase_local
   atlas migrate apply --env supabase_local
   ```

### Phase 3: Repository層（Week 2）

1. **UserRepository実装**
   - CRUD操作
   - トランザクションサポート

2. **ConversationRepository実装**
   - リレーション処理
   - ページネーション

3. **MessageRepository実装**
   - バルク挿入
   - 時系列ソート

4. **テスト作成**
   - Testcontainersセットアップ
   - 統合テスト

### Phase 4: 統合とテスト（Week 3）

1. **既存APIとの統合**
   - Gin handlersからRepositoryを呼び出し
   - エラーハンドリング

2. **パフォーマンステスト**
   - 接続プールメトリクス監視
   - スロークエリ検出

3. **ドキュメント作成**
   - API仕様書
   - データベーススキーマ図
   - 運用ガイド

---

## 9. 監視とメトリクス

### 接続プールメトリクス

```go
func LogSupabasePoolStats(pool *pgxpool.Pool) {
    stats := pool.Stat()
    log.Printf("Supabase Pool Stats - "+
        "Total: %d/%d, Idle: %d/%d, Acquired: %d",
        stats.TotalConns(), stats.MaxConns(),
        stats.IdleConns(), stats.MinConns(),
        stats.AcquiredConns(),
    )

    // アラート: 接続プールが80%以上使用
    if float64(stats.AcquiredConns()) >= float64(stats.MaxConns())*0.8 {
        log.Warn("Supabase connection pool at 80% capacity")
    }
}
```

### Supabaseダッシュボード監視項目

- データベース接続数
- クエリパフォーマンス
- ストレージ使用量
- APIリクエスト数

---

## 10. セキュリティ考慮事項

### 環境変数管理

```bash
# 本番環境では環境変数管理サービスを使用
# 例: AWS Secrets Manager, Vercel Environment Variables

# .env.exampleをリポジトリにコミット（値は含めない）
DATABASE_URL=
SUPABASE_PLAN=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### SSL接続

Supabaseは常にSSL接続を要求：
- 開発環境でも`sslmode=require`
- 証明書検証を無効にしない（`sslmode=disable`は禁止）

### 最小権限の原則

```sql
-- アプリケーション用のロールを作成（Supabaseダッシュボードから）
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO app_user;
GRANT SELECT, INSERT ON messages TO app_user;
```

---

## まとめ

Supabaseを使用することで、以下のメリットを享受できます：

✅ **運用の簡素化**: マネージドサービスで保守コスト削減
✅ **スケーラビリティ**: 需要に応じてプラン変更可能
✅ **セキュリティ**: 組み込みのバックアップとセキュリティ機能
✅ **開発速度**: インフラ構築不要で開発に集中
✅ **コスト効率**: 初期段階はFreeプランで検証可能

### 次のステップ

1. Supabaseプロジェクト作成
2. 接続情報を環境変数に設定
3. Phase 1の実装開始（基盤構築）
4. スキーママイグレーション実行
5. Repository層の実装とテスト

---

**ドキュメントバージョン**: 1.0 (Supabase対応)
**最終更新**: 2025-10-18
**管理者**: Development Team
