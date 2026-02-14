# mobile-mcp Commands Reference

mobile-mcp で使用できる全コマンドのリファレンスです。

## デバイス管理

### mobile_list_available_devices

利用可能なデバイス（シミュレーター/エミュレーター/実機）のリストを取得します。

```javascript
mcp__mobile-mcp__mobile_list_available_devices({
  noParams: {}
})
```

**レスポンス**:
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

### mobile_list_apps

デバイスにインストールされているアプリのリストを取得します。

```javascript
mcp__mobile-mcp__mobile_list_apps({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B"
})
```

**レスポンス**:
```
Found these apps on device: Safari (com.apple.mobilesafari), Maps (com.apple.Maps), ...
```

### mobile_get_screen_size

デバイスの画面サイズをピクセル単位で取得します。

```javascript
mcp__mobile-mcp__mobile_get_screen_size({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B"
})
```

**レスポンス**:
```
Screen size is 393x852 pixels
```

## アプリ管理

### mobile_launch_app

デバイス上のアプリを起動します。

```javascript
mcp__mobile-mcp__mobile_launch_app({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  packageName: "host.exp.Exponent"  // Expo Go
})
```

**パラメータ**:
- `device`: デバイス ID
- `packageName`: アプリのバンドル ID またはパッケージ名
  - iOS: `host.exp.Exponent` (Expo Go)
  - Android: `host.exp.exponent` (Expo Go)

### mobile_terminate_app

実行中のアプリを終了します。

```javascript
mcp__mobile-mcp__mobile_terminate_app({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  packageName: "host.exp.Exponent"
})
```

### mobile_install_app

デバイスにアプリをインストールします。

```javascript
mcp__mobile-mcp__mobile_install_app({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  path: "/path/to/app.ipa"  // iOS: .ipa, Android: .apk
})
```

**パラメータ**:
- `path`: アプリファイルへのパス
  - iOS シミュレーター: `.zip` または `.app` ディレクトリ
  - iOS 実機: `.ipa`
  - Android: `.apk`

### mobile_uninstall_app

デバイスからアプリをアンインストールします。

```javascript
mcp__mobile-mcp__mobile_uninstall_app({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  bundle_id: "host.exp.Exponent"
})
```

## 画面操作

### mobile_take_screenshot

デバイスの画面のスクリーンショットを取得します（画像として返却）。

```javascript
mcp__mobile-mcp__mobile_take_screenshot({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B"
})
```

**レスポンス**: 画像データ（Base64 エンコード）

### mobile_save_screenshot

スクリーンショットをファイルに保存します。

```javascript
mcp__mobile-mcp__mobile_save_screenshot({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  saveTo: "/path/to/screenshot.png"
})
```

### mobile_list_elements_on_screen

画面上の要素とその座標、ラベルをリスト化します。

```javascript
mcp__mobile-mcp__mobile_list_elements_on_screen({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B"
})
```

**注意**: エラーが発生する場合は、スクリーンショットから座標を推測してください。

## タッチ操作

### mobile_click_on_screen_at_coordinates

指定した座標をタップします。

```javascript
mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  x: 196,
  y: 400
})
```

**パラメータ**:
- `x`: X 座標（ピクセル、左端が 0）
- `y`: Y 座標（ピクセル、上端が 0）

### mobile_double_tap_on_screen

指定した座標をダブルタップします。

```javascript
mcp__mobile-mcp__mobile_double_tap_on_screen({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  x: 196,
  y: 400
})
```

### mobile_long_press_on_screen_at_coordinates

指定した座標を長押しします。

```javascript
mcp__mobile-mcp__mobile_long_press_on_screen_at_coordinates({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  x: 196,
  y: 400,
  duration: 500  // ミリ秒（デフォルト: 500ms）
})
```

**パラメータ**:
- `duration`: 長押しの時間（ミリ秒、1-10000）

### mobile_swipe_on_screen

画面をスワイプします。

```javascript
mcp__mobile-mcp__mobile_swipe_on_screen({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  direction: "up",  // "up", "down", "left", "right"
  distance: 400,    // オプション: スワイプ距離（ピクセル）
  x: 196,          // オプション: 開始 X 座標
  y: 426           // オプション: 開始 Y 座標
})
```

**パラメータ**:
- `direction`: スワイプ方向（`"up"`, `"down"`, `"left"`, `"right"`）
- `distance`: スワイプ距離（ピクセル）。デフォルトは iOS: 400px, Android: 画面の 30%
- `x`, `y`: スワイプの開始座標（省略すると画面中央から開始）

## 入力操作

### mobile_type_keys

フォーカスされている要素にテキストを入力します。

```javascript
mcp__mobile-mcp__mobile_type_keys({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  text: "test@example.com",
  submit: false  // true: Enter キーを押す
})
```

**パラメータ**:
- `text`: 入力するテキスト
- `submit`: `true` の場合、テキスト入力後に Enter キーを押す

### mobile_press_button

デバイスのハードウェアボタンを押します。

```javascript
mcp__mobile-mcp__mobile_press_button({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  button: "HOME"
})
```

**サポートされているボタン**:
- `HOME`: ホームボタン
- `BACK`: 戻るボタン（Android のみ）
- `VOLUME_UP`: 音量アップ
- `VOLUME_DOWN`: 音量ダウン
- `ENTER`: Enter キー
- `DPAD_CENTER`: D-Pad 中央（Android TV）
- `DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`: D-Pad（Android TV）

## デバイス設定

### mobile_set_orientation

画面の向きを変更します。

```javascript
mcp__mobile-mcp__mobile_set_orientation({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  orientation: "landscape"  // "portrait" または "landscape"
})
```

### mobile_get_orientation

現在の画面の向きを取得します。

```javascript
mcp__mobile-mcp__mobile_get_orientation({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B"
})
```

**レスポンス**: `"portrait"` または `"landscape"`

### mobile_open_url

デバイスのブラウザで URL を開きます。

```javascript
mcp__mobile-mcp__mobile_open_url({
  device: "E163D6AA-6B21-4784-93A0-267A9C60B92B",
  url: "https://example.com"
})
```

## 実践例

### ログインフローのテスト

```javascript
// 1. スクリーンショットで初期状態を確認
await mcp__mobile-mcp__mobile_take_screenshot({ device: DEVICE_ID })

// 2. Username フィールドをタップ（座標は事前に確認）
await mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: DEVICE_ID,
  x: 196,
  y: 350
})

// 3. ユーザー名を入力
await mcp__mobile-mcp__mobile_type_keys({
  device: DEVICE_ID,
  text: "testuser@example.com",
  submit: false
})

// 4. Password フィールドをタップ
await mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: DEVICE_ID,
  x: 196,
  y: 420
})

// 5. パスワードを入力
await mcp__mobile-mcp__mobile_type_keys({
  device: DEVICE_ID,
  text: "password123",
  submit: false
})

// 6. ログインボタンをタップ
await mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: DEVICE_ID,
  x: 196,
  y: 500
})

// 7. 遷移を待機
await sleep(3)

// 8. ログイン後の画面を確認
await mcp__mobile-mcp__mobile_take_screenshot({ device: DEVICE_ID })
```

### スクロールとリストの検証

```javascript
// 1. 初期位置のスクリーンショット
await mcp__mobile-mcp__mobile_take_screenshot({ device: DEVICE_ID })

// 2. 上方向にスワイプ（スクロールダウン）
await mcp__mobile-mcp__mobile_swipe_on_screen({
  device: DEVICE_ID,
  direction: "up",
  distance: 400
})

// 3. スクロール後の画面を確認
await mcp__mobile-mcp__mobile_take_screenshot({ device: DEVICE_ID })

// 4. リスト項目をタップ
await mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  device: DEVICE_ID,
  x: 196,
  y: 300
})
```

## トラブルシューティング

### 座標の取得方法

1. スクリーンショットを取得
2. 画面サイズを確認: `mobile_get_screen_size`
3. スクリーンショットから要素の位置を目視で推定
4. 必要に応じて微調整

### タップが反応しない場合

- 待機時間を増やす: `sleep(5)`
- 座標を微調整する
- ダブルタップを試す: `mobile_double_tap_on_screen`

### アプリがクラッシュする場合

- アプリを再起動: `mobile_launch_app`
- Expo サーバーのログを確認
- シミュレーターを再起動
