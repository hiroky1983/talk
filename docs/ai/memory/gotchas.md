# AI Memory Bank: Gotchas

## モバイル接続 (Expo / Android / iOS)

- **IP アドレスの不一致**: Mac の IP が変わると `EXPO_PUBLIC_API_URL` が無効になる。`ipconfig getifaddr en0` で動的に取得するスクリプトが `package.json` に設定されているので、必ず `pnpm start` 経由で起動すること。
- **ポート競合**: `8000` 番ポートが Mac 本体（OrbStack 等）で使用されている場合、コンテナが立ち上がっても外部から見えない。`docker compose ps` でポートマッピングを確認すること。

## 開発環境

- **Protobuf 再生成**: `user.proto` を変更した際は、必ず `proto` ディレクトリで `make generate` を実行し、Go と Python 両方のコードを更新すること。

## オーディオ品質とストリーミング

- **expo-audio と expo-av の共存**: 現在、再生には `expo-audio` (New Architecture)、グローバルなオーディオセッション管理（Mode 設定）には `expo-av` を使用している。`expo-audio` 側でモード設定を行うと型エラーや不安定な挙動が見られたため、`Audio.setAudioModeAsync` を優先している。
- **再生ギャップの解消（チャンク結合）**: WebSocket で届く小さな音声断片を個別に再生すると、プレイヤーの生成オーバーヘッドで必ず「ブツブツ」という途切れが発生する。これを防ぐため、再生時にキューにある全チャンクを一つの PCM/WAV データへ結合して再生し、さらに初回再生前に 150ms 程度の「ジッターバッファ」を設けることで滑らかなストリーミング再生を実現している。
- **スピーカー出力**: `playsInSilentModeIOS: true` かつ `shouldRouteThroughEarpiece: false` を明示的に設定することで、マナーモード時でもスピーカーから音が出るようにしている。
