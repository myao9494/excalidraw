@echo off
REM 🏢 会社での簡単起動スクリプト（Windows版）
REM Excalidraw ファイル管理システム

echo 🚀 Excalidraw ファイル管理システム 起動中...
echo.

REM 現在のディレクトリ確認
if not exist "excalidraw-app\build" (
    echo ❌ excalidraw-app\build フォルダが見つかりません
    echo 正しいディレクトリで実行してください
    pause
    exit /b 1
)

echo ✅ ビルドフォルダ確認完了
echo.

REM 選択メニュー
echo 起動方法を選択してください:
echo 1^) フロントエンドのみ（簡単・推奨）
echo 2^) フルシステム（フロントエンド + バックエンド）
echo 3^) ヘルプ
echo.
set /p choice="選択してください (1-3): "

if "%choice%"=="1" goto frontend_only
if "%choice%"=="2" goto full_system
if "%choice%"=="3" goto help
echo ❌ 無効な選択です
pause
exit /b 1

:frontend_only
echo 📦 フロントエンドのみ起動...
echo.
echo ⚠️  この方法では以下の機能は使用できません:
echo    - ファイル管理機能
echo    - 自動保存機能
echo    - バックアップ機能
echo.
echo ✅ 基本的な描画機能は利用可能です
echo.

cd excalidraw-app\build

echo 🌐 サーバー起動中... (ポート 8080)
echo.
echo 📋 アクセス方法:
echo    ブラウザで http://localhost:8080 を開いてください
echo.
echo ⏹️  停止方法: Ctrl+C
echo.

python -m http.server 8080
goto end

:full_system
echo 🔧 フルシステム起動...
echo.

REM バックエンド存在確認
if not exist "backend" (
    echo ❌ backend フォルダが見つかりません
    pause
    exit /b 1
)

REM Python依存関係確認
echo 📋 Python依存関係確認中...
python -c "import fastapi, uvicorn" 2>nul
if errorlevel 1 (
    echo ⚠️  必要なPythonパッケージがインストールされていません
    set /p install_deps="インストールしますか? (y/n): "
    
    if /i "%install_deps%"=="y" (
        echo 📦 パッケージインストール中...
        cd backend
        pip install fastapi uvicorn python-multipart
        cd ..
        echo ✅ インストール完了
    ) else (
        echo ❌ 依存関係が不足しています。手動でインストールしてください:
        echo    cd backend ^&^& pip install -r requirements.txt
        pause
        exit /b 1
    )
)

echo ✅ 依存関係確認完了
echo.

REM バックエンド起動
echo 🔧 バックエンドAPI起動中... (ポート 8000)
cd backend
start /b python -m uvicorn main:app --host 0.0.0.0 --port 8000
cd ..

REM 起動待機
echo ⏳ API起動待機中...
timeout /t 3 /nobreak >nul

REM フロントエンド起動準備
cd excalidraw-app\build

echo.
echo 🎉 フルシステム起動完了！
echo.
echo 📋 アクセス方法:
echo    フロントエンド: http://localhost:3000
echo    API管理画面:     http://localhost:8000/docs
echo.
echo 🧪 テスト用URL:
echo    基本: http://localhost:3000
echo    ファイル指定: http://localhost:3000?folder=test^&file=sample.excalidraw
echo.
echo ✨ 全機能が利用可能です:
echo    ✅ ファイル管理機能
echo    ✅ 自動保存機能
echo    ✅ バックアップ機能
echo    ✅ 日本語パス対応
echo.
echo ⏹️  停止方法: Ctrl+C
echo.

python -m http.server 3000
goto end

:help
echo.
echo 📖 Excalidraw ファイル管理システム ヘルプ
echo.
echo 🎯 機能一覧:
echo    ✅ 図形描画・編集（標準Excalidraw機能）
echo    ✅ ファイル管理（フォルダ指定保存・読み込み）
echo    ✅ 自動保存機能（URLパラメータベース）
echo    ✅ バックアップ機能（設定可能な世代数）
echo    ✅ 日本語パス対応
echo    ✅ クロスプラットフォーム対応
echo.
echo 📁 フォルダ構成:
echo    excalidraw-app\build\  - フロントエンド（静的ファイル）
echo    backend\               - バックエンドAPI（Python）
echo.
echo 💡 推奨環境:
echo    - Python 3.8以上
echo    - モダンブラウザ（Chrome、Firefox、Safari、Edge）
echo.
echo 🔧 詳細情報:
echo    - DEPLOYMENT_GUIDE.md
echo    - API_REFERENCE.md
echo    - test-functionality.html
echo.
pause
goto end

:end
echo.
echo プログラムを終了します。
pause