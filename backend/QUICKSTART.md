# 🚀 クイックスタートガイド

## 3 ステップでテスト開始

### 1️⃣ サーバー起動

```bash
cd backend
python main.py
```

### 2️⃣ ブラウザで API ドキュメントを開く

http://localhost:8000/api/docs

### 3️⃣ 基本テストを実行

#### 自動テスト（推奨）

```bash
python run_user_tests.py
```

#### 手動テスト

1. **POST /api/v1/files/save/** で以下をテスト:

```json
{
  "file_path": "my_drawing.excalidraw",
  "content": "{\"type\":\"excalidraw\",\"version\":2,\"elements\":[]}",
  "create_directories": true
}
```

2. **GET /api/v1/files/load/** で `my_drawing.excalidraw` を読み込み

3. **GET /api/v1/files/** でファイル一覧を確認

## 🎯 成功の確認ポイント

- ✅ HTTP ステータス 200 が返る
- ✅ 日本語エラーメッセージが表示される
- ✅ セキュリティチェックでエラーになる（`../../../etc/passwd` など）
- ✅ .excalidraw ファイルのみ保存できる

## 📚 詳細ドキュメント

- [完全テストガイド](USER_TEST_GUIDE.md)
- [README](README.md)
- [テストデータ](test_data.json)

## 🆘 トラブルシューティング

### ポート 8000 が使用中

```bash
lsof -i :8000
# プロセスを確認後、killで停止
```

### パッケージが見つからない

```bash
pip install -r requirements.txt
```

### サーバーが起動しない

```bash
python --version  # Python 3.8以上必要
```
