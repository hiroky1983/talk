# AI Memory Bank: Index

このリポジトリにおける AI エージェントの長期記憶と経験知を管理する起点です。

## プロジェクトの核心的コンテキスト

- **目的**: Go (Backend), Next.js/React Native (Frontend), Python (AI Service) を組み合わせたリアルタイム言語学習プラットフォーム。
- **主要なスタック**:
  - Go (Gin, Connect RPC)
  - Next.js (App Router, Tailwind v4)
  - React Native (Expo)
  - Python (gRPC, Gemini Live API / Flash API)

## メモリマップ

- [Architecture](architecture.md): プロジェクト全体の設計原則と方針
- [Decisions](decisions.md): 重要なアーキテクチャ決定 (ADR)
- [Gotchas](gotchas.md): 解決済みのバグ、罠、OS 依存の知見

## 現在のステータス

- **長期記憶システム (AI Memory Bank)** が稼働を開始。セッション跨ぎのコンテキスト継承が可能になった。
- **モバイルオーディオ品質** が大幅に改善。`expo-audio` 移行とチャンク結合により、リアルタイム会話が可能。
- **次回の予定**: モバイルの Tailwind (NativeWind) 移行とテーマ同期。
