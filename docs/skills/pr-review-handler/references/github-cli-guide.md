# GitHub CLI Guide for PR Review Handler

このガイドは、`pr-review-handler` スキルで使用する GitHub CLI (`gh`) コマンドの詳細リファレンスです。

## 基本コマンド

### PR の詳細確認

```bash
gh pr view <PR番号> --json title,body,state,url,headRefName,baseRefName
```

### レビューとコメントの取得

```bash
# レビュー一覧
gh api repos/:owner/:repo/pulls/:number/reviews

# 行コメント一覧
gh api repos/:owner/:repo/pulls/:number/comments
```

### コメントへの返信

```bash
gh api repos/:owner/:repo/pulls/:number/comments/:comment_id/replies -f body="メッセージ"
```

## トラブルシューティング

- 認証エラー: `gh auth status`
- 権限追加: `gh auth refresh -s repo`
