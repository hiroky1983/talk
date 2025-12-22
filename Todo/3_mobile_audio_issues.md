# 3. モバイル側の音声が小さい

## 概要

特にプレミアムプラン（AI とのリアルタイム会話）における「音声の途切れ」と「音量の小ささ」という品質問題を解決し、Reliable（信頼できる）体験を提供する。

## 現状分析 (Analysis)

- **現状**: プレミアムプランでプツプツ途切れる、音量が小さい。実用に耐えないレベル。
- **原因仮説**: `Expo AV` ライブラリと Gemini Live API のストリーミング処理の相性が悪い、またはバッファリング制御の問題。
- **解決策**: 設計変更を含めた根本解決。`expo-audio` (New Architecture) への移行や、必要であればネイティブモジュールの実装を検討する。

## ToDo (Action Items)

### Priority: High (高)

- [ ] **[Audio]** 音声途切れの原因詳細調査（Expo AV のバッファリング設定、ネットワークレイテンシ）
- [ ] **[Audio]** スピーカー出力の音量問題修正（Audio Session 設定、Audio Mode の確認）

### Priority: Medium (中)

- [ ] **[Architecture]** `expo-audio` ライブラリへの移行検証
- [ ] **[Audio]** 受信音声データの正規化（Normalization）処理の追加検討

### Priority: Low (低)

- [ ] **[Performance]** 音声処理パイプラインのさらなる最適化（WebAssembly 等）
