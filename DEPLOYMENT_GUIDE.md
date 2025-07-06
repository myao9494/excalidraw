# 🚀 Excalidraw ファイル管理システム デプロイメントガイド

## 📦 ビルド済みファイル

**フロントエンド（静的ファイル）**:
```
excalidraw-app/build/
```

**バックエンド（Python API）**:
```
backend/
├── main.py           # FastAPI アプリケーション
├── routers/          # API ルーター
├── services/         # サービス層
├── requirements.txt  # Python 依存関係
└── ...
```

## 🏢 会社での起動方法

### 方法1: 簡単な静的ファイルサーバー

#### A. Python簡易サーバー（推奨）

```bash
# 1. buildフォルダに移動
cd excalidraw-app/build

# 2. Python HTTPサーバー起動
python -m http.server 8080

# 3. ブラウザでアクセス
# http://localhost:8080
```

#### B. Node.js serve（Node.jsがある場合）

```bash
# 1. serveをインストール（一度だけ）
npm install -g serve

# 2. buildフォルダでサーバー起動
cd excalidraw-app/build
serve -s . -p 8080

# 3. ブラウザでアクセス
# http://localhost:8080
```

### 方法2: フルシステム（フロントエンド + バックエンド）

#### 1. バックエンドAPI起動

```bash
# 1. Python仮想環境作成（推奨）
python -m venv venv

# 2. 仮想環境アクティベート
# Windows:
venv\\Scripts\\activate
# macOS/Linux:
source venv/bin/activate

# 3. 依存関係インストール
cd backend
pip install -r requirements.txt

# 4. API起動
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

#### 2. フロントエンド起動

新しいターミナルで：

```bash
# buildフォルダで静的サーバー起動
cd excalidraw-app/build
python -m http.server 3000
```

#### 3. アクセス

- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:8000
- **APIドキュメント**: http://localhost:8000/docs

### 方法3: Docker（推奨・本番環境）

#### A. フロントエンドのみ

```dockerfile
# Dockerfile.frontend
FROM nginx:alpine
COPY excalidraw-app/build /usr/share/nginx/html
EXPOSE 80
```

```bash
# ビルド & 実行
docker build -f Dockerfile.frontend -t excalidraw-frontend .
docker run -p 8080:80 excalidraw-frontend
```

#### B. フルシステム（docker-compose）

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    image: nginx:alpine
    volumes:
      - ./excalidraw-app/build:/usr/share/nginx/html
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - PYTHONPATH=/app
    volumes:
      - ./data:/app/data  # ファイル保存用
```

```bash
# 起動
docker-compose up -d
```

## 🌐 Webサーバー設定

### Apache設定例

```apache
<VirtualHost *:80>
    ServerName excalidraw.company.com
    DocumentRoot /var/www/excalidraw/build
    
    # SPA用のfallback
    FallbackResource /index.html
    
    # API プロキシ
    ProxyPass /api/ http://localhost:8000/api/
    ProxyPassReverse /api/ http://localhost:8000/api/
</VirtualHost>
```

### Nginx設定例

```nginx
server {
    listen 80;
    server_name excalidraw.company.com;
    root /var/www/excalidraw/build;
    index index.html;

    # SPA用のfallback
    try_files $uri $uri/ /index.html;

    # 静的ファイルキャッシュ
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API プロキシ
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📁 ファイル権限設定

バックエンドがファイルを作成できるよう権限設定：

```bash
# データディレクトリ作成
mkdir -p /var/excalidraw/data

# 権限設定（Webサーバーのユーザーに合わせて調整）
chown -R www-data:www-data /var/excalidraw/data
chmod -R 755 /var/excalidraw/data
```

## 🔧 環境変数設定

### フロントエンド（ビルド時）

```bash
# .env.production
VITE_API_BASE_URL=https://api.company.com
```

### バックエンド（実行時）

```bash
# .env
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=https://excalidraw.company.com
DATA_PATH=/var/excalidraw/data
```

## 🚀 クイックスタート（会社PC）

### 最低限の起動（フロントエンドのみ）

```bash
# 1. ファイルをコピー
# excalidraw-app/build/ フォルダを会社PCにコピー

# 2. 起動
cd build
python -m http.server 8080

# 3. アクセス
# http://localhost:8080
```

### フル機能（ファイル管理付き）

```bash
# 1. 全ファイルをコピー
# プロジェクト全体を会社PCにコピー

# 2. Python依存関係インストール
cd backend
pip install fastapi uvicorn python-multipart

# 3. バックエンド起動
python -m uvicorn main:app --port 8000 &

# 4. フロントエンド起動
cd ../excalidraw-app/build
python -m http.server 3000

# 5. アクセス
# http://localhost:3000
```

## 📋 動作確認

### 基本確認

1. **フロントエンド**: ブラウザでExcalidrawが開くか
2. **描画機能**: 図形の描画ができるか
3. **保存機能**: ローカル保存ができるか

### フル機能確認

1. **API接続**: http://localhost:8000/docs でAPI動作確認
2. **ファイル管理**: URLパラメータでファイル指定
   ```
   http://localhost:3000?folder=test&file=sample.excalidraw
   ```
3. **自動保存**: 描画時の自動保存機能
4. **バックアップ**: backup/フォルダの作成確認

## ⚠️ トラブルシューティング

### よくある問題

1. **ポート使用中エラー**
   ```bash
   # 別のポートを使用
   python -m http.server 8081
   ```

2. **CORS エラー**
   ```bash
   # バックエンドでCORS設定確認
   # main.py の CORS_ORIGINS 設定
   ```

3. **ファイル保存エラー**
   ```bash
   # ディレクトリ権限確認
   chmod 755 data/
   ```

4. **Python関連エラー**
   ```bash
   # Python バージョン確認（3.8以上推奨）
   python --version
   
   # 依存関係再インストール
   pip install -r requirements.txt --force-reinstall
   ```

## 📞 サポート

問題が発生した場合：

1. ブラウザの開発者ツールでエラー確認
2. バックエンドのログ確認
3. ポート・権限・ネットワーク設定確認

---

**作成**: Claude Code | **更新**: 2025-07-07