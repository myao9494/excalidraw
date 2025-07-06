import pytest
import json
import os
import tempfile
from datetime import datetime
from unittest.mock import Mock, patch

from services.backup_manager import BackupManager, BackupConfig


class TestBackupManager:
    def setup_method(self):
        """テストメソッドの前に実行される"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = BackupConfig(
            max_backups=3,
            enabled=True,
            backup_on_save=True,
            backup_on_auto_save=True
        )
        self.backup_manager = BackupManager(self.temp_dir, self.config)

    def teardown_method(self):
        """テストメソッドの後に実行される"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_init_with_default_config(self):
        """デフォルト設定でのインスタンス化をテスト"""
        manager = BackupManager(self.temp_dir)
        assert manager.config.max_backups == 3
        assert manager.config.enabled is True
        assert manager.config.backup_on_save is True
        assert manager.config.backup_on_auto_save is True

    def test_init_with_custom_config(self):
        """カスタム設定でのインスタンス化をテスト"""
        custom_config = BackupConfig(
            max_backups=5,
            enabled=False,
            backup_on_save=False,
            backup_on_auto_save=False
        )
        manager = BackupManager(self.temp_dir, custom_config)
        assert manager.config.max_backups == 5
        assert manager.config.enabled is False
        assert manager.config.backup_on_save is False
        assert manager.config.backup_on_auto_save is False

    def test_generate_backup_filename(self):
        """バックアップファイル名生成のテスト"""
        filename = "test.excalidraw"
        result = self.backup_manager.generate_backup_filename(filename)
        
        # パターンマッチングでタイムスタンプ形式を確認
        import re
        pattern = r"^test\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.excalidraw$"
        assert re.match(pattern, result)

    def test_generate_backup_filename_no_extension(self):
        """拡張子なしファイル名でのバックアップファイル名生成のテスト"""
        filename = "test"
        result = self.backup_manager.generate_backup_filename(filename)
        
        import re
        pattern = r"^test\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$"
        assert re.match(pattern, result)

    def test_generate_backup_filename_complex(self):
        """複雑なファイル名でのバックアップファイル名生成のテスト"""
        filename = "my-complex.file.name.excalidraw"
        result = self.backup_manager.generate_backup_filename(filename)
        
        import re
        pattern = r"^my-complex\.file\.name\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.excalidraw$"
        assert re.match(pattern, result)

    def test_is_backup_file(self):
        """バックアップファイル判定のテスト"""
        assert self.backup_manager.is_backup_file("test.backup.2023-12-01-10-30-45.excalidraw")
        assert self.backup_manager.is_backup_file("test.backup.2023-12-01-10-30-45")
        assert not self.backup_manager.is_backup_file("test.excalidraw")
        assert not self.backup_manager.is_backup_file("test.backup.txt")
        assert not self.backup_manager.is_backup_file("backup.excalidraw")

    def test_get_backup_files(self):
        """バックアップファイル一覧取得のテスト"""
        # バックアップディレクトリを作成
        backup_dir = os.path.join(self.temp_dir, "backup")
        os.makedirs(backup_dir, exist_ok=True)
        
        # テストファイルを作成
        main_files = ["test.excalidraw", "other.excalidraw"]
        backup_files = [
            "test.backup.2023-12-01-10-30-45.excalidraw",
            "test.backup.2023-12-01-10-25-30.excalidraw",
            "other.backup.2023-12-01-10-20-15.excalidraw",
        ]
        
        # メインファイルを作成
        for filename in main_files:
            with open(os.path.join(self.temp_dir, filename), 'w') as f:
                f.write('{}')
                
        # バックアップファイルを作成
        for filename in backup_files:
            with open(os.path.join(backup_dir, filename), 'w') as f:
                f.write('{}')

        result = self.backup_manager.get_backup_files("test.excalidraw")
        expected = [
            "test.backup.2023-12-01-10-30-45.excalidraw",
            "test.backup.2023-12-01-10-25-30.excalidraw",
        ]
        
        assert sorted(result) == sorted(expected)

    def test_get_backup_files_empty(self):
        """バックアップファイルが存在しない場合のテスト"""
        with open(os.path.join(self.temp_dir, "test.excalidraw"), 'w') as f:
            f.write('{}')

        result = self.backup_manager.get_backup_files("test.excalidraw")
        assert result == []

    def test_create_backup_success(self):
        """バックアップ作成成功のテスト"""
        # 既存ファイルを作成
        original_content = json.dumps({"elements": [], "appState": {}})
        original_file = os.path.join(self.temp_dir, "test.excalidraw")
        with open(original_file, 'w') as f:
            f.write(original_content)

        # バックアップを作成
        backup_file = self.backup_manager.create_backup("test.excalidraw")
        
        # バックアップファイルが作成されたことを確認
        assert backup_file is not None
        backup_dir = os.path.join(self.temp_dir, "backup")
        assert os.path.exists(os.path.join(backup_dir, backup_file))
        
        # バックアップファイルの内容が元ファイルと同じことを確認
        with open(os.path.join(backup_dir, backup_file), 'r') as f:
            backup_content = f.read()
        assert backup_content == original_content

    def test_create_backup_file_not_exists(self):
        """存在しないファイルのバックアップ作成のテスト"""
        result = self.backup_manager.create_backup("nonexistent.excalidraw")
        assert result is None

    def test_create_backup_disabled(self):
        """バックアップ無効時のテスト"""
        disabled_config = BackupConfig(enabled=False)
        manager = BackupManager(self.temp_dir, disabled_config)
        
        # 既存ファイルを作成
        original_file = os.path.join(self.temp_dir, "test.excalidraw")
        with open(original_file, 'w') as f:
            f.write('{}')

        result = manager.create_backup("test.excalidraw")
        assert result is None

    def test_cleanup_old_backups(self):
        """古いバックアップファイルのクリーンアップのテスト"""
        # バックアップディレクトリを作成
        backup_dir = os.path.join(self.temp_dir, "backup")
        os.makedirs(backup_dir, exist_ok=True)
        
        # 5つのバックアップファイルを作成（制限は3個）
        backup_files = [
            "test.backup.2023-12-01-10-30-45.excalidraw",
            "test.backup.2023-12-01-10-25-30.excalidraw",
            "test.backup.2023-12-01-10-20-15.excalidraw",
            "test.backup.2023-12-01-10-15-00.excalidraw",
            "test.backup.2023-12-01-10-10-00.excalidraw",
        ]
        
        for filename in backup_files:
            with open(os.path.join(backup_dir, filename), 'w') as f:
                f.write('{}')

        # クリーンアップを実行
        self.backup_manager.cleanup_old_backups("test.excalidraw")
        
        # 最新の3つのファイルのみ残っていることを確認
        remaining_files = [f for f in os.listdir(backup_dir) if self.backup_manager.is_backup_file(f)]
        assert len(remaining_files) == 3
        
        # 古いファイルが削除されていることを確認
        assert not os.path.exists(os.path.join(backup_dir, "test.backup.2023-12-01-10-15-00.excalidraw"))
        assert not os.path.exists(os.path.join(backup_dir, "test.backup.2023-12-01-10-10-00.excalidraw"))

    def test_cleanup_old_backups_under_limit(self):
        """制限内でのクリーンアップのテスト"""
        # バックアップディレクトリを作成
        backup_dir = os.path.join(self.temp_dir, "backup")
        os.makedirs(backup_dir, exist_ok=True)
        
        # 2つのバックアップファイルを作成（制限は3個）
        backup_files = [
            "test.backup.2023-12-01-10-30-45.excalidraw",
            "test.backup.2023-12-01-10-25-30.excalidraw",
        ]
        
        for filename in backup_files:
            with open(os.path.join(backup_dir, filename), 'w') as f:
                f.write('{}')

        # クリーンアップを実行
        self.backup_manager.cleanup_old_backups("test.excalidraw")
        
        # すべてのファイルが残っていることを確認
        remaining_files = [f for f in os.listdir(backup_dir) if self.backup_manager.is_backup_file(f)]
        assert len(remaining_files) == 2

    def test_save_with_backup(self):
        """バックアップ付き保存のテスト"""
        # 既存ファイルを作成
        original_content = json.dumps({"elements": [], "appState": {}})
        original_file = os.path.join(self.temp_dir, "test.excalidraw")
        with open(original_file, 'w') as f:
            f.write(original_content)

        # 新しい内容で保存
        new_content = json.dumps({"elements": [{"id": "1"}], "appState": {}})
        self.backup_manager.save_with_backup("test.excalidraw", new_content)
        
        # バックアップファイルが作成されたことを確認
        backup_files = self.backup_manager.get_backup_files("test.excalidraw")
        assert len(backup_files) == 1
        
        # バックアップファイルの内容が元の内容と同じことを確認
        backup_dir = os.path.join(self.temp_dir, "backup")
        with open(os.path.join(backup_dir, backup_files[0]), 'r') as f:
            backup_content = f.read()
        assert backup_content == original_content
        
        # メインファイルが新しい内容で更新されていることを確認
        with open(original_file, 'r') as f:
            updated_content = f.read()
        assert updated_content == new_content

    def test_save_with_backup_new_file(self):
        """新規ファイルのバックアップ付き保存のテスト"""
        new_content = json.dumps({"elements": [{"id": "1"}], "appState": {}})
        self.backup_manager.save_with_backup("new_test.excalidraw", new_content)
        
        # バックアップファイルが作成されていないことを確認
        backup_files = self.backup_manager.get_backup_files("new_test.excalidraw")
        assert len(backup_files) == 0
        
        # メインファイルが作成されていることを確認
        main_file = os.path.join(self.temp_dir, "new_test.excalidraw")
        assert os.path.exists(main_file)
        
        with open(main_file, 'r') as f:
            content = f.read()
        assert content == new_content

    def test_update_config(self):
        """設定更新のテスト"""
        new_config = BackupConfig(
            max_backups=5,
            enabled=False,
            backup_on_save=False,
            backup_on_auto_save=True
        )
        
        self.backup_manager.update_config(new_config)
        
        assert self.backup_manager.config.max_backups == 5
        assert self.backup_manager.config.enabled is False
        assert self.backup_manager.config.backup_on_save is False
        assert self.backup_manager.config.backup_on_auto_save is True

    def test_get_backup_info(self):
        """バックアップ情報取得のテスト"""
        # バックアップディレクトリを作成
        backup_dir = os.path.join(self.temp_dir, "backup")
        os.makedirs(backup_dir, exist_ok=True)
        
        # バックアップファイルを作成
        backup_files = [
            "test.backup.2023-12-01-10-30-45.excalidraw",
            "test.backup.2023-12-01-10-25-30.excalidraw",
        ]
        
        for filename in backup_files:
            with open(os.path.join(backup_dir, filename), 'w') as f:
                f.write('{}')

        info = self.backup_manager.get_backup_info("test.excalidraw")
        
        assert info["filename"] == "test.excalidraw"
        assert info["backup_count"] == 2
        assert info["max_backups"] == 3
        assert len(info["backups"]) == 2
        
        # バックアップファイルが新しい順にソートされていることを確認
        assert info["backups"][0]["filename"] == "test.backup.2023-12-01-10-30-45.excalidraw"
        assert info["backups"][1]["filename"] == "test.backup.2023-12-01-10-25-30.excalidraw"