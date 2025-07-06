# Excalidraw File Manager Backend

Excalidraw のフォルダ指定機能を実現する FastAPI バックエンドです。

## 概要

このバックエンドは、Excalidraw ファイル（.excalidraw）の管理機能を提供します：

- ファイルの保存・読み込み
- ディレクトリ一覧の取得
- ファイル削除
- ディレクトリ作成
- セキュリティ機能（パス検証）

## 主要機能

### セキュリティ機能

- パストラバーサル攻撃の防止
- 危険なパス文字の検出
- .excalidraw ファイルのみサポート
- JSON フォーマットの検証

### API エンドポイント

- `GET /api/v1/files/` - ファイル一覧取得
- `GET /api/v1/files/load/` - ファイル読み込み
- `POST /api/v1/files/save/` - ファイル保存
- `DELETE /api/v1/files/` - ファイル削除
- `POST /api/v1/files/directory/` - ディレクトリ作成
- `GET /api/v1/files/info/` - ファイル情報取得

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend
pip install -r requirements.txt
```

### 2. サーバーの起動

```bash
# 開発モード
python main.py

# または uvicorn で直接起動
uvicorn main:app --reload --host localhost --port 8000
```

### 3. API ドキュメントの確認

サーバー起動後、以下の URL で API ドキュメントを確認できます：

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## テストの実行

```bash
# すべてのテストを実行
pytest

# カバレッジレポート付きで実行
pytest --cov=. --cov-report=html

# 特定のテストファイルのみ実行
pytest tests/test_file_manager.py
```

## 環境変数

以下の環境変数で設定をカスタマイズできます：

- `HOST`: サーバーのホスト（デフォルト: localhost）
- `PORT`: サーバーのポート（デフォルト: 8000）
- `DEBUG`: デバッグモード（デフォルト: true）

## プロジェクト構造

```
backend/
├── main.py                 # FastAPIアプリケーション
├── requirements.txt        # 依存関係
├── pytest.ini            # pytest設定
├── routers/
│   └── files.py           # ファイル操作API
├── services/
│   └── file_manager.py    # ファイル管理ロジック
├── models/
│   └── schemas.py         # Pydanticモデル
└── tests/
    ├── test_file_manager.py # FileManagerのテスト
    └── test_api.py         # APIのテスト
```

## 使用例

### ファイル保存

```bash
curl -X POST "http://localhost:8000/api/v1/files/save/" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/path/to/drawing.excalidraw",
    "content": "{\"type\":\"excalidraw\",\"version\":2,\"elements\":[]}",
    "create_directories": true
  }'
```

### ファイル読み込み

```bash
curl "http://localhost:8000/api/v1/files/load/?file_path=/path/to/drawing.excalidraw"
```

### ディレクトリ一覧

```bash
curl "http://localhost:8000/api/v1/files/?directory_path=/path/to/directory"
```

## 注意事項

- セキュリティのため、`.excalidraw`ファイルのみサポートされています
- パストラバーサル攻撃を防ぐため、危険なパス文字は拒否されます
- ファイル内容は JSON フォーマットである必要があります
- CORS 設定は開発用のため、本番環境では適切に設定してください

## トラブルシューティング

### よくある問題

1. **ファイルが見つからない**

   - ファイルパスが正しいか確認
   - 読み取り権限があるか確認

2. **不正なパスエラー**

   - 危険なパス文字（`..`, `~`, `$`等）が含まれていないか確認

3. **JSON エラー**
   - ファイル内容が正しい JSON 形式か確認

### ログ確認

アプリケーションのログを確認してエラーの詳細を把握できます：

```bash
# サーバー起動時のログ確認
python main.py

# ログレベルの調整
export LOG_LEVEL=DEBUG
python main.py
```
