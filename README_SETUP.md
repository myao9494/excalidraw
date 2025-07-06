# Excalidraw + FastAPI セットアップガイド

このプロジェクトは、フォルダ管理機能を持つ Excalidraw のフォーク版です。

## 📁 プロジェクト構造

```
excalidraw/
├── backend/                 # FastAPI バックエンド
│   ├── main.py             # FastAPI メインアプリケーション
│   ├── routers/            # API ルーター
│   ├── services/           # ビジネスロジック
│   ├── models/             # データモデル
│   ├── backend/venv/       # Python仮想環境
│   ├── requirements.txt    # Python依存関係
│   ├── run_dev.py          # 開発サーバー起動スクリプト
│   └── run.sh              # バッシュ起動スクリプト
├── packages/               # Excalidraw パッケージ
├── excalidraw-app/         # Excalidraw アプリケーション
└── [その他のExcalidrawファイル]
```

## 🚀 開発環境の起動

### 1. バックエンドの起動

```bash
# バックエンドディレクトリに移動
cd backend

# 仮想環境を有効化してサーバーを起動
./run.sh

# または直接実行
source backend/venv/bin/activate
python run_dev.py
```

バックエンドは以下の URL で利用可能になります：

- API: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs

### 2. フロントエンドの起動

```bash
# メインディレクトリで
yarn start

# または開発サーバー
yarn dev
```

## 📋 API エンドポイント

### ファイル管理 API

- `GET /api/v1/files/?folder_path={path}` - ファイル一覧取得
- `GET /api/v1/files/load/?file_path={path}` - ファイル読み込み
- `POST /api/v1/files/save/` - ファイル保存
- `DELETE /api/v1/files/?file_path={path}` - ファイル削除

### 使用例

```bash
# ファイル一覧を取得
curl "http://localhost:8000/api/v1/files/?folder_path=/Users/username/Documents"

# ファイルを読み込み
curl "http://localhost:8000/api/v1/files/load/?file_path=/Users/username/Documents/test.excalidraw"

# ファイルを保存
curl -X POST "http://localhost:8000/api/v1/files/save/" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/Users/username/Documents/test.excalidraw", "content": {"type": "excalidraw", "version": 2}}'
```

## 🔧 開発メモ

### 依存関係

**バックエンド (Python 3.12+):**

- FastAPI
- uvicorn
- aiofiles
- python-multipart
- pydantic

**フロントエンド:**

- 既存の Excalidraw 依存関係

### 継続的アップデート

```bash
# アップストリームから最新版を取得
git fetch upstream
git checkout main
git merge upstream/main

# 開発ブランチに反映
git checkout feature/folder-management
git rebase main
```

## 🛠️ 次のステップ

1. フロントエンドとバックエンドの統合
2. UI コンポーネントの追加
3. ファイル管理インターフェースの実装
4. URL パラメータとの連携
