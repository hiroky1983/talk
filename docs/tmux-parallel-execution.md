# AI実行用tmux並列実行ガイド

## 概要

このドキュメントは、Claude CodeなどのAIエージェントがtmux（ターミナルマルチプレクサ）を使って複数のタスクを並列実行するための運用ガイドです。

### tmux + Claude Codeによる並列実行とは

複数のClaude Codeインスタンスを異なるtmuxペインで起動し、独立したタスクを同時に処理する開発手法です。

**構成図**:
```
┌─────────────────────────────────┐
│      Manager (マネージャーAI)      │
│   タスク管理・指示送信・進捗監視    │
├───────────┬──────────┬──────────┤
│  Dev-A    │  Dev-B   │  Dev-C   │
│ (開発者AI1) │(開発者AI2)│(開発者AI3)│
│ タスク1実行 │タスク2実行 │タスク3実行│
└───────────┴──────────┴──────────┘
```

### 適用場面

以下の条件を満たすタスクで有効：
- ✅ TODOが10個以上存在
- ✅ 推定所要時間が合計2時間以上
- ✅ 依存関係のないタスクが3つ以上存在
- ✅ 各タスクが独立して完結可能

**例**:
- 複数の機能を並行開発（フロントエンド/バックエンド/モバイル）
- 複数のバグを同時修正
- 複数のテストスイート作成
- 複数のドキュメント作成

### メリット

| メリット | 説明 |
|---------|------|
| 🚀 作業時間の短縮 | 3つのタスクを1/3の時間で完了 |
| 🤖 自動化による効率化 | 人間の介入を最小限に |
| 🧑‍💻 並行作業可能 | AI実行中に他の作業が可能 |
| 📊 並列実行の可視化 | 全体の進捗を一目で把握 |

### デメリットと注意点

| デメリット | 対策 |
|-----------|------|
| ⚠️ インスタンス間の連携難 | タスク分割時に依存関係を最小化 |
| ⚠️ 品質管理の複雑さ | 各タスク完了後にレビュー工程を挟む |
| ⚠️ エラーハンドリング | マネージャーAIが定期的に各ペインの状態を確認 |
| ⚠️ リソース消費 | 同時実行数を3〜4に制限 |

---

## 環境構築

### 必要なツール

1. **tmux**: ターミナルマルチプレクサ
   ```bash
   # macOSの場合
   brew install tmux

   # Ubuntuの場合
   sudo apt install tmux
   ```

2. **Claude Code CLI**: Anthropic公式CLI
   ```bash
   # インストール方法はClaude Code公式ドキュメント参照
   # https://github.com/anthropics/claude-code
   ```

### tmux基本設定

推奨される`.tmux.conf`設定:

```bash
# マウス操作を有効化
set -g mouse on

# ペイン番号を表示時間を延長
set -g display-panes-time 3000

# ペイン移動をVimライクに
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# ペインのリサイズをVimライクに
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# ペイン分割を直感的に
bind | split-window -h
bind - split-window -v
```

設定を反映:
```bash
tmux source-file ~/.tmux.conf
```

### ペイン構成の設計パターン

#### パターン1: 1マネージャー + 3開発者（推奨）

```
┌─────────────────────────────────┐
│         Manager (上部)           │  ← 高さ30%
├───────────┬──────────┬──────────┤
│  Dev-A    │  Dev-B   │  Dev-C   │  ← 高さ70%
│  (左)     │  (中央)  │  (右)    │
└───────────┴──────────┴──────────┘
```

#### パターン2: 1マネージャー + 2開発者（小規模）

```
┌─────────────────────────────────┐
│         Manager (上部)           │  ← 高さ30%
├──────────────────┬──────────────┤
│     Dev-A (左)    │   Dev-B (右)  │  ← 高さ70%
└──────────────────┴──────────────┘
```

#### パターン3: 1マネージャー + 4開発者（大規模）

```
┌─────────────────────────────────┐
│         Manager (上部)           │  ← 高さ25%
├─────────┬─────────┬─────────────┤
│ Dev-A   │ Dev-B   │              │  ← 高さ37.5%
├─────────┼─────────┤   Dev-D      │
│ Dev-C   │ (予備)  │   (右全体)   │  ← 高さ37.5%
└─────────┴─────────┴─────────────┘
```

---

## 実行手順

### Step 1: tmuxセッションの起動

新しいtmuxセッションを起動:

```bash
# セッション名を指定して起動
tmux new-session -s parallel-dev

# または既存セッションにアタッチ
tmux attach-session -t parallel-dev
```

### Step 2: ペイン分割（1+3構成の場合）

```bash
# 1. 初期ペインで以下を実行（Manager用）
# （何もしない）

# 2. 下部に3つのペインを作成
# 水平分割（上下に分割）
tmux split-window -v -p 70

# 3. 下部ペインをさらに3分割
# 下部ペインを選択
tmux select-pane -t 1

# 垂直分割（左右に分割）× 2
tmux split-window -h -p 66
tmux split-window -h -p 50
```

**ペイン番号の確認**:
```bash
# ペイン番号を表示（3秒間）
tmux display-panes
```

表示例:
```
0: Manager (上部)
1: Dev-A (左下)
2: Dev-B (中央下)
3: Dev-C (右下)
```

### Step 3: 各ペインに名前を付ける（オプション）

```bash
# ペイン0（Manager）
tmux select-pane -t 0 -T "Manager"

# ペイン1（Dev-A）
tmux select-pane -t 1 -T "Dev-A"

# ペイン2（Dev-B）
tmux select-pane -t 2 -T "Dev-B"

# ペイン3（Dev-C）
tmux select-pane -t 3 -T "Dev-C"
```

### Step 4: 各ペインでClaude Codeを起動

**手動起動の場合**:

各ペインに移動してClaude Codeを起動:

```bash
# ペイン1に移動
tmux select-pane -t 1
# Claude Code起動（ペイン内で実行）
claude-code

# 同様にペイン2, 3でも実行
```

**自動起動の場合（Manager AIから実行）**:

```bash
# Dev-Aペイン（ペイン1）でClaude Code起動
tmux send-keys -t 1 "claude-code" C-m

# Dev-Bペイン（ペイン2）でClaude Code起動
tmux send-keys -t 2 "claude-code" C-m

# Dev-Cペイン（ペイン3）でClaude Code起動
tmux send-keys -t 3 "claude-code" C-m
```

**注意**: `C-m`はEnterキーを意味します。

### Step 5: タスクを割り当てる

#### 方法A: タスクリストファイルを使用（推奨）

**1. タスクリストファイルの作成**:

`.claude/tasks/parallel-task-list.md`:

```markdown
# Parallel Task List

## Task A: フロントエンド開発
担当: Dev-A
優先度: 高

### 実行内容
- [ ] Next.jsのユーザー認証画面を作成
- [ ] フォームバリデーションを実装
- [ ] ユニットテストを追加

### 参照ファイル
- `next/src/app/(auth)/login/page.tsx`
- `next/src/components/auth/LoginForm.tsx`

---

## Task B: バックエンドAPI開発
担当: Dev-B
優先度: 高

### 実行内容
- [ ] Go言語でログインAPIを実装
- [ ] JWT生成ロジックを追加
- [ ] テストケースを作成

### 参照ファイル
- `go/internal/handler/auth_handler.go`
- `go/internal/service/auth_service.go`

---

## Task C: モバイル開発
担当: Dev-C
優先度: 中

### 実行内容
- [ ] React Nativeのログイン画面を作成
- [ ] バックエンドAPIとの連携
- [ ] エラーハンドリング実装

### 参照ファイル
- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/api/authApi.ts`
```

**2. Manager AIから各開発者AIに指示を送信**:

```bash
# Dev-Aへの指示送信
tmux send-keys -t 1 "Task Aを実行してください。詳細は.claude/tasks/parallel-task-list.mdのTask Aセクションを参照。完了したら「Task A完了」と報告してください。" C-m

# Dev-Bへの指示送信
tmux send-keys -t 2 "Task Bを実行してください。詳細は.claude/tasks/parallel-task-list.mdのTask Bセクションを参照。完了したら「Task B完了」と報告してください。" C-m

# Dev-Cへの指示送信
tmux send-keys -t 3 "Task Cを実行してください。詳細は.claude/tasks/parallel-task-list.mdのTask Cセクションを参照。完了したら「Task C完了」と報告してください。" C-m
```

#### 方法B: 直接指示を送信

```bash
# Dev-Aに具体的なタスクを送信
tmux send-keys -t 1 "next/src/app/(auth)/login/page.tsxにログインページを作成してください。フォームバリデーションを含めてください。" C-m
```

### Step 6: 進捗監視（Manager AIの役割）

**各ペインの出力を確認**:

```bash
# ペイン1の内容をキャプチャ
tmux capture-pane -t 1 -p

# ペイン2の内容をキャプチャ
tmux capture-pane -t 2 -p

# ペイン3の内容をキャプチャ
tmux capture-pane -t 3 -p
```

**定期的な状態確認スクリプト例**:

```bash
#!/bin/bash
# monitor-panes.sh

while true; do
  echo "=== Dev-A Status ==="
  tmux capture-pane -t 1 -p | tail -5

  echo "=== Dev-B Status ==="
  tmux capture-pane -t 2 -p | tail -5

  echo "=== Dev-C Status ==="
  tmux capture-pane -t 3 -p | tail -5

  sleep 30  # 30秒ごとに確認
done
```

---

## マネージャーAIの役割

### 1. タスク割り当て

**責任**:
- 全体タスクを分析し、依存関係のないサブタスクに分割
- 各開発者AIの負荷を均等に配分
- タスクリストファイルを作成

**実行例**:

```bash
# タスクリストを各開発者に通知
for pane in 1 2 3; do
  tmux send-keys -t $pane "cat .claude/tasks/parallel-task-list.md | grep -A 10 'Task ${pane}'" C-m
done
```

### 2. 指示送信（tmux send-keysの活用）

**基本構文**:

```bash
tmux send-keys [-t target-pane] "command or text" C-m
```

**ポイント**:
- `-t`: ターゲットペインを指定（0, 1, 2, 3...）
- `C-m`: Enterキー（Command-m）
- 複数行の指示を送る場合は、`\n`ではなく複数回`send-keys`を実行

**複数行の指示例**:

```bash
# 方法1: 1行にまとめる
tmux send-keys -t 1 "次のタスクを実行してください: 1. ファイルAを編集 2. テストを実行 3. 結果を報告" C-m

# 方法2: 複数回に分けて送信
tmux send-keys -t 1 "次のタスクを実行してください:"
tmux send-keys -t 1 "1. ファイルAを編集"
tmux send-keys -t 1 "2. テストを実行"
tmux send-keys -t 1 "3. 結果を報告" C-m
```

**注意**: 最後の`C-m`だけを付けると、全文が送信されてからEnterが押されます。

### 3. 進捗監視と同期

**定期チェック**:

```bash
# 全ペインの最新出力を取得
for pane in 1 2 3; do
  echo "=== Pane $pane ==="
  tmux capture-pane -t $pane -p | tail -10
done
```

**完了確認**:

各開発者AIに「完了したら『TASK_COMPLETED』と出力してください」と指示し、その文字列を検索:

```bash
# Dev-Aの完了確認
if tmux capture-pane -t 1 -p | grep -q "TASK_COMPLETED"; then
  echo "Dev-A: タスク完了"
fi
```

**同期ポイントの実装**:

依存関係のあるタスクがある場合、前のグループが完了してから次を開始:

```bash
# Phase 1: Task A, B, C（並列実行）
tmux send-keys -t 1 "Task Aを実行" C-m
tmux send-keys -t 2 "Task Bを実行" C-m
tmux send-keys -t 3 "Task Cを実行" C-m

# Phase 1の完了を待つ（擬似コード）
while true; do
  if all_tasks_completed [1, 2, 3]; then
    break
  fi
  sleep 10
done

# Phase 2: Task D（Task A, B, Cに依存）
tmux send-keys -t 1 "Task Dを実行（Task A, B, Cの結果を統合）" C-m
```

### 4. エラーハンドリング

**エラー検出**:

```bash
# 各ペインでエラーキーワードを検索
for pane in 1 2 3; do
  if tmux capture-pane -t $pane -p | grep -i "error\|failed\|exception"; then
    echo "Pane $pane: エラー検出"
    # エラー対応の指示を送信
    tmux send-keys -t $pane "エラーが発生しました。詳細を確認してください。" C-m
  fi
done
```

**リトライ戦略**:

```bash
# タスク失敗時のリトライ
tmux send-keys -t 1 "前回のタスクが失敗しました。エラーメッセージを確認してリトライしてください。" C-m
```

---

## 実行例: 3つのタスクを並列実行

### シナリオ

このリポジトリ（Go/Next.js/Python/Mobile）で、ユーザー認証機能を3チームで並行開発します。

**タスク分割**:
- **Task A**: Next.jsのログイン画面作成（Dev-A）
- **Task B**: Go言語のログインAPI実装（Dev-B）
- **Task C**: React Nativeのログイン画面作成（Dev-C）

### 実行スクリプト全体

`.claude/scripts/parallel-auth-dev.sh`:

```bash
#!/bin/bash
# parallel-auth-dev.sh
# ユーザー認証機能の並列開発を自動化

SESSION_NAME="auth-parallel-dev"

# 1. tmuxセッションを起動
tmux new-session -d -s $SESSION_NAME

# 2. ペイン分割（1 Manager + 3 Developers）
tmux split-window -v -p 70 -t $SESSION_NAME
tmux select-pane -t 1 -t $SESSION_NAME
tmux split-window -h -p 66 -t $SESSION_NAME
tmux split-window -h -p 50 -t $SESSION_NAME

# 3. ペインに名前を付ける
tmux select-pane -t 0 -T "Manager" -t $SESSION_NAME
tmux select-pane -t 1 -T "Dev-A-Frontend" -t $SESSION_NAME
tmux select-pane -t 2 -T "Dev-B-Backend" -t $SESSION_NAME
tmux select-pane -t 3 -T "Dev-C-Mobile" -t $SESSION_NAME

# 4. 各開発者ペインでClaude Codeを起動
tmux send-keys -t 1 "cd /Users/yamadahiroki/myspace/talk && claude-code" C-m
tmux send-keys -t 2 "cd /Users/yamadahiroki/myspace/talk && claude-code" C-m
tmux send-keys -t 3 "cd /Users/yamadahiroki/myspace/talk && claude-code" C-m

# 5. 少し待機（Claude Code起動を待つ）
sleep 5

# 6. タスク割り当て
# Dev-A: Next.jsログイン画面
tmux send-keys -t 1 "Task Aを実行してください。next/src/app/(auth)/login/page.tsxにログイン画面を作成してください。フォームバリデーションとエラーハンドリングを含めてください。完了したら「Task A完了」と報告してください。" C-m

# Dev-B: Go言語ログインAPI
tmux send-keys -t 2 "Task Bを実行してください。go/internal/handler/auth_handler.goにログインAPIを実装してください。JWT生成とバリデーションを含めてください。完了したら「Task B完了」と報告してください。" C-m

# Dev-C: React Nativeログイン画面
tmux send-keys -t 3 "Task Cを実行してください。mobile/src/screens/LoginScreen.tsxにログイン画面を作成してください。APIとの連携を含めてください。完了したら「Task C完了」と報告してください。" C-m

# 7. Managerペインに移動して監視開始
tmux select-pane -t 0 -t $SESSION_NAME
tmux send-keys -t 0 "echo '=== Parallel Development Started ===' && echo 'Task A: Frontend (Dev-A)' && echo 'Task B: Backend (Dev-B)' && echo 'Task C: Mobile (Dev-C)'" C-m

# 8. セッションにアタッチ
tmux attach-session -t $SESSION_NAME
```

### 実行方法

```bash
# 実行権限を付与
chmod +x .claude/scripts/parallel-auth-dev.sh

# 実行
./.claude/scripts/parallel-auth-dev.sh
```

### ペイン構成（実行後）

```
┌─────────────────────────────────────────────┐
│ Manager: Parallel Development Started       │
│ Task A: Frontend (Dev-A)                    │
│ Task B: Backend (Dev-B)                     │
│ Task C: Mobile (Dev-C)                      │
├──────────────┬──────────────┬───────────────┤
│ Dev-A        │ Dev-B        │ Dev-C         │
│ Frontend     │ Backend      │ Mobile        │
│ (Claude Code)│ (Claude Code)│ (Claude Code) │
│              │              │               │
│ Working on:  │ Working on:  │ Working on:   │
│ Login Page   │ Login API    │ Login Screen  │
└──────────────┴──────────────┴───────────────┘
```

---

## トラブルシューティング

### 問題1: tmuxセッションが起動しない

**症状**: `tmux new-session`が失敗する

**原因**:
- tmuxがインストールされていない
- セッション名が既に存在する

**解決方法**:

```bash
# tmuxのインストール確認
which tmux

# 既存セッションの確認
tmux list-sessions

# 既存セッションを削除
tmux kill-session -t parallel-dev
```

### 問題2: Claude Codeが起動しない

**症状**: `claude-code`コマンドが認識されない

**原因**:
- Claude Code CLIがインストールされていない
- PATHが通っていない

**解決方法**:

```bash
# Claude Codeのインストール確認
which claude-code

# PATHの確認
echo $PATH

# 手動起動を試す
/path/to/claude-code
```

### 問題3: tmux send-keysで指示が送信されない

**症状**: 開発者AIに指示が届かない

**原因**:
- ペイン番号が間違っている
- Claude Codeがまだ起動していない
- 入力モードになっていない

**解決方法**:

```bash
# ペイン番号を再確認
tmux display-panes

# ペインの状態を確認
tmux capture-pane -t 1 -p

# Claude Code起動を待機してから送信
sleep 10
tmux send-keys -t 1 "指示内容" C-m
```

### 問題4: 開発者AI同士が干渉する

**症状**: 同じファイルを編集してコンフリクトが発生

**原因**:
- タスク分割が不適切（依存関係がある）
- ファイルの責任範囲が重複

**解決方法**:

1. **タスク分割の見直し**:
   - 各タスクが異なるファイル/ディレクトリを担当
   - 共通ファイルは1つのタスクにまとめる

2. **実行順序の調整**:
   - 依存関係のあるタスクは並列実行しない
   - Phase分けして順次実行

```bash
# Phase 1: 並列実行可能なタスク
tmux send-keys -t 1 "Task A" C-m
tmux send-keys -t 2 "Task B" C-m

# Phase 1完了後、Phase 2実行
# （手動で確認してから実行）
tmux send-keys -t 1 "Task C（Task A, Bに依存）" C-m
```

### 問題5: ペインの出力が見づらい

**症状**: ペインが小さすぎて内容が読めない

**解決方法**:

```bash
# ペインをズーム（全画面化）
tmux resize-pane -Z

# もう一度押すと元に戻る

# または特定のペインを選択して拡大
tmux select-pane -t 1
tmux resize-pane -Z
```

---

## ベストプラクティス

### 1. タスク分割のコツ

**原則**:
- ✅ 各タスクが独立して完結する
- ✅ 依存関係を最小化する
- ✅ ファイル/ディレクトリの責任範囲を明確にする

**良い例**:
```
Task A: next/src/app/users/* の実装
Task B: go/internal/handler/user_handler.go の実装
Task C: mobile/src/screens/UserScreen.tsx の実装
```

**悪い例**:
```
Task A: ユーザー機能の実装（曖昧）
Task B: ユーザー機能のテスト（Task Aに依存）
Task C: ユーザー機能のドキュメント（Task A, Bに依存）
```

### 2. 依存関係の管理

**依存関係グラフを作成**:

```
Task A (Frontend) ──┐
                    ├─→ Task D (Integration Test)
Task B (Backend) ───┤
                    │
Task C (Mobile) ────┘
```

**実行順序**:
1. Phase 1: Task A, B, C（並列実行）
2. Phase 2: Task D（Task A, B, C完了後）

**実装例**:

```bash
# Phase 1
tmux send-keys -t 1 "Task A" C-m
tmux send-keys -t 2 "Task B" C-m
tmux send-keys -t 3 "Task C" C-m

# Manager AIが完了を確認
# （擬似コード: 実際はスクリプトで実装）
wait_for_completion [1, 2, 3]

# Phase 2
tmux send-keys -t 1 "Task D" C-m
```

### 3. 品質チェックのポイント

**各タスク完了後に確認すべきこと**:

1. **ビルドエラーがないか**:
   ```bash
   # Go
   cd go && make build

   # Next.js
   cd next && npm run build

   # Mobile
   cd mobile && npm run build
   ```

2. **テストが通るか**:
   ```bash
   # Go
   cd go && go test ./... -race -cover

   # Next.js
   cd next && npm test

   # Mobile
   cd mobile && npm test
   ```

3. **リンターエラーがないか**:
   ```bash
   # Go
   cd go && make lint-fix

   # Next.js
   cd next && npm run lint

   # Mobile
   cd mobile && npm run lint
   ```

**Manager AIのチェックリスト**:

```markdown
- [ ] Task A完了確認
  - [ ] ビルド成功
  - [ ] テスト合格
  - [ ] リンター合格
- [ ] Task B完了確認
  - [ ] ビルド成功
  - [ ] テスト合格
  - [ ] リンター合格
- [ ] Task C完了確認
  - [ ] ビルド成功
  - [ ] テスト合格
  - [ ] リンター合格
- [ ] 統合テスト実行
- [ ] git commit & push
```

### 4. 進捗報告のフォーマット

**開発者AIへの指示例**:

```
タスク完了時は以下のフォーマットで報告してください：

===== TASK REPORT =====
Task: [タスク名]
Status: COMPLETED / FAILED
Files Changed: [変更ファイルリスト]
Tests: PASSED / FAILED
Notes: [備考]
========================
```

**Manager AIの監視スクリプト**:

```bash
#!/bin/bash
# report-monitor.sh

for pane in 1 2 3; do
  if tmux capture-pane -t $pane -p | grep -q "TASK REPORT"; then
    echo "Pane $pane: レポート受信"
    tmux capture-pane -t $pane -p | sed -n '/TASK REPORT/,/=====/p'
  fi
done
```

### 5. セッションの保存と復元

**セッション状態を保存**:

```bash
# tmux-resurrectプラグインを使用
# ~/.tmux.confに追加
set -g @plugin 'tmux-plugins/tmux-resurrect'

# 保存: Prefix + Ctrl-s
# 復元: Prefix + Ctrl-r
```

**または手動でスクリプト化**:

```bash
# セッション情報をエクスポート
tmux list-windows -t parallel-dev > session-layout.txt
tmux list-panes -t parallel-dev -a >> session-layout.txt
```

---

## 参考資料

- **元記事**: [Claude Code + tmuxによる並列開発](https://tolv.jp/blog/claude-code-multi-task/) - 株式会社tolv 宍戸陽介
- **tmux公式ドキュメント**: https://github.com/tmux/tmux/wiki
- **Claude Code公式リポジトリ**: https://github.com/anthropics/claude-code
- **このプロジェクトのガイドライン**: `AGENTS.md`

---

## まとめ

このガイドを使って、Claude CodeとtmuxによるAI並列開発を実現できます。

**重要なポイント**:
1. タスクを適切に分割し、依存関係を最小化
2. tmux send-keysでManager AIから各開発者AIに指示を送信
3. 定期的に進捗を監視し、エラーハンドリングを徹底
4. 完了後は品質チェックを必ず実施

**次のステップ**:
- `.claude/scripts/parallel-auth-dev.sh`を参考に、自プロジェクト用のスクリプトを作成
- 小規模タスクで試してから、大規模タスクに適用
- チーム内でベストプラクティスを共有

---

**作成日**: 2025-12-05
**バージョン**: 1.0.0
**メンテナー**: AI Development Team
