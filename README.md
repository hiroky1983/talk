# 外国語会話練習アプリ（仮称）

AI キャラクターとの音声会話を通じて外国語を学習できるアプリケーションです。Next.js ベースのフロントエンドから Go 製バックエンド、Python 製 AI サービスまでをモノレポで管理しており、gRPC ストリーミングを介してリアルタイムな会話体験を提供します。

## 主な機能

- OS のマイクを用いた AI とのリアルタイム音声会話
- 会話相手となる 3 種類のキャラクター選択機能
- Web Speech API を利用した音声認識と、AI 応答の音声合成
- 会話履歴の表示

### キャラクター一覧

| キャラクター | 性別・年代       | 特徴                               | ベトナム語音声   | 日本語音声       |
| ------------ | ---------------- | ---------------------------------- | ---------------- | ---------------- |
| Friend       | 男性 / 20 代     | カジュアルで親しみやすい友達キャラ | vi-VN-Standard-B | ja-JP-Standard-C |
| Parent       | 女性 / 40 代     | 温かく経験豊富な母親キャラ         | vi-VN-Standard-A | ja-JP-Standard-A |
| Sister       | 女性 / 20 代前半 | 親しげで少しいたずらっぽい妹キャラ | vi-VN-Standard-A | ja-JP-Standard-A |

### 対応言語

- ベトナム語（`vi`）
- 日本語（`ja`）

## 画面構成

- `/` 認証画面（暫定的に遷移のみ実装予定）
- `/talk` 会話画面（ChatGPT の音声会話体験に近い UI を想定）

## アーキテクチャ概要

```
Next.js (Connect-Web, Web Speech API / AudioRecorder)
          │
          ▼
       Go API (Gin, Connect-Go)
          │
          ▼
    Python AI サービス (gRPC)
          │
          ├── Premium Mode: Gemini Live API (WebSocket)
          └── Light Mode: Gemini Flash (REST) + gTTS
```

- フロントエンドは Connect-Web を経由して Go のバックエンドへストリーミング接続
- Go の API が Python で実装した AI 会話サービスと通信し、音声応答を生成
- **Premium Mode**: Gemini Live API を使用し、低遅延で自然な双方向音声会話を実現
- **Light Mode**: Gemini Flash と gTTS を組み合わせた軽量モード（フォールバック用）

### 状態管理

- **TanStack Query**: サーバー状態の管理、キャッシング、エラーハンドリングを担当
  - AI 会話の API 通信を mutation で管理
  - 自動的なエラーハンドリングとリトライ機能
  - ローディング状態の一元管理

## 技術スタック

### フロントエンド

- Next.js 15.2.4（App Router）
- TypeScript
- TanStack Query（サーバー状態管理）
- Connect-Web（gRPC-Web クライアント）
- Web Speech API / AudioWorklet（音声処理）

### バックエンド

- Go 1.24.1
- Connect-Go（gRPC 互換サーバー）
- Gin（HTTP フレームワーク）

### AI サービス

- Python 3.11
- **Google Gemini Live API**（リアルタイム音声対話）
- Google Gemini Flash（テキスト生成）
- gTTS（音声合成・Light Mode 用）
- gRPC（サービス間通信）

### インフラ / ツール

- Docker & Docker Compose
- Protocol Buffers
- Buf（v2 系）

## ディレクトリ構成

```
.
├── go/             # Go バックエンド
│   └── gen/        # proto から自動生成された Go コード
├── next/           # Next.js フロントエンド
│   └── src/
│       └── gen/    # proto から自動生成された TypeScript コード
├── python/         # AI サービス
└── proto/          # Protocol Buffers 定義と Buf 設定
    ├── app/        # アプリケーション用 proto 定義
    ├── buf.gen.yaml
    ├── buf.yaml
    └── Makefile
```

## 開発環境

### 必要な環境変数

```bash
# Google Cloud 認証
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Gemini API
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

### 主要コマンド

```bash
# Proto のコード生成
cd proto
make generate

# フロントエンド開発
cd next
pnpm dev

# Go バックエンド開発
cd go
make run

# すべてのサービスを起動
docker compose up --build -d
```

## 補足

- 初期実装ではデータベースを使用せず、会話体験の構築を優先します。
- 各キャラクターは異なるプロンプトと音声設定を持ち、状況に応じて音声 API を切り替える設計です。
- 詳細なアプリ仕様は `docs/application/app.md` を参照してください。
