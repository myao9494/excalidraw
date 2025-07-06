"""
バックアップマネージャー
ファイル保存時にバックアップを自動作成し、設定に応じて古いバックアップを削除する
"""

import os
import json
import shutil
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from pathlib import Path
import re


@dataclass
class BackupConfig:
    """バックアップ設定"""
    max_backups: int = 3
    enabled: bool = True
    backup_on_save: bool = True
    backup_on_auto_save: bool = True


class BackupManager:
    """バックアップマネージャー"""
    
    def __init__(self, base_path: str, config: Optional[BackupConfig] = None):
        self.base_path = Path(base_path)
        self.config = config or BackupConfig()
        
        # ベースパスが存在しない場合は作成
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def generate_backup_filename(self, filename: str) -> str:
        """バックアップファイル名を生成する"""
        now = datetime.now()
        timestamp = now.strftime("%Y-%m-%d-%H-%M-%S")
        
        # 拡張子を分離
        path = Path(filename)
        if path.suffix:
            name = path.stem
            extension = path.suffix
            return f"{name}.backup.{timestamp}{extension}"
        else:
            return f"{filename}.backup.{timestamp}"
    
    def is_backup_file(self, filename: str) -> bool:
        """バックアップファイルかどうかを判定する"""
        pattern = r"\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}(\.|$)"
        return bool(re.search(pattern, filename))
    
    def get_backup_files(self, filename: str) -> List[str]:
        """指定されたファイルのバックアップファイル一覧を取得する"""
        backup_dir = self.base_path / "backup"
        if not backup_dir.exists():
            return []
        
        # ベースファイル名を取得（拡張子を除く）
        base_name = Path(filename).stem
        
        backup_files = []
        for file_path in backup_dir.iterdir():
            if file_path.is_file() and self.is_backup_file(file_path.name):
                # バックアップファイルのベース名を取得
                backup_base = re.sub(r"\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}.*$", "", file_path.name)
                if backup_base == base_name:
                    backup_files.append(file_path.name)
        
        # 新しい順にソート
        return sorted(backup_files, reverse=True)
    
    def create_backup(self, filename: str) -> Optional[str]:
        """バックアップを作成する"""
        if not self.config.enabled:
            return None
        
        file_path = self.base_path / filename
        if not file_path.exists():
            return None
        
        try:
            backup_filename = self.generate_backup_filename(filename)
            
            # バックアップディレクトリを作成
            backup_dir = self.base_path / "backup"
            backup_dir.mkdir(exist_ok=True)
            
            backup_path = backup_dir / backup_filename
            
            # ファイルをコピー
            shutil.copy2(file_path, backup_path)
            
            return backup_filename
        except Exception as e:
            print(f"Failed to create backup: {e}")
            return None
    
    def cleanup_old_backups(self, filename: str) -> None:
        """古いバックアップファイルをクリーンアップする"""
        backup_files = self.get_backup_files(filename)
        
        if len(backup_files) <= self.config.max_backups:
            return
        
        # 削除対象のファイル（古いものから削除）
        files_to_delete = backup_files[self.config.max_backups:]
        backup_dir = self.base_path / "backup"
        
        for backup_file in files_to_delete:
            try:
                backup_path = backup_dir / backup_file
                backup_path.unlink()
            except Exception as e:
                print(f"Failed to delete old backup {backup_file}: {e}")
    
    def save_with_backup(self, filename: str, content: str) -> None:
        """バックアップ付きでファイルを保存する"""
        file_path = self.base_path / filename
        
        # 既存ファイルがある場合はバックアップを作成
        if file_path.exists() and self.config.enabled and self.config.backup_on_save:
            self.create_backup(filename)
        
        # メインファイルを保存
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            raise Exception(f"Failed to save file: {e}")
        
        # 古いバックアップをクリーンアップ
        if self.config.enabled:
            self.cleanup_old_backups(filename)
    
    def auto_save_with_backup(self, filename: str, content: str) -> None:
        """自動保存でバックアップ付きファイル保存を行う"""
        if not self.config.backup_on_auto_save:
            # 自動保存でバックアップを作成しない場合は通常の保存
            file_path = self.base_path / filename
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return
        
        # バックアップ付きで保存
        self.save_with_backup(filename, content)
    
    def update_config(self, new_config: BackupConfig) -> None:
        """設定を更新する"""
        self.config = new_config
    
    def get_backup_info(self, filename: str) -> Dict[str, Any]:
        """バックアップ情報を取得する"""
        backup_files = self.get_backup_files(filename)
        
        backups = []
        backup_dir = self.base_path / "backup"
        
        for backup_file in backup_files:
            backup_path = backup_dir / backup_file
            
            # タイムスタンプを抽出
            timestamp_match = re.search(r"\.backup\.(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})", backup_file)
            timestamp = timestamp_match.group(1) if timestamp_match else ""
            
            # ファイルサイズを取得
            try:
                size = backup_path.stat().st_size
            except:
                size = 0
            
            backups.append({
                "filename": backup_file,
                "timestamp": timestamp,
                "size": size
            })
        
        return {
            "filename": filename,
            "backup_count": len(backup_files),
            "max_backups": self.config.max_backups,
            "backups": backups
        }
    
    def restore_from_backup(self, filename: str, backup_filename: str) -> bool:
        """バックアップからファイルを復元する"""
        if not self.config.enabled:
            return False
        
        backup_dir = self.base_path / "backup"
        backup_path = backup_dir / backup_filename
        if not backup_path.exists():
            return False
        
        # バックアップファイルが指定されたファイルのものかチェック
        if backup_filename not in self.get_backup_files(filename):
            return False
        
        try:
            file_path = self.base_path / filename
            shutil.copy2(backup_path, file_path)
            return True
        except Exception as e:
            print(f"Failed to restore from backup: {e}")
            return False
    
    def delete_backup(self, backup_filename: str) -> bool:
        """指定されたバックアップファイルを削除する"""
        if not self.is_backup_file(backup_filename):
            return False
        
        try:
            backup_dir = self.base_path / "backup"
            backup_path = backup_dir / backup_filename
            backup_path.unlink()
            return True
        except Exception as e:
            print(f"Failed to delete backup: {e}")
            return False