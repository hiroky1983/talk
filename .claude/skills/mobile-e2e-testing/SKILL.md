---
name: mobile-e2e-testing
description: Expo + mobile-mcp を使ったモバイル E2E テストの自動実行。iOS シミュレーターの起動、Expo 開発サーバーの起動、アプリの自動操作、スクリーンショット取得、UI テストの実行を含む。
---

# Mobile E2E Testing (Claude Code Reference)

このスキルは、プロジェクトルートにあるメインのスキルディレクトリを参照するためのものです。Claude Code がこのプロジェクトでモバイル E2E テストを行う際に、一貫したルールを適用するために使用されます。

## 参照先

詳細は以下のディレクトリにあるファイルを確認してください。

- **メインディレクトリ**: `/Users/yamadahiroki/myspace/talk/skills/mobile-e2e-testing`
- **主要なファイル**: `/Users/yamadahiroki/myspace/talk/skills/mobile-e2e-testing/SKILL.md`

## 指示 (For Claude Code)

Claude Code がこのスキルを介してモバイル E2E テストを実行する際は、必ず上記のメインディレクトリ内にある `references/` の内容を読み込み、そこに記載されている以下の内容を遵守してください:

- **セットアップ手順**: `references/setup-guide.md` の前提条件とデバイスの起動方法
- **コマンドリファレンス**: `references/mcp-commands.md` の mobile-mcp コマンド一覧
- **ワークフロー**: メインの `SKILL.md` に記載されている 6 つのステップ

### 主要なワークフロー

1. 前提条件の確認（Xcode, Android SDK）
2. デバイスの起動（iOS シミュレーター/Android エミュレーター）
3. mobile-mcp でデバイスを検出
4. Expo 開発サーバーをバックグラウンドで起動
5. Expo Go を通じてアプリを自動起動
6. スクリーンショット取得、要素操作、フロー検証を実行
