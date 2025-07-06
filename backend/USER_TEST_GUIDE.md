# Excalidraw File Manager API - ユーザーテストガイド

## テスト環境のセットアップ

### 1. サーバーの起動

```bash
cd backend
python main.py
```

サーバーが起動すると以下のメッセージが表示されます：

```
開発サーバーを起動します: localhost:8000
INFO:     Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
```

### 2. API ドキュメントにアクセス

ブラウザで以下の URL にアクセスしてください：

**Swagger UI（推奨）**: http://localhost:8000/api/docs  
**ReDoc**: http://localhost:8000/api/redoc

## テストケース一覧

### 🔍 テスト 1: 基本エンドポイントの確認

#### ルートエンドポイント

- **URL**: http://localhost:8000/
- **メソッド**: GET
- **期待するレスポンス**:

```json
{
  "message": "Excalidraw File Manager API",
  "version": "1.0.0",
  "docs_url": "/api/docs"
}
```

#### ヘルスチェック

- **URL**: http://localhost:8000/health
- **メソッド**: GET
- **期待するレスポンス**:

```json
{
  "status": "healthy",
  "timestamp": "2025-07-06T12:59:19.702959",
  "version": "1.0.0"
}
```

### 📁 テスト 2: ファイル一覧取得

#### 現在のディレクトリ一覧

- **URL**: http://localhost:8000/api/v1/files/
- **メソッド**: GET
- **期待するレスポンス**:

```json
{
  "current_path": "/path/to/backend",
  "files": [
    {
      "name": "main.py",
      "path": "/path/to/backend/main.py",
      "size": 3822,
      "modified": "2025-07-06T12:56:06.051776",
      "is_directory": false,
      "extension": ".py"
    }
  ],
  "total_count": 10
}
```

### 💾 テスト 3: ファイル保存

#### Swagger UI でのテスト

1. http://localhost:8000/api/docs にアクセス
2. **POST /api/v1/files/save/** を展開
3. **Try it out** をクリック
4. Request body に以下を入力:

base_path を以下にして実行 /Users/sudoupousei/000_work/web_file_manager/excalidraw_myao

```json
{
  "file_path": "test_drawing.excalidraw",
  "content": "{\"type\":\"excalidraw\",\"version\":2,\"source\":\"https://excalidraw.com\",\"elements\":[{\"type\":\"rectangle\",\"version\":1,\"versionNonce\":123456789,\"isDeleted\":false,\"id\":\"rect1\",\"fillStyle\":\"hachure\",\"strokeWidth\":1,\"strokeStyle\":\"solid\",\"roughness\":1,\"opacity\":100,\"angle\":0,\"x\":100,\"y\":100,\"strokeColor\":\"#000000\",\"backgroundColor\":\"transparent\",\"width\":200,\"height\":100,\"seed\":987654321,\"groupIds\":[],\"roundness\":null,\"boundElements\":null,\"updated\":1,\"link\":null,\"locked\":false}],\"appState\":{\"viewBackgroundColor\":\"#ffffff\",\"currentItemStrokeColor\":\"#000000\",\"currentItemBackgroundColor\":\"transparent\"}}",
  "create_directories": true
}
```

1. **Execute** をクリック

#### 期待するレスポンス

```json
{
  "file_info": {
    "name": "test_drawing.excalidraw",
    "path": "test_drawing.excalidraw",
    "size": 500,
    "modified": "2025-07-06T13:00:00.000000",
    "is_directory": false,
    "extension": ".excalidraw"
  },
  "success": true,
  "message": "ファイルを保存しました: test_drawing.excalidraw"
}
```

### 📖 テスト 4: ファイル読み込み

#### Swagger UI でのテスト

1. **GET /api/v1/files/load/** を展開
2. **Try it out** をクリック
3. **file_path** パラメータに `test_drawing.excalidraw` を入力
4. **Execute** をクリック

base_path を以下にして実行 /Users/sudoupousei/000_work/web_file_manager/excalidraw_myao

#### 期待するレスポンス

```json
{
  "content": "{\"type\":\"excalidraw\",\"version\":2,\"source\":\"https://excalidraw.com\",\"elements\":[...],\"appState\":{...}}",
  "file_info": {
    "name": "test_drawing.excalidraw",
    "path": "test_drawing.excalidraw",
    "size": 500,
    "modified": "2025-07-06T13:00:00.000000",
    "is_directory": false,
    "extension": ".excalidraw"
  },
  "success": true
}
```

### 🗑️ テスト 5: ファイル削除

#### Swagger UI でのテスト

1. **DELETE /api/v1/files/** を展開
2. **Try it out** をクリック
3. **file_path** パラメータに `test_drawing.excalidraw` を入力
4. **Execute** をクリック

base_path を以下にして実行 /Users/sudoupousei/000_work/web_file_manager/excalidraw_myao

#### 期待するレスポンス

```json
{
  "success": true,
  "message": "ファイルを削除しました: test_drawing.excalidraw"
}
```

### 📁 テスト 6: ディレクトリ作成

#### Swagger UI でのテスト

1. **POST /api/v1/files/directory/** を展開
2. **Try it out** をクリック
3. **directory_path** パラメータに `test_folder` を入力
4. **Execute** をクリック

#### 期待するレスポンス

```json
{
  "success": true,
  "message": "ディレクトリを作成しました: test_folder"
}
```

### ℹ️ テスト 7: ファイル情報取得

#### Swagger UI でのテスト

1. **GET /api/v1/files/info/** を展開
2. **Try it out** をクリック
3. **file_path** パラメータに `main.py` を入力
4. **Execute** をクリック

#### 期待するレスポンス

```json
{
  "file_info": {
    "name": "main.py",
    "path": "main.py",
    "size": 3822,
    "modified": "2025-07-06T12:56:06.051776",
    "is_directory": false,
    "extension": ".py"
  },
  "absolute_path": "/full/path/to/backend/main.py"
}
```

## エラーケースのテスト

### 🚫 テスト 8: セキュリティ検証

#### 不正なパスでのファイル保存

- **Request body**:

```json
{
  "file_path": "../../../etc/passwd",
  "content": "{\"type\":\"excalidraw\"}",
  "create_directories": false
}
```

#### 期待するエラーレスポンス

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "file_path"],
      "msg": "不正なパス文字が含まれています: ..",
      "input": "../../../etc/passwd"
    }
  ]
}
```

### 🚫 テスト 9: 不正なファイル形式

#### 非.excalidraw ファイルの保存

- **Request body**:

```json
{
  "file_path": "test.txt",
  "content": "Hello World",
  "create_directories": false
}
```

#### 期待するエラーレスポンス

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "file_path"],
      "msg": "Excalidrawファイル(.excalidraw)のみサポートされています",
      "input": "test.txt"
    }
  ]
}
```

### 🚫 テスト 10: 不正な JSON

#### 無効な JSON でのファイル保存

- **Request body**:

```json
{
  "file_path": "invalid.excalidraw",
  "content": "invalid json content",
  "create_directories": false
}
```

#### 期待するエラーレスポンス

```json
{
  "error": "HTTPError400",
  "message": "不正なJSONファイルです: Expecting value: line 1 column 1 (char 0)",
  "details": null
}
```

## cURL コマンドでのテスト

Swagger UI の代わりにコマンドラインでテストする場合：

### ファイル保存

```bash
curl -X POST "http://localhost:8000/api/v1/files/save/" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "curl_test.excalidraw",
    "content": "{\"type\":\"excalidraw\",\"version\":2,\"elements\":[]}",
    "create_directories": true
  }'
```

### ファイル読み込み

```bash
curl "http://localhost:8000/api/v1/files/load/?file_path=curl_test.excalidraw"
```

### ファイル一覧

```bash
curl "http://localhost:8000/api/v1/files/"
```

### ファイル削除

```bash
curl -X DELETE "http://localhost:8000/api/v1/files/?file_path=curl_test.excalidraw"
```

## 成功の判定基準

### ✅ 正常ケース

- HTTP ステータスコード: **200**
- レスポンスボディに適切な JSON データが含まれている
- `success: true` フィールドが含まれている（該当エンドポイント）

### ❌ エラーケース

- HTTP ステータスコード: **400** (Bad Request), **404** (Not Found), **422** (Validation Error)
- エラーメッセージが適切に日本語で表示される
- セキュリティチェックが正常に動作する

## トラブルシューティング

### サーバーが起動しない場合

1. ポート 8000 が使用中でないか確認: `lsof -i :8000`
2. 依存関係が正しくインストールされているか確認: `pip list`
3. Python のバージョンを確認: `python --version` (3.8 以上が必要)

### API が応答しない場合

1. サーバーログを確認
2. ファイアウォール設定を確認
3. ブラウザのコンソールでエラーを確認

### テストファイルが作成されない場合

1. 書き込み権限があるか確認
2. ディスク容量を確認
3. パスが正しいか確認

このテストガイドに従って、すべての機能が期待通りに動作することを確認してください。問題が発生した場合は、エラーメッセージと HTTP ステータスコードを確認して、適切な対処を行ってください。
