# 5. モバイルでのダークモード完全対応

- [ ] 完了 (Status: Done)
<!-- AIへ: このタスクを実行し完了したら、上記のチェックボックスにチェックを入れてください。 -->

## 概要 (Summary)

モバイルアプリ（React Native/Expo）において、ダークモードに完全対応します。NativeWind (Tailwind CSS for React Native) を導入し、Web 側と共通の CSS 変数（セマンティックカラー）を使用してテーマを管理・同期します。

## 現状分析 (Analysis)

- **現状**: `ThemeContext.tsx` は存在するが、スタイリングは `StyleSheet.create` 内で `isDark` フラグを用いた条件分岐が主。Web 側で進めている CSS 変数ベースのテーマ管理とは乖離している。
- **課題**: ダークモード対応のスタイルを個別のコンポーネントで管理しており、メンテナンス性が低い。また、NativeWind が未導入（または限定的）なため、Tailwind のクラスベースでのテーマ指定ができない。
- **解決策**:
  - NativeWind (v4 互換) を導入し、`globals.css` 相当の変数をモバイルでも利用可能にする。
  - `TalkScreen.tsx` などの主要画面のスタイルを NativeWind の `dark:` プレフィックスやセマンティックカラー（CSS 変数）ベースに書き換える。
  - システムのテーマ設定変更への動的な追従を確実にする。

## ToDo (Action Items)

### Priority: High (高)

- [ ] **[Feature]** NativeWind (Tailwind CSS) のモバイル環境への導入と設定
- [ ] **[Tailwind]** モバイル用 `global.css` (または `theme.css`) の作成と CSS 変数の定義
- [ ] **[Refactor]** `TalkScreen.tsx` のスタイルを NativeWind ベースに移行し、ダークモード対応を完了

### Priority: Medium (中)

- [ ] **[UX]** `ThemeContext` とシステムのテーマ（`useColorScheme`）の整合性確認
- [ ] **[Feature]** `AuthScreen.tsx` やコンポーネント類（`TalkHeader` 等）のダークモード対応

### Priority: Low (低)

- [ ] **[Docs]** モバイルでのテーマ管理ルールを `AGENTS.md` または `README.md` に追記
