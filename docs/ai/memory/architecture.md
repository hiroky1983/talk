# AI Memory Bank: Architecture

## 1. リアルタイム通信の基本構造

- Frontend <-> Go Backend: **WebSocket** (Audio/Text Bidirectional).
- Go Backend <-> Python AI Service: **gRPC Bidirectional Streaming**.

## 2. 状態管理とフロー

- メインの遷移は `TalkScreen.tsx` (Mobile) / `page.tsx` (Web) で管理。
- 音声録音と再生のライフサイクルは `useWebSocketChat` フックにカプセル化。

## 3. デザイン原則

- **Tailwind-first**: Web (Tailwind v4), Mobile (NativeWind) を用いた統一テーマ管理。
- **Clean Architecture**: Go Backend は責務を明確に分離する。
