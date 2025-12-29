# Tailwind CSS のテーマ化 (Theming)

- [ ] 完了 (Status: Done)
<!-- AIへ: このタスクを実行し完了したら、上記のチェックボックスにチェックを入れてください。 -->

## 概要 (Summary)

`next/src/app/globals.css` で定義されている CSS 変数を Tailwind CSS v4 のテーマシステムに適切に統合します。これにより、`text-primary` や `bg-blob-blue` といった独自のデザイントークンを標準のユーティリティクラスとして利用可能にし、コードの整合性と開発効率を向上させます。

## 現状分析 (Analysis)

- **現状**: `globals.css` の `:root` や `[data-theme='dark']` セクションにカラー変数が定義されているが、Tailwind v4 の `@theme` ブロックへのマッピングが最小限（background, foreground のみ）に留まっている。
- **課題**: `text-primary` や `blob-blue` などの色が Tailwind ユーティリティとして使えず、デザインの統一性を保つのが難しい。また、アニメーションクラスが `globals.css` にハードコードされており、テーマ設定から分離されている。
- **解決策**:
  - `globals.css` の `@theme inline` セクションを拡充し、定義済みの全ての CSS 変数を Tailwind のカラー設定にマッピングする。
  - カスタムアニメーション (`blob`) やディレイクラスを `@theme` 内で定義し直す。

## ToDo (Action Items)

### Priority: High (高)

- [ ] [Tailwind] `next/src/app/globals.css` の `@theme inline` ブロックにカラーマッピングを追加
  - `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
  - `--color-blob-blue`, `--color-blob-purple`, `--color-blob-pink`
  - `--color-border-primary` (現在の `--border-color` から)
- [ ] [Tailwind] `next/src/app/globals.css` の `@theme inline` ブロックにアニメーション設定を追加
  - キーフレーム `blob` の移行
  - `animation: { blob: 'blob 7s infinite' }` のような定義
- [ ] [Tailwind] CSS 変数の命名を Tailwind v4 の命名規則 (`--color-*`) に合わせて整理することを検討

### Priority: Medium (中)

- [ ] [UX] ダークモード切り替え時の色がより自然になるよう、変数の値を調整
- [ ] [Cleanup] コンポーネント内でハードコードされている任意値 (例: `bg-[#...]`) をテーマトークンに書き換え

### Priority: Low (低)

- [ ] [Docs] 利用可能なデザイントークンのリストを `README.md` に明記
