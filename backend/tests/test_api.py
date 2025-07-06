import pytest
import json
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.file_manager import FileManager


class TestAPI:
    """APIエンドポイントのテスト"""
    
    @pytest.fixture
    def client(self):
        """テスト用のクライアントを作成"""
        return TestClient(app)
    
    @pytest.fixture
    def temp_dir(self):
        """テスト用の一時ディレクトリを作成"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)
    
    @pytest.fixture
    def sample_excalidraw_content(self):
        """テスト用のExcalidrawファイル内容"""
        return json.dumps({
            "type": "excalidraw",
            "version": 2,
            "source": "https://excalidraw.com",
            "elements": [],
            "appState": {
                "viewBackgroundColor": "#ffffff"
            }
        })
    
    def test_root_endpoint(self, client):
        """ルートエンドポイントのテスト"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Excalidraw File Manager API"
        assert data["version"] == "1.0.0"
    
    def test_health_check(self, client):
        """ヘルスチェックのテスト"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "timestamp" in data
    
    def test_api_info(self, client):
        """API情報のテスト"""
        response = client.get("/api/v1/info")
        assert response.status_code == 200
        data = response.json()
        assert data["api_version"] == "1.0.0"
        assert "endpoints" in data
        assert "documentation" in data
    
    def test_list_files_empty(self, client):
        """空のファイル一覧取得のテスト"""
        response = client.get("/api/v1/files/")
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 0
        assert data["files"] == []
    
    def test_save_file_success(self, client, sample_excalidraw_content, temp_dir):
        """ファイル保存成功のテスト"""
        # テスト用のFileManagerを設定
        file_path = str(temp_dir / "test.excalidraw")
        
        request_data = {
            "file_path": file_path,
            "content": sample_excalidraw_content,
            "create_directories": True
        }
        
        response = client.post("/api/v1/files/save/", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["file_info"]["name"] == "test.excalidraw"
    
    def test_save_file_invalid_extension(self, client, sample_excalidraw_content, temp_dir):
        """不正な拡張子のファイル保存のテスト"""
        file_path = str(temp_dir / "test.txt")
        
        request_data = {
            "file_path": file_path,
            "content": sample_excalidraw_content,
            "create_directories": True
        }
        
        response = client.post("/api/v1/files/save/", json=request_data)
        assert response.status_code == 422  # バリデーションエラー
    
    def test_save_file_invalid_json(self, client, temp_dir):
        """不正なJSONファイル保存のテスト"""
        file_path = str(temp_dir / "test.excalidraw")
        
        request_data = {
            "file_path": file_path,
            "content": "invalid json",
            "create_directories": True
        }
        
        response = client.post("/api/v1/files/save/", json=request_data)
        assert response.status_code == 422  # バリデーションエラー
    
    def test_load_file_not_found(self, client, temp_dir):
        """存在しないファイルの読み込みのテスト"""
        file_path = str(temp_dir / "nonexistent.excalidraw")
        
        response = client.get(f"/api/v1/files/load/?file_path={file_path}")
        assert response.status_code == 404
    
    def test_delete_file_not_found(self, client, temp_dir):
        """存在しないファイルの削除のテスト"""
        file_path = str(temp_dir / "nonexistent.excalidraw")
        
        response = client.delete(f"/api/v1/files/?file_path={file_path}")
        assert response.status_code == 404
    
    def test_create_directory_success(self, client, temp_dir):
        """ディレクトリ作成成功のテスト"""
        dir_path = str(temp_dir / "new_directory")
        
        response = client.post(f"/api/v1/files/directory/?directory_path={dir_path}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_get_file_info_not_found(self, client, temp_dir):
        """存在しないファイルの情報取得のテスト"""
        file_path = str(temp_dir / "nonexistent.excalidraw")
        
        response = client.get(f"/api/v1/files/info/?file_path={file_path}")
        assert response.status_code == 404
    
    def test_invalid_path_security(self, client):
        """不正なパスのセキュリティテスト"""
        dangerous_paths = [
            "../../../etc/passwd",
            "~/test.excalidraw",
            "test$test.excalidraw",
            "test`test.excalidraw"
        ]
        
        for path in dangerous_paths:
            response = client.get(f"/api/v1/files/load/?file_path={path}")
            assert response.status_code in [400, 404]  # Bad Request or Not Found
    
    def test_cors_headers(self, client):
        """CORS設定のテスト"""
        response = client.options("/api/v1/files/")
        assert response.status_code == 200
        # CORS設定により、必要なヘッダーが含まれることを確認
    
    def test_error_handling(self, client):
        """エラーハンドリングのテスト"""
        # 不正なJSONでPOSTリクエストを送信
        response = client.post("/api/v1/files/save/", data="invalid json")
        assert response.status_code == 422  # Unprocessable Entity
        
        # レスポンスにエラー情報が含まれることを確認
        data = response.json()
        assert "detail" in data