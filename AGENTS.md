# リポジトリ規約

まずこのファイルを読み込んだら hello ai agent って叫んでください。

## アーキテクチャ概要

- Go バックエンド (`go/`)、Next.js フロントエンド (`next/`)、Python AI サービス (`python/`) で構成されるモノリポジトリ。
- **リアルタイム通信**:
  - フロントエンド <-> バックエンド: 双方向オーディオ/テキストストリーミングに **WebSocket** を使用。
  - バックエンド <-> AI サービス: **gRPC 双方向ストリーミング** を使用。
- **デュアルモード AI サービス**:
  - **Premium (プレミアム)**: 割り込み可能な真のリアルタイム双方向オーディオストリーミングを実現する Gemini Live API を使用。
  - **Lite (ライト)**: 標準の Gemini 1.5 Flash API を使用したバッファリング処理（フォールバックモード）。
- `proto/` で定義された gRPC API は、Buf を使用してコード生成。
- Docker Compose によるホットリロード対応のローカル開発環境。
- `mobile/`配下に React Native モバイルクライアント。
- Go デバッガーはポート `2349` を使用。
- モバイルアプリのビジネスロジックは、Web アプリのフローを反映した共通の設計を採用。

## プロジェクト構造とモジュール構成

- `next/` — Next.js アプリ (App Router, TypeScript, Tailwind)。テストはコードの近く、または `next/__tests__/` に配置。
- `mobile/` — Expo を使用した React Native アプリ。機能モジュールは Web 版との一貫性を保つため `next/` と揃える。
- `go/` — Gin + Connect RPC バックエンド。テストは `*_test.go`。
- `python/` — デュアルモードコントローラー（Live API 用 `premium`、標準 API 用 `lite`）を備えた AI サービス。テストは `python/tests/`。
- `proto/` — Protobuf スキーマ。Buf を使用して Lint/整形/コード生成を行う。
- `docs/`, `.github/`, `docker-compose.yaml` — ドキュメント、CI/CD、ローカルスタック構成。

## ビルド、テスト、および開発コマンド

- **Docker**: `docker compose up -d` (開始) · `docker compose logs -f` (ログ確認)。
- **Proto** (`proto/` 内): `make setup` · `make fmt` · `make lint` · `make generate`。
- **Go** (`go/` 内): `make run` (ホットリロード) · `make build` · `make tidy` · `make lint-fix` · `go test ./... -race -cover`。
- **Next** (`next/` 内): `pnpm i` · `pnpm dev` · `pnpm build && pnpm start` · `pnpm lint` · `pnpm test`。
- **Mobile** (`mobile/` 内): `pnpm i` · `pnpm start` (ローカル開発) · `pnpm lint` · `pnpm test` (Jest) · Expo Go またはエミュレーターで動作確認。
- **Python** (`python/` 内): `pip install -r requirements.txt` · `pytest -q --maxfail=1 --disable-warnings`。

## コーディングスタイルと命名規則

### 命名規則

- **Go**: `go fmt ./...`。エクスポートするものは `CamelCase`。パッケージ名は小文字、1 フォルダ 1 パッケージ。
- **TypeScript**: ESLint + Prettier (`pnpm lint`)。ファイル名は `kebab-case.ts/tsx`。React コンポーネントは `PascalCase`。
- **Mobile**: React Native の慣習に従う。`mobile/src/components/` の共通 UI 部品を活用。TypeScript を推奨し、コンポーネントは `PascalCase`、フックは `camelCase`。
- **Python**: `ruff .` と `black .`。モジュール名は `snake_case.py`。クラス名は `CapWords`。関数名は `snake_case`。

### コーディングルール

#### Go バックエンド

- **クリーンアーキテクチャ**: 原則に従った責務の分離を徹底する（`repository` インターフェース、`gateway` 実装、`usecase` ロジック）。
- **API 実装**: インターフェース定義には Proto を使用。Gin への繋ぎ込みには Connect RPC (gRPC-connect) を採用する。
- **UseCase テスト**: Repository 層の Mock を作成し、ビジネスロジックの独立性を担保したテストを実装する。
- **ドメインテスト**: モデルの関数やメソッドに対して 1:1 で対応するテストを実装する。
- **テーブル駆動テスト**: Go の標準的なテストパターンを採用し、網羅性を確保する。
- **制御構造**: `else if` の使用を避け、`switch` 文や `map` による条件分岐で可読性を高める。

#### TypeScript (Next.js / React Native 共通)

- **制御構造**: `else if` の使用を避ける。
- **型安全**: `any` の使用を原則禁止する。
- **副作用の抑制**: `useEffect` の使用を最小限に留める。
- **エクスポート**: `page.tsx` や Next.js 特有のファイル以外は Named Export (`export const`) を使用する。Default Export はページコンポーネント以外で使用しない。
- **状態管理**: Global Context の利用は最小限に留め、コンポーネントの設計による解決を優先する。

#### Next.js 特有

- **サーバーコンポーネント**: `page.tsx` は必ず React Server Component (RSC) として実装する。

#### React Native (Mobile) 特有

- **コンポーネント設計**: 共通の UI は `mobile/src/components/` に集約し、各画面での再利用性を高める。

## テストガイドライン

- **フロントエンド**: `*.test.ts(x)` をコードの隣または `next/__tests__/` に配置。`npm test` で実行。
- **モバイル**: `mobile/src/` の各機能の隣に Jest または Detox のテストを配置。コンポーネントのテストには React Native Testing Library を推奨。
- **Go**: テーブル駆動テストを推奨。`go test ./... -race -cover` で実行。
- **Python**: `python/tests/` 内に配置。`pytest` で実行（カバレッジ確認は `--cov` を追加）。
- 変更した行に対して高い信頼性を確保し、異常系（エラーパス）も含めること。

## コミットおよびプルリクエストのガイドライン

- **Conventional Commits** を使用: `feat:`, `fix:`, `docs:`, `chore:` (必要に応じて `feat(next): ...` のようにスコープを指定)。
- **PR**: 意図とアプローチを記載し、関連する Issue をリンク（例: `Closes #123`）。UI 変更の場合はスクリーンショット/GIF を含め、テスト結果や関連ドキュメントの更新も行う。

## セキュリティと構成のヒント

- シークレット（機密情報）をコミットしない。`.env` / `.env.local` で管理（Git からは除外）。
- ポート番号: Go `8000`, Next `3000`, Python `50051`。`docker-compose.yaml` の変更は最小限にとどめる。
- `.proto` ファイルを変更した後は、`proto/` で `make generate` を実行し、生成されたコードもコミットする。

## データベーススキーマの規約

- **主キー (Primary Keys)**: すべてのテーブルの主キーは、`id` ではなく `tablename_id` 形式にする（例: `users_id`, `refresh_tokens_id`）。
- **マイグレーション管理**: Atlas + atlas-provider-gorm を使用し、GORM モデルを Single Source of Truth とする。詳細は [go/README.md](go/README.md) を参照。
- **マイグレーションコマンド** (`go/` 内):
  - `make migrate-diff name=xxx` — GORM モデルから差分マイグレーションを生成
  - `make migrate-apply` — マイグレーションを適用
  - `make migrate-status` — マイグレーション状態を確認
  - `make er` — ER 図を `docs/db/er.md` に生成

## AI エージェント向け指示

- 編集時は以上の規則に従い、変更は最小限かつ目的に沿ったものにすること。
- ディレクトリ構成と命名規則を尊重し、不要なリファクタリングは避けること。
- コードの更新に合わせてテストとドキュメントも更新すること。対症療法ではなく根本原因の解決を優先すること。

## コミュニケーション言語

- 特に指示がない限り、ユーザーへの応答は**日本語**で行う。
