import pytest
import asyncio
import tempfile
import json
from pathlib import Path
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.file_manager import FileManager
from models.schemas import FileInfo, DirectoryListing


class TestFileManager:
    """FileManagerクラスのテスト"""
    
    @pytest.fixture
    def temp_dir(self):
        """テスト用の一時ディレクトリを作成"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)
    
    @pytest.fixture
    def file_manager(self, temp_dir):
        """テスト用のFileManagerインスタンスを作成"""
        return FileManager(str(temp_dir))
    
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
    
    def test_init(self, temp_dir):
        """初期化のテスト"""
        file_manager = FileManager(str(temp_dir))
        assert file_manager.base_path == temp_dir
        assert file_manager.allowed_extensions == {'.excalidraw'}
    
    def test_is_safe_path_valid(self, file_manager, temp_dir):
        """安全なパスのテスト"""
        safe_path = str(temp_dir / "test.excalidraw")
        assert file_manager._is_safe_path(safe_path) is True
    
    def test_is_safe_path_invalid(self, file_manager):
        """不安全なパスのテスト"""
        dangerous_paths = [
            "../../../etc/passwd",
            "~/test.excalidraw",
            "test$test.excalidraw",
            "test`test.excalidraw",
            "test|test.excalidraw",
            "test&test.excalidraw",
            "test;test.excalidraw"
        ]
        
        for path in dangerous_paths:
            assert file_manager._is_safe_path(path) is False
    
    def test_get_file_info(self, file_manager, temp_dir, sample_excalidraw_content):
        """ファイル情報取得のテスト"""
        test_file = temp_dir / "test.excalidraw"
        test_file.write_text(sample_excalidraw_content)
        
        file_info = file_manager._get_file_info(test_file)
        
        assert isinstance(file_info, FileInfo)
        assert file_info.name == "test.excalidraw"
        assert file_info.extension == ".excalidraw"
        assert file_info.is_directory is False
        assert file_info.size > 0
        assert isinstance(file_info.modified, datetime)
    
    @pytest.mark.asyncio
    async def test_list_directory_empty(self, file_manager):
        """空のディレクトリ一覧取得のテスト"""
        result = await file_manager.list_directory()
        
        assert isinstance(result, DirectoryListing)
        assert result.total_count == 0
        assert result.files == []
    
    @pytest.mark.asyncio
    async def test_list_directory_with_files(self, file_manager, temp_dir, sample_excalidraw_content):
        """ファイルがあるディレクトリ一覧取得のテスト"""
        # テストファイルを作成
        test_file1 = temp_dir / "test1.excalidraw"
        test_file2 = temp_dir / "test2.excalidraw"
        test_dir = temp_dir / "subdir"
        
        test_file1.write_text(sample_excalidraw_content)
        test_file2.write_text(sample_excalidraw_content)
        test_dir.mkdir()
        
        result = await file_manager.list_directory()
        
        assert isinstance(result, DirectoryListing)
        assert result.total_count == 3
        assert len(result.files) == 3
        
        # ファイル名がソートされていることを確認
        file_names = [f.name for f in result.files]
        assert file_names == ["subdir", "test1.excalidraw", "test2.excalidraw"]
    
    @pytest.mark.asyncio
    async def test_list_directory_nonexistent(self, file_manager):
        """存在しないディレクトリのテスト"""
        with pytest.raises(FileNotFoundError):
            await file_manager.list_directory("/nonexistent/path")
    
    @pytest.mark.asyncio
    async def test_save_file(self, file_manager, temp_dir, sample_excalidraw_content):
        """ファイル保存のテスト"""
        file_path = str(temp_dir / "test_save.excalidraw")
        
        result = await file_manager.save_file(file_path, sample_excalidraw_content)
        
        assert result.success is True
        assert result.file_info.name == "test_save.excalidraw"
        assert Path(file_path).exists()
        
        # ファイル内容を確認
        saved_content = Path(file_path).read_text()
        assert saved_content == sample_excalidraw_content
    
    @pytest.mark.asyncio
    async def test_save_file_with_directory_creation(self, file_manager, temp_dir, sample_excalidraw_content):
        """ディレクトリ作成を伴うファイル保存のテスト"""
        file_path = str(temp_dir / "new_dir" / "test_save.excalidraw")
        
        result = await file_manager.save_file(file_path, sample_excalidraw_content, create_directories=True)
        
        assert result.success is True
        assert Path(file_path).exists()
        assert Path(file_path).parent.exists()
    
    @pytest.mark.asyncio
    async def test_save_file_invalid_extension(self, file_manager, temp_dir, sample_excalidraw_content):
        """不正な拡張子のファイル保存のテスト"""
        file_path = str(temp_dir / "test.txt")
        
        with pytest.raises(ValueError, match="サポートされていないファイル形式"):
            await file_manager.save_file(file_path, sample_excalidraw_content)
    
    @pytest.mark.asyncio
    async def test_save_file_invalid_json(self, file_manager, temp_dir):
        """不正なJSONファイル保存のテスト"""
        file_path = str(temp_dir / "test.excalidraw")
        invalid_json = "invalid json content"
        
        with pytest.raises(ValueError, match="不正なJSONファイル"):
            await file_manager.save_file(file_path, invalid_json)
    
    @pytest.mark.asyncio
    async def test_load_file(self, file_manager, temp_dir, sample_excalidraw_content):
        """ファイル読み込みのテスト"""
        file_path = str(temp_dir / "test_load.excalidraw")
        Path(file_path).write_text(sample_excalidraw_content)
        
        result = await file_manager.load_file(file_path)
        
        assert result.success is True
        assert result.content == sample_excalidraw_content
        assert result.file_info.name == "test_load.excalidraw"
    
    @pytest.mark.asyncio
    async def test_load_file_nonexistent(self, file_manager, temp_dir):
        """存在しないファイルの読み込みのテスト"""
        file_path = str(temp_dir / "nonexistent.excalidraw")
        
        with pytest.raises(FileNotFoundError):
            await file_manager.load_file(file_path)
    
    @pytest.mark.asyncio
    async def test_load_file_invalid_extension(self, file_manager, temp_dir):
        """不正な拡張子のファイル読み込みのテスト"""
        file_path = str(temp_dir / "test.txt")
        Path(file_path).write_text("test content")
        
        with pytest.raises(ValueError, match="サポートされていないファイル形式"):
            await file_manager.load_file(file_path)
    
    @pytest.mark.asyncio
    async def test_delete_file(self, file_manager, temp_dir, sample_excalidraw_content):
        """ファイル削除のテスト"""
        file_path = str(temp_dir / "test_delete.excalidraw")
        Path(file_path).write_text(sample_excalidraw_content)
        
        result = await file_manager.delete_file(file_path)
        
        assert result.success is True
        assert not Path(file_path).exists()
    
    @pytest.mark.asyncio
    async def test_delete_file_nonexistent(self, file_manager, temp_dir):
        """存在しないファイルの削除のテスト"""
        file_path = str(temp_dir / "nonexistent.excalidraw")
        
        with pytest.raises(FileNotFoundError):
            await file_manager.delete_file(file_path)
    
    @pytest.mark.asyncio
    async def test_create_directory(self, file_manager, temp_dir):
        """ディレクトリ作成のテスト"""
        dir_path = str(temp_dir / "new_directory")
        
        result = await file_manager.create_directory(dir_path)
        
        assert result is True
        assert Path(dir_path).exists()
        assert Path(dir_path).is_dir()
    
    @pytest.mark.asyncio
    async def test_create_directory_nested(self, file_manager, temp_dir):
        """ネストしたディレクトリ作成のテスト"""
        dir_path = str(temp_dir / "level1" / "level2" / "level3")
        
        result = await file_manager.create_directory(dir_path)
        
        assert result is True
        assert Path(dir_path).exists()
        assert Path(dir_path).is_dir()
    
    def test_get_absolute_path(self, file_manager, temp_dir):
        """絶対パス取得のテスト"""
        relative_path = "test.excalidraw"
        absolute_path = file_manager.get_absolute_path(relative_path)
        
        expected_path = str((temp_dir / relative_path).resolve())
        assert absolute_path == expected_path