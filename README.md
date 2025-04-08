# go-next-template

## template 概要

この template は、go と next.js を使用したアプリケーションのテンプレートです。

### go

使用バージョン: 1.24.1
go で gRPC を採用しており、buf を使用して proto ファイルから go のコードを自動生成しています。

### next.js

使用バージョン: 15.2.4
使用バージョン: next.js では、app router を採用しています。

### proto

使用バージョン: 1.30.0
使用バージョン: buf を使用して proto ファイルから go のコードと ts のコードを自動生成しています。
buf のバージョンはv2を採用しています。



## ディレクトリ構造

```
.
├── go/             # Goアプリケーションのルートディレクトリ
│   └── gen/        # protoファイルから自動生成されたGoコード
├── next/           # Next.jsアプリケーションのルートディレクトリ
│   └── src/
│       └── gen/    # protoファイルから自動生成されたTypeScriptコード
└── proto/          # Protocol Buffersの定義ファイル
    ├── app/        # アプリケーション用のprotoファイル
    ├── buf.gen.yaml # Buf生成設定
    ├── buf.yaml    # Bufワークスペース設定
    └── Makefile    # protoファイル関連のコマンド
```
