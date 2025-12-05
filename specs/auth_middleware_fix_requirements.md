# 要件定義: 認証ミドルウェアの修正

## 1. 概要

**バグ内容**:
- すべての認証が必要なエンドポイントで`{"error": "Unauthorized: user_id is required"}`エラーが発生
- `X-User-ID`ヘッダーを送信してもミドルウェアが正しく動作しない

**タスク種別**: Bug修正

**優先度**: 高（すべての認証エンドポイントが機能していない）

---

## 2. 原因分析

**根本原因1 (バックエンド)**:
go/main.go:77-85のミドルウェア適用ロジックに問題があります。

```go
// 現在の問題のある実装
router.Use(func(c *gin.Context) {
    if c.Request.URL.Path == "/" || c.Request.URL.Path == "/health" || c.Request.Method == "OPTIONS" {
        c.Next()
        return
    }
    middleware.AuthMiddleware()(c)  // ← ここが問題
})
```

**バックエンドの問題点**:
1. `middleware.AuthMiddleware()(c)`の呼び出し方が不適切
2. `AuthMiddleware()`は`gin.HandlerFunc`を返すが、これを直接`c`に対して実行しても、Ginのミドルウェアチェーンに正しく統合されない
3. ミドルウェア内で`c.Next()`が呼ばれても、外側の無名関数には戻らない

**根本原因2 (フロントエンド)**:
next/src/lib/hooks/useConversationMutation.ts:17-19で、Connect RPCトランスポートに`X-User-ID`ヘッダーを設定していない。

```typescript
// 現在の実装 - X-User-IDヘッダーが送信されていない
const transport = createConnectTransport({
  baseUrl: "http://localhost:8000",
});
```

**フロントエンドの問題点**:
1. protoのリクエストボディには`user_id`が含まれているが、HTTPヘッダーには含まれていない
2. バックエンドのミドルウェアは`X-User-ID`ヘッダーを期待しているが、フロントエンドは送信していない
3. データの受け渡し方法が不一致（ボディ vs ヘッダー）

**正しいアプローチ**:
- バックエンド: ミドルウェア関数内で条件分岐を行い、認証が必要な場合のみAuthMiddlewareのロジックを実行
- フロントエンド: Connect RPCインターセプターを使って`X-User-ID`ヘッダーを追加

---

## 3. 修正方針

**アプローチ1（推奨）**: ミドルウェアロジックのインライン化
- カスタムミドルウェア関数内でAuthMiddlewareのロジックを直接実装
- 条件分岐でスキップするパスを判定
- Ginのミドルウェアチェーンに正しく統合

**アプローチ2**: ルートグループによる分離
- 認証不要なルート（`/`, `/health`）を先に登録
- 残りのルートを認証ミドルウェア付きのグループにまとめる
- ただし、OPTIONSリクエストの扱いが複雑になる

**選択**: アプローチ1を採用
- 既存のコード構造を最小限の変更で修正可能
- OPTIONSリクエストのハンドリングが明確
- テストケースの変更が不要

---

## 4. 実装方針

### 4.1 フロントエンド: useConversationMutation.tsの修正

**修正箇所**: next/src/lib/hooks/useConversationMutation.ts:17-19

**修正内容**:
```typescript
export const useConversationMutation = () => {
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8000",
    interceptors: [
      (next) => async (req) => {
        // Extract user_id from the request message
        const message = req.message as { userId?: string };
        if (message.userId) {
          req.header.set("X-User-ID", message.userId);
        }
        return await next(req);
      },
    ],
  });
  const client = createClient(AIConversationService, transport);
  // ... rest of the code
}
```

**変更点**:
1. `interceptors`配列を追加
2. リクエストメッセージから`userId`を取得
3. `X-User-ID`ヘッダーに`userId`を設定
4. Connect RPCインターセプターを使用してすべてのリクエストにヘッダーを自動追加

### 4.2 バックエンド: go/main.goの修正

**修正箇所**: go/main.go:77-85

**修正内容**:
```go
// Apply authentication middleware to all routes except health checks and preflight requests
router.Use(func(c *gin.Context) {
    // Skip authentication for health check endpoints and CORS preflight requests
    if c.Request.URL.Path == "/" || c.Request.URL.Path == "/health" || c.Request.Method == "OPTIONS" {
        c.Next()
        return
    }

    // Extract user_id from X-User-ID header
    userID := c.GetHeader(middleware.UserIDHeader)

    // Validate that user_id is present
    if userID == "" {
        c.JSON(http.StatusUnauthorized, gin.H{
            "error": "Unauthorized: user_id is required",
        })
        c.Abort()
        return
    }

    // Store user_id in context for downstream handlers
    c.Set(middleware.UserIDKey, userID)

    // Continue to next handler
    c.Next()
})
```

**変更点**:
1. `middleware.AuthMiddleware()(c)`の呼び出しを削除
2. AuthMiddlewareのロジック（go/middleware/auth.go:19-35）を直接インライン化
3. ミドルウェアチェーンに正しく統合される形に修正

### 4.3 middleware/auth.goの保持

**方針**: 既存のAuthMiddleware関数とテストは保持
- 将来的に他の場所で使用される可能性がある
- テストケースがドキュメントとしての価値を持つ
- コードの整合性を保つ

---

## 5. 影響範囲

**影響を受けるファイル**:
- next/src/lib/hooks/useConversationMutation.ts (修正対象)
- go/main.go (修正対象)

**影響を受けないファイル**:
- go/middleware/auth.go (変更なし)
- go/middleware/auth_test.go (変更なし)
- proto定義ファイル (変更なし)
- 他のハンドラーやサービス (変更なし)

**影響を受けるエンドポイント**:
- すべての認証が必要なエンドポイント（修正により正常動作するようになる）
- `/`, `/health`, OPTIONSリクエスト（影響なし、引き続きスキップ）

**影響を受ける機能**:
- フロントエンドからのAI会話リクエスト（正常に動作するようになる）

---

## 6. テスト計画

### 6.1 手動テスト

**テストケース1**: X-User-IDヘッダーありのリクエスト
```bash
curl -X POST http://localhost:8000/app.v1.AIConversationService/SendMessage \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-123" \
  -d '{"message": "Hello"}'
```
**期待結果**: 正常にレスポンスが返る（Unauthorizedエラーが発生しない）

**テストケース2**: X-User-IDヘッダーなしのリクエスト
```bash
curl -X POST http://localhost:8000/app.v1.AIConversationService/SendMessage \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```
**期待結果**: `{"error": "Unauthorized: user_id is required"}`が返る

**テストケース3**: ヘルスチェックエンドポイント
```bash
curl http://localhost:8000/health
```
**期待結果**: 認証なしで正常にレスポンスが返る

**テストケース4**: OPTIONSリクエスト（CORS preflight）
```bash
curl -X OPTIONS http://localhost:8000/app.v1.AIConversationService/SendMessage \
  -H "Access-Control-Request-Method: POST"
```
**期待結果**: 認証なしで正常にレスポンスが返る

### 6.2 自動テスト

**既存テストの実行**:
```bash
cd go
go test ./middleware/... -v
```
**期待結果**: すべてのテストがパス

### 6.3 統合テスト

**フロントエンドからの実際のリクエスト**:
- Next.jsアプリからのAI会話リクエストが正常に動作することを確認
- ブラウザのDevToolsでネットワークタブを確認し、401エラーが発生しないことを確認

---

## 7. 参考資料

- Ginミドルウェアの公式ドキュメント: https://gin-gonic.com/docs/examples/using-middleware/
- Connect RPCインターセプター: https://connectrpc.com/docs/web/interceptors
- 既存のAuthMiddleware実装: go/middleware/auth.go:17-37
- 既存のAuthMiddlewareテスト: go/middleware/auth_test.go

---

## 8. ロールバック計画

**万が一問題が発生した場合**:
```bash
git revert <commit-hash>
```

**代替案**: アプローチ2（ルートグループ方式）への切り替え
