# AI Memory Bank: Gotchas

## モバイル接続 (Expo / Android / iOS)

- **IP アドレスの不一致**: Mac の IP が変わると `EXPO_PUBLIC_API_URL` が無効になる。`ipconfig getifaddr en0` で動的に取得するスクリプトが `package.json` に設定されているので、必ず `pnpm start` 経由で起動すること。
- **ポート競合**: `8000` 番ポートが Mac 本体（OrbStack 等）で使用されている場合、コンテナが立ち上がっても外部から見えない。`docker compose ps` でポートマッピングを確認すること。

## 開発環境

- **Protobuf 再生成**: `user.proto` を変更した際は、必ず `proto` ディレクトリで `make generate` を実行し、Go と Python 両方のコードを更新すること。
