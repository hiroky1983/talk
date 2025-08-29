# 外国語会話練習アプリ（アプリ名未定）

## 概要

このアプリは AI キャラクターと会話して言語学習ができるアプリケーションです
OS のマイクから会話したら AI が異なる声・性格で返答してくれます

## 機能

### 基本機能
- AI との音声会話
- キャラクター選択機能（3種類のキャラクター）
- リアルタイム音声認識・合成
- 会話履歴表示

### キャラクター機能
- **Friend（男性20代）**: カジュアルで親しみやすい友達キャラ
- **Parent（女性40代）**: 温かく経験豊富な母親キャラ  
- **Sister（女性24歳）**: 親しげで少しいたずらっぽい妹キャラ

## 利用可能言語

- ベトナム語（vi）
- 日本語（ja）

## アプリ構成

/
認証画面
認証を行います
一旦プロバイダとか用意するまではダミーで画面遷移できるように画面だけの用意

/talk
会話画面
OS のマイクに繋いで AI と会話を行います
アプリのイメージとしては ChatGPT の会話機能と同じイメージです

## 技術構成

### 各レイヤの使用技術

#### フロントエンド
- **Next.js 15.2.4** (App Router)
- **TypeScript**
- **Connect-Web**: gRPC-Web クライアント
- **Web Speech API**: 音声認識・合成

#### バックエンド
- **Go 1.24.1**
- **Connect-Go**: gRPC互換サーバー
- **Gin**: HTTPフレームワーク

#### AI サービス
- **Python 3.11**
- **Google Gemini API**: AI会話生成
- **Google Cloud Text-to-Speech**: 音声合成
- **gRPC**: サービス間通信

#### インフラ・ツール
- **Docker & Docker Compose**: コンテナ化
- **Protocol Buffers**: API定義
- **Buf**: Protobuf管理・コード生成

### アプリケーション設計概要

- AI との会話は gRPC を使って行います（ストリーミング対応）
- UI(Next.js)から Connect-Web 経由で Go のバックエンドに接続
- Go の API を経由して Python で実装した AI サービスとの通信
- Python からの Go でレスポンスを受け取ります
- AI からの返答を音声で返却します
- UI から会話する言語とキャラクターを設定できます
- 一旦初回の実装は DB のセットアップは行わない予定

### 音声処理

#### 音声認識（入力）
- フロントエンド: Web Speech Recognition API（ブラウザ内蔵）
- バックエンド: Google Speech-to-Text API（オプション）

#### 音声合成（出力）
- **Google Cloud Text-to-Speech API**: メイン音声合成エンジン
  - キャラクターごとに **Neural2** ボイスを使用
  - 高品質な音声生成
- **gTTS**: フォールバック用（認証失敗時、`vi`や`ja`など基本言語コードのみ対応）

## 開発・デプロイ

### 必要な環境変数

#### Google Cloud認証
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### AI サービス
```bash
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

### 開発コマンド

#### Proto ファイル生成
```bash
cd proto
make generate
```

#### フロントエンド開発
```bash
cd next
npm run dev
```

#### バックエンド開発
```bash
cd go
make run  # Docker with hot reload
```

#### 全体起動
```bash
docker compose up --build -d
```

### API仕様

#### キャラクター選択パラメータ
- `character`: キャラクターID (`friend`, `parent`, `sister`)
- 各キャラクターは異なる音声・性格・プロンプトを持つ

#### 対応言語
- `vi`: ベトナム語
- `ja`: 日本語

#### 音声設定詳細
| キャラクター | 性別・年齢 | ベトナム語音声 | 日本語音声 |
|------------|-----------|---------------|-----------|
| Friend     | 男性20代   | vi-VN-Neural2-A | ja-JP-Neural2-C |
| Parent     | 女性40代   | vi-VN-Neural2-A | ja-JP-Neural2-A |
| Sister     | 女性24歳   | vi-VN-Neural2-A | ja-JP-Neural2-A |
