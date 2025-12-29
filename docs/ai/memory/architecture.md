# AI Memory Bank: Architecture

## 1. リアルタイム通信の基本構造

- Frontend <-> Go Backend: **WebSocket** (Audio/Text Bidirectional).
- Go Backend <-> Python AI Service: **gRPC Bidirectional Streaming**.

## 2. 状態管理とフロー

- メインの遷移は `TalkScreen.tsx` (Mobile) / `page.tsx` (Web) で管理。
- 音声録音と再生のライフサイクルは `useWebSocketChat` フックにカプセル化。

## 3. デザイン原則

- **Tailwind-first**: Web (Tailwind v4), Mobile (NativeWind) を用いた統一テーマ管理。

## 4. モバイルオーディオストリーミング手法

- **Player (expo-audio)**: チャンク結合再生 + ジッターバッファ (150ms)。
- **Recorder (expo-av)**: 高品質 PCM 設定 + 停止ノイズ低減（非同期停止 & 非同期データ処理）。
- **Session**: `Audio.setAudioModeAsync` (expo-av) による一元管理。
