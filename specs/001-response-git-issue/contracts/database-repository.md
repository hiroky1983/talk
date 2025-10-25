# Database Repository Contracts

**プロジェクト**: Talk - AI言語学習アプリケーション
**日付**: 2025-10-18

このドキュメントは、データベースRepository層のインターフェース契約を定義します。

---

## 1. UserRepository

### インターフェース定義

```go
package repository

import (
    "context"
    "talk/go/internal/db/models"
)

type UserRepository interface {
    // Create creates a new user
    // Returns: created user with ID populated, or error
    Create(ctx context.Context, user *models.User) error

    // FindByID retrieves a user by ID
    // Returns: user, or ErrNotFound if not exists
    FindByID(ctx context.Context, id int64) (*models.User, error)

    // FindByEmail retrieves a user by email address
    // Returns: user, or ErrNotFound if not exists
    FindByEmail(ctx context.Context, email string) (*models.User, error)

    // Update updates an existing user
    // Returns: error if user doesn't exist or update fails
    Update(ctx context.Context, user *models.User) error

    // Delete soft-deletes a user by ID
    // Returns: ErrNotFound if user doesn't exist
    Delete(ctx context.Context, id int64) error

    // List retrieves users with pagination
    // Returns: slice of users and total count
    List(ctx context.Context, limit, offset int) ([]models.User, int, error)

    // WithSettings retrieves a user with their settings
    // Returns: user with Settings relation loaded
    WithSettings(ctx context.Context, id int64) (*models.User, error)
}
```

### メソッド仕様

#### Create
```go
func (r *UserRepositoryImpl) Create(ctx context.Context, user *models.User) error
```

**前提条件**:
- `user.Email` が有効なメールアドレス形式
- `user.Name` が1文字以上

**事後条件**:
- `user.ID` が自動採番されて設定される
- `user.CreatedAt` と `user.UpdatedAt` が現在時刻に設定される

**エラー**:
- `ErrDuplicate`: メールアドレスが既に存在
- `ErrInvalidInput`: 必須フィールドが不足

**例**:
```go
user := &models.User{
    Email: "test@example.com",
    Name:  "Test User",
}
err := repo.Create(ctx, user)
// user.ID == 1 (auto-generated)
```

#### FindByID
```go
func (r *UserRepositoryImpl) FindByID(ctx context.Context, id int64) (*models.User, error)
```

**前提条件**:
- `id > 0`

**事後条件**:
- ユーザーが存在する場合、完全なUserオブジェクトを返す
- ソフトデリートされたユーザーは取得しない

**エラー**:
- `ErrNotFound`: ユーザーが存在しない、または削除済み

**例**:
```go
user, err := repo.FindByID(ctx, 1)
if err == repository.ErrNotFound {
    // ユーザーが存在しない
}
```

#### FindByEmail
```go
func (r *UserRepositoryImpl) FindByEmail(ctx context.Context, email string) (*models.User, error)
```

**前提条件**:
- `email` が空文字列でない

**事後条件**:
- メールアドレスで検索（大文字小文字を区別しない）
- ソフトデリートされたユーザーは取得しない

**エラー**:
- `ErrNotFound`: ユーザーが存在しない
- `ErrInvalidInput`: email が空文字列

**例**:
```go
user, err := repo.FindByEmail(ctx, "test@example.com")
```

#### Update
```go
func (r *UserRepositoryImpl) Update(ctx context.Context, user *models.User) error
```

**前提条件**:
- `user.ID > 0`
- ユーザーが存在する

**事後条件**:
- `user.UpdatedAt` が現在時刻に更新される
- 指定されたフィールドのみ更新

**エラー**:
- `ErrNotFound`: ユーザーが存在しない
- `ErrDuplicate`: 新しいメールアドレスが既に使用されている

**例**:
```go
user.Name = "Updated Name"
err := repo.Update(ctx, user)
```

#### Delete
```go
func (r *UserRepositoryImpl) Delete(ctx context.Context, id int64) error
```

**前提条件**:
- `id > 0`
- ユーザーが存在する

**事後条件**:
- `deleted_at` が現在時刻に設定される（ソフトデリート）
- 関連する会話と設定は CASCADE DELETE される

**エラー**:
- `ErrNotFound`: ユーザーが存在しない

**例**:
```go
err := repo.Delete(ctx, 1)
```

---

## 2. ConversationRepository

### インターフェース定義

```go
package repository

type ConversationRepository interface {
    // Create creates a new conversation
    Create(ctx context.Context, conversation *models.Conversation) error

    // FindByID retrieves a conversation by ID
    FindByID(ctx context.Context, id int64) (*models.Conversation, error)

    // FindByUserID retrieves all conversations for a user
    // Returns conversations ordered by created_at DESC
    FindByUserID(ctx context.Context, userID int64, limit, offset int) ([]models.Conversation, error)

    // Update updates a conversation
    Update(ctx context.Context, conversation *models.Conversation) error

    // Delete deletes a conversation and its messages
    Delete(ctx context.Context, id int64) error

    // WithMessages retrieves a conversation with all messages loaded
    WithMessages(ctx context.Context, id int64) (*models.Conversation, error)

    // CountByUserID returns the total number of conversations for a user
    CountByUserID(ctx context.Context, userID int64) (int, error)
}
```

### メソッド仕様

#### Create
```go
func (r *ConversationRepositoryImpl) Create(ctx context.Context, conversation *models.Conversation) error
```

**前提条件**:
- `conversation.UserID` が有効なユーザーIDを参照

**事後条件**:
- `conversation.ID` が自動採番される
- `conversation.CreatedAt` と `conversation.UpdatedAt` が設定される

**エラー**:
- `ErrForeignKey`: UserIDが存在しない
- `ErrInvalidInput`: UserIDが0または負

**例**:
```go
conversation := &models.Conversation{
    UserID: 1,
    Title:  "Learning Japanese",
}
err := repo.Create(ctx, conversation)
```

#### FindByUserID
```go
func (r *ConversationRepositoryImpl) FindByUserID(ctx context.Context, userID int64, limit, offset int) ([]models.Conversation, error)
```

**前提条件**:
- `userID > 0`
- `limit > 0`, `offset >= 0`

**事後条件**:
- 会話を `created_at DESC` でソート
- ページネーション適用

**エラー**:
- `ErrInvalidInput`: 無効なパラメータ

**例**:
```go
conversations, err := repo.FindByUserID(ctx, 1, 20, 0) // 最初の20件
```

#### WithMessages
```go
func (r *ConversationRepositoryImpl) WithMessages(ctx context.Context, id int64) (*models.Conversation, error)
```

**前提条件**:
- `id > 0`

**事後条件**:
- `Conversation.Messages` が時系列順にロード される
- N+1問題を回避

**エラー**:
- `ErrNotFound`: 会話が存在しない

**例**:
```go
conversation, err := repo.WithMessages(ctx, 1)
// conversation.Messages が populated
```

---

## 3. MessageRepository

### インターフェース定義

```go
package repository

type MessageRepository interface {
    // Create creates a new message
    Create(ctx context.Context, message *models.Message) error

    // CreateBatch creates multiple messages in a single operation
    CreateBatch(ctx context.Context, messages []models.Message) error

    // FindByID retrieves a message by ID
    FindByID(ctx context.Context, id int64) (*models.Message, error)

    // FindByConversationID retrieves all messages in a conversation
    // Returns messages ordered by created_at ASC
    FindByConversationID(ctx context.Context, conversationID int64) ([]models.Message, error)

    // Delete deletes a message
    Delete(ctx context.Context, id int64) error

    // CountByConversationID returns the total message count in a conversation
    CountByConversationID(ctx context.Context, conversationID int64) (int, error)
}
```

### メソッド仕様

#### Create
```go
func (r *MessageRepositoryImpl) Create(ctx context.Context, message *models.Message) error
```

**前提条件**:
- `message.ConversationID` が有効な会話IDを参照
- `message.Role` が 'user' または 'assistant'
- `message.Content` が空でない

**事後条件**:
- `message.ID` が自動採番される
- `message.CreatedAt` が設定される

**エラー**:
- `ErrForeignKey`: ConversationIDが存在しない
- `ErrInvalidInput`: Role が不正、または Content が空

**例**:
```go
message := &models.Message{
    ConversationID: 1,
    Role:           "user",
    Content:        "Hello!",
}
err := repo.Create(ctx, message)
```

#### CreateBatch
```go
func (r *MessageRepositoryImpl) CreateBatch(ctx context.Context, messages []models.Message) error
```

**前提条件**:
- すべてのメッセージが有効
- `len(messages) > 0`

**事後条件**:
- 単一のINSERT文で実行（パフォーマンス最適化）
- すべてのメッセージIDが設定される

**エラー**:
- `ErrInvalidInput`: 空のスライス
- `ErrForeignKey`: 無効なConversationID

**例**:
```go
messages := []models.Message{
    {ConversationID: 1, Role: "user", Content: "Question"},
    {ConversationID: 1, Role: "assistant", Content: "Answer"},
}
err := repo.CreateBatch(ctx, messages)
```

#### FindByConversationID
```go
func (r *MessageRepositoryImpl) FindByConversationID(ctx context.Context, conversationID int64) ([]models.Message, error)
```

**前提条件**:
- `conversationID > 0`

**事後条件**:
- メッセージを `created_at ASC` でソート（時系列順）

**エラー**:
- なし（会話が存在しない場合は空スライスを返す）

**例**:
```go
messages, err := repo.FindByConversationID(ctx, 1)
// messages[0] が最も古いメッセージ
```

---

## 4. UserSettingsRepository

### インターフェース定義

```go
package repository

type UserSettingsRepository interface {
    // Create creates user settings
    Create(ctx context.Context, settings *models.UserSettings) error

    // FindByUserID retrieves settings for a user
    FindByUserID(ctx context.Context, userID int64) (*models.UserSettings, error)

    // Update updates user settings
    Update(ctx context.Context, settings *models.UserSettings) error

    // Upsert creates or updates settings (INSERT ... ON CONFLICT)
    Upsert(ctx context.Context, settings *models.UserSettings) error
}
```

### メソッド仕様

#### Create
```go
func (r *UserSettingsRepositoryImpl) Create(ctx context.Context, settings *models.UserSettings) error
```

**前提条件**:
- `settings.UserID` が有効なユーザーIDを参照
- そのユーザーの設定がまだ存在しない

**事後条件**:
- `settings.ID` が自動採番される
- デフォルト値が適用される（Language='ja', Theme='light'）

**エラー**:
- `ErrDuplicate`: そのユーザーの設定が既に存在
- `ErrForeignKey`: UserIDが存在しない

**例**:
```go
settings := &models.UserSettings{
    UserID:   1,
    Language: "en",
}
err := repo.Create(ctx, settings)
```

#### FindByUserID
```go
func (r *UserSettingsRepositoryImpl) FindByUserID(ctx context.Context, userID int64) (*models.UserSettings, error)
```

**前提条件**:
- `userID > 0`

**事後条件**:
- ユーザーの設定を返す

**エラー**:
- `ErrNotFound`: 設定が存在しない

**例**:
```go
settings, err := repo.FindByUserID(ctx, 1)
```

#### Upsert
```go
func (r *UserSettingsRepositoryImpl) Upsert(ctx context.Context, settings *models.UserSettings) error
```

**前提条件**:
- `settings.UserID > 0`

**事後条件**:
- 設定が存在しない場合は作成
- 設定が存在する場合は更新

**エラー**:
- `ErrForeignKey`: UserIDが存在しない

**例**:
```go
settings := &models.UserSettings{
    UserID:   1,
    Language: "ja",
    Theme:    "dark",
}
err := repo.Upsert(ctx, settings) // 存在しなければ作成、存在すれば更新
```

---

## 共通エラー定義

```go
package repository

import "errors"

var (
    // ErrNotFound is returned when a record is not found
    ErrNotFound = errors.New("record not found")

    // ErrDuplicate is returned when a unique constraint is violated
    ErrDuplicate = errors.New("duplicate record")

    // ErrForeignKey is returned when a foreign key constraint is violated
    ErrForeignKey = errors.New("foreign key violation")

    // ErrInvalidInput is returned when input validation fails
    ErrInvalidInput = errors.New("invalid input")

    // ErrTransaction is returned when a transaction fails
    ErrTransaction = errors.New("transaction failed")
)
```

---

## トランザクションサポート

すべてのRepositoryメソッドは `context.Context` を受け取り、トランザクション内で実行可能です。

```go
// トランザクションの使用例
err := db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
    // Repositoryにtxを渡す
    userRepo := NewUserRepository(tx)
    settingsRepo := NewUserSettingsRepository(tx)

    user := &models.User{Email: "test@example.com", Name: "Test"}
    if err := userRepo.Create(ctx, user); err != nil {
        return err // 自動ロールバック
    }

    settings := &models.UserSettings{UserID: user.ID, Language: "ja"}
    if err := settingsRepo.Create(ctx, settings); err != nil {
        return err // 自動ロールバック
    }

    return nil // 自動コミット
})
```

---

## パフォーマンス考慮事項

### バッチ操作

大量データの挿入時は `CreateBatch` を使用：

```go
// 悪い例: 個別に挿入（N回のINSERT）
for _, msg := range messages {
    repo.Create(ctx, &msg) // 遅い
}

// 良い例: バッチ挿入（1回のINSERT）
repo.CreateBatch(ctx, messages) // 速い
```

### N+1問題の回避

リレーションデータを取得する専用メソッドを使用：

```go
// 悪い例: N+1クエリ
conversations, _ := conversationRepo.FindByUserID(ctx, userID, 10, 0)
for _, conv := range conversations {
    messages, _ := messageRepo.FindByConversationID(ctx, conv.ID) // N回のクエリ
}

// 良い例: Eager Loading
conversation, _ := conversationRepo.WithMessages(ctx, convID) // 1回のクエリ
```

---

## テストコントラクト

各Repositoryメソッドは以下のテストケースを持つ必要があります：

### 成功ケース
- 正常な作成、取得、更新、削除

### エラーケース
- レコードが存在しない（ErrNotFound）
- 一意制約違反（ErrDuplicate）
- 外部キー制約違反（ErrForeignKey）
- 無効な入力（ErrInvalidInput）

### エッジケース
- 空のリスト
- ページネーションの境界
- トランザクションのロールバック

---

## まとめ

このRepository契約は以下を保証します：

✅ **一貫性**: すべてのRepositoryが同じエラー型を使用
✅ **テスタビリティ**: インターフェースによりモック可能
✅ **トランザクションサポート**: コンテキストベースの設計
✅ **パフォーマンス**: バッチ操作とEager Loadingのサポート
✅ **明確性**: 各メソッドの前提条件と事後条件を明示

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2025-10-18
