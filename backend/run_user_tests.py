#!/usr/bin/env python3
"""
ユーザーテスト実行スクリプト
FastAPIサーバーを起動して基本的なテストを実行します
"""

import json
import time
import subprocess
import requests
import threading
import signal
import sys
from pathlib import Path

SERVER_URL = "http://localhost:8000"
SERVER_PROCESS = None

def start_server():
    """FastAPIサーバーを起動"""
    global SERVER_PROCESS
    print("🚀 FastAPIサーバーを起動中...")
    
    # サーバーをバックグラウンドで起動
    SERVER_PROCESS = subprocess.Popen(
        [sys.executable, "main.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # サーバーの起動を待つ
    for _ in range(30):  # 30秒間待機
        try:
            response = requests.get(f"{SERVER_URL}/health", timeout=1)
            if response.status_code == 200:
                print("✅ サーバーが正常に起動しました")
                return True
        except requests.exceptions.RequestException:
            time.sleep(1)
    
    print("❌ サーバーの起動に失敗しました")
    return False

def stop_server():
    """FastAPIサーバーを停止"""
    global SERVER_PROCESS
    if SERVER_PROCESS:
        print("🛑 サーバーを停止中...")
        SERVER_PROCESS.terminate()
        SERVER_PROCESS.wait()
        print("✅ サーバーを停止しました")

def signal_handler(sig, frame):
    """シグナルハンドラー（Ctrl+C対応）"""
    print("\n\n🛑 テストを中断します...")
    stop_server()
    sys.exit(0)

def run_test(test_name, test_func):
    """テストを実行"""
    print(f"\n🧪 {test_name}")
    print("-" * 50)
    try:
        result = test_func()
        if result:
            print(f"✅ {test_name} - 成功")
        else:
            print(f"❌ {test_name} - 失敗")
        return result
    except Exception as e:
        print(f"❌ {test_name} - エラー: {e}")
        return False

def test_basic_endpoints():
    """基本エンドポイントのテスト"""
    try:
        # ルートエンドポイント
        response = requests.get(f"{SERVER_URL}/")
        print(f"GET / : {response.status_code}")
        print(f"レスポンス: {response.json()}")
        
        # ヘルスチェック
        response = requests.get(f"{SERVER_URL}/health")
        print(f"GET /health : {response.status_code}")
        print(f"レスポンス: {response.json()}")
        
        # API情報
        response = requests.get(f"{SERVER_URL}/api/v1/info")
        print(f"GET /api/v1/info : {response.status_code}")
        print(f"レスポンス: {response.json()}")
        
        return True
    except Exception as e:
        print(f"エラー: {e}")
        return False

def test_file_operations():
    """ファイル操作のテスト"""
    try:
        # テスト用のExcalidrawデータ
        test_content = {
            "type": "excalidraw",
            "version": 2,
            "source": "https://excalidraw.com",
            "elements": [
                {
                    "type": "rectangle",
                    "id": "test-rect-1",
                    "x": 100,
                    "y": 100,
                    "width": 200,
                    "height": 100,
                    "strokeColor": "#000000",
                    "backgroundColor": "transparent"
                }
            ],
            "appState": {
                "viewBackgroundColor": "#ffffff"
            }
        }
        
        test_filename = "user_test_drawing.excalidraw"
        
        # ファイル保存テスト
        save_data = {
            "file_path": test_filename,
            "content": json.dumps(test_content),
            "create_directories": True
        }
        
        response = requests.post(f"{SERVER_URL}/api/v1/files/save/", json=save_data)
        print(f"POST /api/v1/files/save/ : {response.status_code}")
        if response.status_code == 200:
            print(f"ファイル保存成功: {response.json()}")
        else:
            print(f"ファイル保存失敗: {response.text}")
            return False
        
        # ファイル読み込みテスト
        response = requests.get(f"{SERVER_URL}/api/v1/files/load/?file_path={test_filename}")
        print(f"GET /api/v1/files/load/ : {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"ファイル読み込み成功: {data['file_info']['name']}")
            
            # 内容の検証
            loaded_content = json.loads(data['content'])
            if loaded_content['type'] == 'excalidraw':
                print("✅ ファイル内容が正しく保存・読み込みされました")
            else:
                print("❌ ファイル内容が正しくありません")
                return False
        else:
            print(f"ファイル読み込み失敗: {response.text}")
            return False
        
        # ファイル一覧テスト
        response = requests.get(f"{SERVER_URL}/api/v1/files/")
        print(f"GET /api/v1/files/ : {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"ファイル一覧取得成功: {data['total_count']}個のファイル")
            
            # 保存したファイルが一覧に含まれているかチェック
            file_names = [f['name'] for f in data['files']]
            if test_filename in file_names:
                print("✅ 保存したファイルが一覧に表示されています")
            else:
                print("❌ 保存したファイルが一覧に見つかりません")
        
        # ファイル削除テスト
        response = requests.delete(f"{SERVER_URL}/api/v1/files/?file_path={test_filename}")
        print(f"DELETE /api/v1/files/ : {response.status_code}")
        if response.status_code == 200:
            print(f"ファイル削除成功: {response.json()}")
        else:
            print(f"ファイル削除失敗: {response.text}")
        
        return True
    except Exception as e:
        print(f"エラー: {e}")
        return False

def test_security_validation():
    """セキュリティ検証のテスト"""
    try:
        # 不正なパスでのテスト
        dangerous_paths = [
            "../../../etc/passwd",
            "~/test.excalidraw",
            "test$test.excalidraw",
            "test`test.excalidraw"
        ]
        
        for dangerous_path in dangerous_paths:
            save_data = {
                "file_path": dangerous_path,
                "content": '{"type":"excalidraw"}',
                "create_directories": False
            }
            
            response = requests.post(f"{SERVER_URL}/api/v1/files/save/", json=save_data)
            print(f"危険なパス '{dangerous_path}': {response.status_code}")
            
            if response.status_code == 422:  # Validation Error
                print("✅ セキュリティチェックが正常に動作")
            else:
                print("❌ セキュリティチェックが不十分")
                return False
        
        # 不正なファイル拡張子
        save_data = {
            "file_path": "test.txt",
            "content": "Hello World",
            "create_directories": False
        }
        
        response = requests.post(f"{SERVER_URL}/api/v1/files/save/", json=save_data)
        print(f"不正な拡張子 'test.txt': {response.status_code}")
        
        if response.status_code == 422:
            print("✅ 拡張子チェックが正常に動作")
        else:
            print("❌ 拡張子チェックが不十分")
            return False
        
        # 不正なJSON
        save_data = {
            "file_path": "invalid.excalidraw",
            "content": "invalid json content",
            "create_directories": False
        }
        
        response = requests.post(f"{SERVER_URL}/api/v1/files/save/", json=save_data)
        print(f"不正なJSON: {response.status_code}")
        
        if response.status_code == 400:  # サーバー側で処理時にJSONエラーになるので400が正常
            print("✅ JSONバリデーションが正常に動作")
        else:
            print("❌ JSONバリデーションが不十分")
            return False
        
        return True
    except Exception as e:
        print(f"エラー: {e}")
        return False

def main():
    """メイン関数"""
    print("=" * 60)
    print("🧪 Excalidraw File Manager API - ユーザーテスト")
    print("=" * 60)
    
    # シグナルハンドラーを設定
    signal.signal(signal.SIGINT, signal_handler)
    
    # サーバーを起動
    if not start_server():
        print("❌ サーバーの起動に失敗しました。テストを中止します。")
        return
    
    try:
        # テストを実行
        tests = [
            ("基本エンドポイントテスト", test_basic_endpoints),
            ("ファイル操作テスト", test_file_operations),
            ("セキュリティ検証テスト", test_security_validation)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            if run_test(test_name, test_func):
                passed += 1
        
        # 結果表示
        print("\n" + "=" * 60)
        print("🎯 テスト結果")
        print("=" * 60)
        print(f"実行: {total}, 成功: {passed}, 失敗: {total - passed}")
        
        if passed == total:
            print("🎉 すべてのテストが成功しました！")
            print("\n📖 より詳細なテストを行う場合は、以下のURLにアクセスしてください:")
            print(f"   Swagger UI: {SERVER_URL}/api/docs")
            print(f"   ReDoc: {SERVER_URL}/api/redoc")
        else:
            print("⚠️  いくつかのテストが失敗しました。詳細を確認してください。")
    
    finally:
        # サーバーを停止
        stop_server()

if __name__ == "__main__":
    main()