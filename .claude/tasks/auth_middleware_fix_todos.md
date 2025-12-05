# TODOリスト: 認証ミドルウェアの修正

## 概要
- **タスク種別**: Bug修正
- **推定所要時間**: 約60分
- **並列実行**: しない（順次実行）

## タスクリスト

### フロントエンド実装フェーズ
- [ ] next/src/lib/hooks/useConversationMutation.tsにインターセプターを追加 (推定: 15分)
  - Connect RPCトランスポートに`interceptors`配列を追加
  - リクエストメッセージから`userId`を取得
  - `X-User-ID`ヘッダーに`userId`を設定
  - 参考: next/src/lib/hooks/useConversationMutation.ts:17-19

### バックエンド実装フェーズ
- [ ] go/main.goのミドルウェア適用ロジックを修正 (推定: 10分)
  - `middleware.AuthMiddleware()(c)`の呼び出しを削除
  - AuthMiddlewareのロジックを直接インライン化
  - Ginのミドルウェアチェーンに正しく統合
  - 参考: go/main.go:77-85

### テストフェーズ
- [ ] バックエンドの既存自動テストを実行 (推定: 5分)
  - `cd go && go test ./middleware/... -v`でミドルウェアのテストを実行
  - すべてのテストがパスすることを確認

- [ ] バックエンドサーバーを起動 (推定: 5分)
  - `cd go && make run`でサーバーを起動
  - サーバーが正常に起動することを確認

- [ ] curlで手動テストを実施 (推定: 10分)
  - テストケース1: X-User-IDヘッダーありのリクエスト（正常系）
  - テストケース2: X-User-IDヘッダーなしのリクエスト（異常系）
  - テストケース3: ヘルスチェックエンドポイント（認証スキップ）
  - テストケース4: OPTIONSリクエスト（CORS preflight）

- [ ] フロントエンドとの統合テスト (推定: 10分)
  - `cd next && npm run dev`でNext.jsアプリを起動
  - ブラウザで会話機能をテスト
  - DevToolsのネットワークタブで`X-User-ID`ヘッダーが送信されているか確認
  - 401エラーが発生しないことを確認

### ドキュメント・完了フェーズ
- [ ] 修正内容をコミット (推定: 5分)
  - フロントエンド: `fix(next): add X-User-ID header interceptor to RPC transport`
  - バックエンド: `fix(go): correct authentication middleware integration in main.go`

## 依存関係
- バックエンド実装フェーズ → フロントエンド実装フェーズ（独立、並列可能だが順次実行）
- テストフェーズ → フロントエンド実装フェーズ + バックエンド実装フェーズ
- ドキュメント・完了フェーズ → テストフェーズ

## 注意事項
- フロントエンドとバックエンド両方の修正が必要
- フロントエンドだけ、またはバックエンドだけの修正では問題は解決しない
- 統合テストで実際のリクエストフローを確認することが重要
