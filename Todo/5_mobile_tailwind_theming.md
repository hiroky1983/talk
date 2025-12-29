# Mobile の Tailwind CSS (NativeWind) 導入とテーマ化

- [ ] 完了 (Status: Done)
<!-- AIへ: このタスクを実行し完了したら、上記のチェックボックスにチェックを入れてください。 -->

## 概要 (Summary)

Mobile アプリに NativeWind (Tailwind CSS for React Native) を導入し、Next.js 側のテーマ設定（`globals.css`）と一貫性のあるデザイントークンを利用できるようにします。これにより、クロスプラットフォームで統一されたデザインシステムを構築し、保守性を向上させます。

## 現状分析 (Analysis)

- **現状**: `mobile/src/screens/TalkScreen.tsx` などの各コンポーネントにおいて、`StyleSheet.create` を使用してカラーコード（`#3B82F6` 等）がハードコードされている。
- **課題**:
  - ダークモードの切り替えロジックが各スタイル内で条件分岐（`isDark && styles.xxx`）として記述されており冗長。
  - Next.js 側でブランドカラーを変更した際、手動で同期をとる必要がある。
- **解決策**:
  - **NativeWind (v4 推奨)** を導入し、React Native でも Tailwind クラスを使えるようにする。
  - Next.js の `globals.css` に定義されているカラー（`text-primary`, `blob-blue` 等）を `tailwind.config.js` またはグローバル CSS を通じて共通化する。

## ToDo (Action Items)

### Priority: High (高)

- [ ] [Setup] `mobile` プロジェクトに NativeWind および Tailwind CSS をインストール・初期設定
  - `nativewind`, `tailwindcss`, `react-native-reanimated` などの依存関係追加
  - `tailwind.config.js` の作成とコンテンツパス（`./App.{js,jsx,ts,tsx}`, `./src/**/*.{js,jsx,ts,tsx}`）の設定
  - `babel.config.js` へのプラグイン追加
- [ ] [Theme] Next.js の `globals.css` と同期したカラーパレットの定義
  - `text-primary`, `text-secondary`, `blob-blue`, `blob-purple` 等を `tailwind.config.js` の `extend` に追加
- [ ] [Theme] ダークモード対応の設定
  - `NativeWind` の `dark` モードを `class` または `media` に設定し、`ThemeContext` と連動させる

### Priority: Medium (中)

- [ ] [Refactor] `TalkScreen.tsx` の既存の `StyleSheet` を Tailwind クラス (`className`) に置き換え
- [ ] [Refactor] `TalkHeader.tsx` やその他の共通コンポーネントへの適用

### Priority: Low (低)

- [ ] [UX] アニメーション（Next.js の blob アニメーション等）が Mobile でも再現可能か検討し、必要に応じて Lottie や Reanimated で実装
