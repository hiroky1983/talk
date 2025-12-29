# AI Memory Bank: Decisions (ADR)

## [ADR-001] モバイルアプリの接続ポート変更

- **日付**: 2025-12-30
- **決定**: バックエンドのポート `8000` が OrbStack や他プロセスでブロックされやすいため、ホスト側では `8089` を使用し、Docker コンテナ内の `8000` へ転送する設定とした。
- **理由**: BE のコード（ポート番号）を変更せずに解決するため。
- **影響**: `mobile/package.json` の `EXPO_PUBLIC_API_URL` も `8089` に合わせる必要がある。

## [ADR-002] SafeAreaView の移行

- **日付**: 2025-12-30
- **決定**: `react-native` 標準の `SafeAreaView` を廃止し、`react-native-safe-area-context` に移行。
- **理由**: 標準のものが非推奨となったため。
