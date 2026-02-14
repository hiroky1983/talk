---
name: mobile-e2e-testing
description: Expo + mobile-mcp を使ったモバイル E2E テストの自動実行。iOS シミュレーターの起動、Expo 開発サーバーの起動、アプリの自動操作、スクリーンショット取得、UI テストの実行を含む。
---

# Mobile E2E Testing with Expo and mobile-mcp

このスキルは、Expo を使ったモバイルアプリの E2E テストを mobile-mcp を通じて自動実行するワークフローです。

## Workflow

1. **前提条件の確認**: Xcode と Android SDK がインストールされているか確認
2. **デバイスの起動**: iOS シミュレーターまたは Android エミュレーターを起動
3. **デバイスの検出**: mobile-mcp でデバイスが検出されることを確認
4. **Expo サーバーの起動**: Expo 開発サーバーをバックグラウンドで起動
5. **アプリの起動**: Expo Go を通じてアプリを自動起動
6. **E2E テストの実行**: スクリーンショット、要素操作、フロー検証を実行

## Implementation Rules

### 1. 前提条件の確認

```bash
# Xcode の確認
xcode-select -p && echo "✅ Xcode インストール済み"

# Android SDK の確認
which adb && echo "✅ Android SDK インストール済み" || echo "❌ Android SDK なし"

# 利用可能な iOS シミュレーターの確認
xcrun simctl list devices available | grep -i iphone
```

### 2. iOS シミュレーターの起動

```bash
# シミュレーターの起動（例: iPhone 15 Pro）
xcrun simctl boot "iPhone 15 Pro" && open -a Simulator

# 起動待機
sleep 3
```

### 3. mobile-mcp でデバイスを検出

```javascript
// デバイスリストの取得
mcp__mobile-mcp__mobile_list_available_devices()
// => { devices: [{ id: "...", name: "iPhone 15 Pro", platform: "ios", ... }] }

// デバイス ID を保存
const DEVICE_ID = "E163D6AA-6B21-4784-93A0-267A9C60B92B"
```

### 4. Expo 開発サーバーの起動

```bash
# iOS シミュレーターで直接起動（バックグラウンド）
cd mobile
EXPO_PUBLIC_API_URL=http://$(ipconfig getifaddr en0):8000 npx expo start --ios --port 8001

# 起動ログの確認（15秒後）
tail -50 /path/to/output.log
```

### 5. Expo Go の起動とアプリの読み込み

```javascript
// インストール済みアプリの確認
mcp__mobile-mcp__mobile_list_apps({ device: DEVICE_ID })
// => Expo Go (host.exp.Exponent) が存在することを確認

// Expo Go を起動
mcp__mobile-mcp__mobile_launch_app({
  device: DEVICE_ID,
  packageName: "host.exp.Exponent"
})

// 起動待機
sleep 3

// スクリーンショットで状態確認
mcp__mobile-mcp__mobile_take_screenshot({ device: DEVICE_ID })

// 開発サーバー接続ダイアログの "Continue" ボタンをタップ
mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: DEVICE_ID,
  x: 196,  // 画面中央（393px 幅の場合）
  y: 770   // ボタンの推定位置
})

// アプリ読み込み待機
sleep 5

// 開発メニューを閉じる（✕ボタンをタップ）
mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: DEVICE_ID,
  x: 364,  // 右上
  y: 100
})
```

### 6. E2E テストの実行

```javascript
// 画面のスクリーンショット取得
mcp__mobile-mcp__mobile_take_screenshot({ device: DEVICE_ID })

// 画面サイズの取得
mcp__mobile-mcp__mobile_get_screen_size({ device: DEVICE_ID })
// => Screen size is 393x852 pixels

// 要素のリスト取得（エラーが発生する場合は座標で操作）
mcp__mobile-mcp__mobile_list_elements_on_screen({ device: DEVICE_ID })

// タップ操作
mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: DEVICE_ID,
  x: 196,
  y: 400
})

// テキスト入力（フォーカスされている要素に入力）
mcp__mobile-mcp__mobile_type_keys({
  device: DEVICE_ID,
  text: "test@example.com",
  submit: false
})

// スワイプ操作
mcp__mobile-mcp__mobile_swipe_on_screen({
  device: DEVICE_ID,
  direction: "up",
  distance: 400
})

// ボタン操作（ホームボタン、戻るボタンなど）
mcp__mobile-mcp__mobile_press_button({
  device: DEVICE_ID,
  button: "HOME"
})
```

## Best Practices

1. **スクリーンショットを頻繁に取得**: 各操作の前後でスクリーンショットを取得して状態を確認
2. **適切な待機時間**: アニメーションや画面遷移には十分な待機時間（3-5秒）を設ける
3. **座標の推測**: `mobile_list_elements_on_screen` がエラーになる場合は、スクリーンショットと画面サイズから座標を推測
4. **バックグラウンド実行**: Expo サーバーは必ずバックグラウンドで実行し、ログを定期的に確認
5. **エラーハンドリング**: 各操作でエラーが発生した場合は、スクリーンショットを取得してデバッグ

## Troubleshooting

### デバイスが検出されない
- シミュレーターが起動しているか確認: `xcrun simctl list devices | grep Booted`
- mobile-mcp の再接続: `/mcp` コマンドで再接続

### Expo Go が起動しない
- Expo サーバーのログを確認: `tail -50 /path/to/output.log`
- シミュレーターを再起動: `xcrun simctl shutdown all && xcrun simctl boot "iPhone 15 Pro"`

### 要素のリストが取得できない
- スクリーンショットと画面サイズから座標を推測してタップ
- 画面サイズ: `mcp__mobile-mcp__mobile_get_screen_size`

## Reference Files

詳細なセットアップ手順とトラブルシューティングは、以下を参照してください:
- `references/setup-guide.md`: 初期セットアップの詳細手順
- `references/mcp-commands.md`: mobile-mcp の全コマンドリファレンス
