# Mobile E2E Testing - Setup Guide

このガイドでは、mobile-mcp を使った Expo アプリの E2E テスト環境のセットアップ手順を説明します。

## 必要な前提条件

### macOS の場合

1. **Xcode** (iOS シミュレーター用)
   ```bash
   # Xcode がインストールされているか確認
   xcode-select -p
   # => /Applications/Xcode.app/Contents/Developer
   ```

2. **Android SDK** (Android エミュレーター用) - オプション
   ```bash
   # Android SDK がインストールされているか確認
   which adb
   # => /Users/USERNAME/Library/Android/sdk/platform-tools/adb
   ```

3. **Node.js v22 以上**
   ```bash
   node --version
   # => v22.x.x
   ```

## mobile-mcp のセットアップ

mobile-mcp は Claude Code に MCP サーバーとして統合されています。

### 接続の確認

```bash
# Claude Code で以下のコマンドを実行
/mcp
```

成功すると `Reconnected to mobile-mcp` と表示されます。

## iOS シミュレーターのセットアップ

### 利用可能なシミュレーターの確認

```bash
xcrun simctl list devices available | grep -i iphone
```

出力例:
```
iPhone 15 Pro (E163D6AA-6B21-4784-93A0-267A9C60B92B) (Shutdown)
iPhone 15 Pro Max (D3FEE305-A3E8-47F8-9F05-1DB10CB63B22) (Shutdown)
```

### シミュレーターの起動

```bash
# 特定のシミュレーターを起動
xcrun simctl boot "iPhone 15 Pro"

# シミュレーターアプリを開く
open -a Simulator
```

### 起動確認

```bash
xcrun simctl list devices | grep Booted
```

出力例:
```
iPhone 15 Pro (E163D6AA-6B21-4784-93A0-267A9C60B92B) (Booted)
```

## Expo プロジェクトのセットアップ

### 環境変数の設定

`mobile/package.json` の `start` スクリプトで、自動的に IP アドレスが設定されます:

```json
{
  "scripts": {
    "start": "EXPO_PUBLIC_API_URL=http://$(ipconfig getifaddr en0):8000 expo start --port 8001"
  }
}
```

### Expo 開発サーバーの起動

#### 方法1: 通常起動

```bash
cd mobile
pnpm start
```

#### 方法2: iOS シミュレーター直接起動（推奨）

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://$(ipconfig getifaddr en0):8000 npx expo start --ios --port 8001
```

この方法では、Expo Go が自動的にインストールされ、アプリが起動します。

### Expo サーバーの確認

起動ログに以下が表示されれば成功:

```
Starting Metro Bundler
Waiting on http://localhost:8001
› Opening exp://192.168.x.x:8001 on iPhone 15 Pro
- Fetching Expo Go
- Installing Expo Go on iPhone 15 Pro
iOS Bundled 661ms index.js (1241 modules)
```

## mobile-mcp でのデバイス操作

### デバイスの検出

```javascript
// デバイスリストを取得
mcp__mobile-mcp__mobile_list_available_devices()
```

成功すると以下のような JSON が返されます:

```json
{
  "devices": [
    {
      "id": "E163D6AA-6B21-4784-93A0-267A9C60B92B",
      "name": "iPhone 15 Pro",
      "platform": "ios",
      "type": "simulator",
      "version": "17.0",
      "state": "online"
    }
  ]
}
```

### アプリの確認

```javascript
// インストール済みアプリのリスト取得
mcp__mobile-mcp__mobile_list_apps({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B"
})
```

Expo Go がインストールされている場合、以下が含まれます:

```
Expo Go (host.exp.Exponent)
```

## Expo Go の起動とアプリの読み込み

### Expo Go を起動

```javascript
mcp__mobile-mcp__mobile_launch_app({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  packageName: "host.exp.Exponent"
})
```

### 開発サーバーへの接続

Expo Go が起動すると、開発サーバーへの接続ダイアログが表示されます。

1. スクリーンショットを取得して状態を確認
2. "Continue" ボタンをタップ（座標: 画面中央下部）
3. アプリが読み込まれるまで待機（5秒程度）
4. 開発メニューが表示される場合は、✕ボタンで閉じる

## トラブルシューティング

### デバイスが検出されない

**原因**: シミュレーターが起動していない

**解決策**:
```bash
xcrun simctl boot "iPhone 15 Pro"
open -a Simulator
sleep 3
```

### Expo サーバーが起動しない

**原因**: ポートが既に使用されている

**解決策**:
```bash
# 既存のプロセスを確認
lsof -i :8001

# プロセスを終了
kill -9 <PID>
```

### Expo Go が自動インストールされない

**原因**: Expo CLI のバージョンが古い、またはネットワークエラー

**解決策**:
```bash
# Expo CLI を更新
npm install -g expo-cli@latest

# または、手動で Expo Go をインストール
# (App Store から Expo Go をダウンロード)
```

### アプリが起動しない

**原因**: Metro Bundler のキャッシュが破損している

**解決策**:
```bash
cd mobile
npx expo start --clear
```

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照して E2E テストを実行してください:

- `mcp-commands.md`: mobile-mcp の全コマンドリファレンス
- `../SKILL.md`: 基本的なワークフローと実装ルール
