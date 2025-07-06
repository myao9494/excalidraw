#!/bin/bash
# 🏢 会社での簡単起動スクリプト
# Excalidraw ファイル管理システム

echo "🚀 Excalidraw ファイル管理システム 起動中..."

# 色付きメッセージ用
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 現在のディレクトリ確認
if [ ! -d "excalidraw-app/build" ]; then
    echo -e "${RED}❌ excalidraw-app/build フォルダが見つかりません${NC}"
    echo "正しいディレクトリで実行してください"
    exit 1
fi

echo -e "${GREEN}✅ ビルドフォルダ確認完了${NC}"

# 選択メニュー
echo ""
echo "起動方法を選択してください:"
echo "1) フロントエンドのみ（簡単・推奨）"
echo "2) フルシステム（フロントエンド + バックエンド）"
echo "3) ヘルプ"
echo ""
read -p "選択してください (1-3): " choice

case $choice in
    1)
        echo -e "${BLUE}📦 フロントエンドのみ起動...${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  この方法では以下の機能は使用できません:${NC}"
        echo "   - ファイル管理機能"
        echo "   - 自動保存機能" 
        echo "   - バックアップ機能"
        echo ""
        echo -e "${GREEN}✅ 基本的な描画機能は利用可能です${NC}"
        echo ""
        
        cd excalidraw-app/build
        
        echo -e "${GREEN}🌐 サーバー起動中... (ポート 8080)${NC}"
        echo ""
        echo -e "${BLUE}📋 アクセス方法:${NC}"
        echo "   ブラウザで http://localhost:8080 を開いてください"
        echo ""
        echo -e "${YELLOW}⏹️  停止方法: Ctrl+C${NC}"
        echo ""
        
        python -m http.server 8080
        ;;
        
    2)
        echo -e "${BLUE}🔧 フルシステム起動...${NC}"
        echo ""
        
        # バックエンド存在確認
        if [ ! -d "backend" ]; then
            echo -e "${RED}❌ backend フォルダが見つかりません${NC}"
            exit 1
        fi
        
        # Python依存関係確認
        echo -e "${YELLOW}📋 Python依存関係確認中...${NC}"
        if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  必要なPythonパッケージがインストールされていません${NC}"
            echo "インストールしますか? (y/n)"
            read -p "> " install_deps
            
            if [ "$install_deps" = "y" ] || [ "$install_deps" = "Y" ]; then
                echo -e "${BLUE}📦 パッケージインストール中...${NC}"
                cd backend
                pip install fastapi uvicorn python-multipart
                cd ..
                echo -e "${GREEN}✅ インストール完了${NC}"
            else
                echo -e "${RED}❌ 依存関係が不足しています。手動でインストールしてください:${NC}"
                echo "   cd backend && pip install -r requirements.txt"
                exit 1
            fi
        fi
        
        echo -e "${GREEN}✅ 依存関係確認完了${NC}"
        echo ""
        
        # バックエンド起動
        echo -e "${BLUE}🔧 バックエンドAPI起動中... (ポート 8000)${NC}"
        cd backend
        python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
        BACKEND_PID=$!
        cd ..
        
        # 起動待機
        echo -e "${YELLOW}⏳ API起動待機中...${NC}"
        sleep 3
        
        # バックエンド状態確認
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "${GREEN}✅ バックエンドAPI起動完了${NC}"
        else
            echo -e "${RED}❌ バックエンドAPI起動失敗${NC}"
            exit 1
        fi
        
        # フロントエンド起動
        echo -e "${BLUE}🌐 フロントエンド起動中... (ポート 3000)${NC}"
        cd excalidraw-app/build
        
        echo ""
        echo -e "${GREEN}🎉 フルシステム起動完了！${NC}"
        echo ""
        echo -e "${BLUE}📋 アクセス方法:${NC}"
        echo "   フロントエンド: http://localhost:3000"
        echo "   API管理画面:     http://localhost:8000/docs"
        echo ""
        echo -e "${BLUE}🧪 テスト用URL:${NC}"
        echo "   基本: http://localhost:3000"
        echo "   ファイル指定: http://localhost:3000?folder=test&file=sample.excalidraw"
        echo ""
        echo -e "${GREEN}✨ 全機能が利用可能です:${NC}"
        echo "   ✅ ファイル管理機能"
        echo "   ✅ 自動保存機能"
        echo "   ✅ バックアップ機能"
        echo "   ✅ 日本語パス対応"
        echo ""
        echo -e "${YELLOW}⏹️  停止方法: Ctrl+C${NC}"
        echo ""
        
        # クリーンアップ用のトラップ設定
        trap "echo '';echo -e '${YELLOW}🛑 システム停止中...${NC}';kill $BACKEND_PID 2>/dev/null;echo -e '${GREEN}✅ 停止完了${NC}';exit 0" INT TERM
        
        python -m http.server 3000
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}📖 Excalidraw ファイル管理システム ヘルプ${NC}"
        echo ""
        echo -e "${GREEN}🎯 機能一覧:${NC}"
        echo "   ✅ 図形描画・編集（標準Excalidraw機能）"
        echo "   ✅ ファイル管理（フォルダ指定保存・読み込み）"
        echo "   ✅ 自動保存機能（URLパラメータベース）"
        echo "   ✅ バックアップ機能（設定可能な世代数）"
        echo "   ✅ 日本語パス対応"
        echo "   ✅ クロスプラットフォーム対応"
        echo ""
        echo -e "${BLUE}📁 フォルダ構成:${NC}"
        echo "   excalidraw-app/build/  - フロントエンド（静的ファイル）"
        echo "   backend/               - バックエンドAPI（Python）"
        echo ""
        echo -e "${YELLOW}💡 推奨環境:${NC}"
        echo "   - Python 3.8以上"
        echo "   - モダンブラウザ（Chrome、Firefox、Safari、Edge）"
        echo ""
        echo -e "${GREEN}🔧 詳細情報:${NC}"
        echo "   - DEPLOYMENT_GUIDE.md"
        echo "   - API_REFERENCE.md"
        echo "   - test-functionality.html"
        echo ""
        ;;
        
    *)
        echo -e "${RED}❌ 無効な選択です${NC}"
        exit 1
        ;;
esac