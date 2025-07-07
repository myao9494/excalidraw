import os
import json
import aiofiles
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from models.schemas import (
    FileInfo, DirectoryListing, FileLoadResponse, FileSaveResponse,
    FileDeleteResponse, ErrorResponse
)
from services.backup_manager import BackupManager, BackupConfig

logger = logging.getLogger(__name__)


class FileManager:
    """ファイル管理クラス"""
    
    def __init__(self, base_path: Optional[str] = None, backup_config: Optional[BackupConfig] = None):
        """
        初期化
        
        Args:
            base_path: ベースパス（指定されない場合は現在のディレクトリ）
            backup_config: バックアップ設定
        """
        self.base_path = Path(base_path) if base_path else Path.cwd()
        self.allowed_extensions = {'.excalidraw'}
        self.backup_manager = BackupManager(str(self.base_path), backup_config)
        
    def _normalize_path(self, path: str) -> str:
        """
        パスを正規化（URLデコード対応）
        
        Args:
            path: 正規化するパス
            
        Returns:
            str: 正規化されたパス
        """
        import urllib.parse
        
        # URLエンコードされている場合はデコード
        if '%' in path:
            try:
                # 一度だけデコードを試行
                decoded = urllib.parse.unquote(path)
                # デコード結果が元と異なる場合のみ使用
                if decoded != path:
                    path = decoded
            except Exception:
                # デコードに失敗した場合は元のパスを使用
                pass
        
        return path

    def _sanitize_path(self, path: str) -> str:
        """
        パスをサニタイズ（ログ出力用）
        
        Args:
            path: サニタイズするパス
            
        Returns:
            str: サニタイズされたパス
        """
        # URLエンコードされた文字を制限
        if '%' in path and len(path) > 50:
            return f"[長すぎるパス: {len(path)}文字]"
        
        # 連続する%を制限
        if '%%' in path:
            return f"[不正なエンコード: {path[:20]}...]"
            
        return path

    def _is_windows_path(self, path: str) -> bool:
        """
        Windowsパスかどうか判定
        
        Args:
            path: チェックするパス
            
        Returns:
            bool: Windowsパスの場合True
        """
        # Windowsパスの特徴: C:\ または \\server\share で始まる
        return (len(path) >= 3 and path[1:3] == ':\\') or path.startswith('\\\\')

    def _is_safe_path(self, path: str, base_folder: Optional[str] = None) -> bool:
        """
        安全なパスかどうかチェック
        
        Args:
            path: チェックするパス
            base_folder: ベースフォルダ（指定された場合はそれを基準とする）
            
        Returns:
            bool: 安全なパスの場合True
        """
        try:
            # パスを正規化（URLデコード対応）
            normalized_path = self._normalize_path(path)
            
            # ベースフォルダが指定された場合はそれを使用
            if base_folder:
                normalized_base_folder = self._normalize_path(base_folder)
                
                # Windowsパスの場合は特別処理
                if self._is_windows_path(normalized_base_folder):
                    # Unix系OSでWindowsパスを処理する場合
                    # 文字列ベースでパス検証を行う
                    if not normalized_path:
                        # 空の場合はbase_folderそのもの
                        target_path_str = normalized_base_folder
                    elif self._is_windows_path(normalized_path):
                        # 絶対パスの場合はそのまま使用
                        target_path_str = normalized_path
                    else:
                        # 相対パスの場合はbase_folderと結合
                        target_path_str = normalized_base_folder.rstrip('\\') + '\\' + normalized_path
                    
                    # 文字列ベースの安全性チェック
                    if not target_path_str.startswith(normalized_base_folder):
                        logger.warning(f"不正なパスアクセス試行: {self._sanitize_path(path)}")
                        return False
                        
                    # 危険なパターンチェック
                    dangerous_patterns = ['..', '~', '$', '`', '|', '&', ';']
                    for pattern in dangerous_patterns:
                        if pattern in target_path_str:
                            logger.warning(f"危険なパターン検出: {self._sanitize_path(path)}")
                            return False
                            
                    return True
                else:
                    # Unix系パスの場合は従来通り
                    base_path = Path(normalized_base_folder).resolve()
                    if not Path(normalized_path).is_absolute():
                        abs_path = (base_path / normalized_path).resolve()
                    else:
                        abs_path = Path(normalized_path).resolve()
                        
                    if base_path not in abs_path.parents and abs_path != base_path:
                        logger.warning(f"不正なパスアクセス試行: {self._sanitize_path(path)}")
                        return False
                        
                    dangerous_patterns = ['..', '~', '$', '`', '|', '&', ';']
                    for pattern in dangerous_patterns:
                        if pattern in str(abs_path):
                            logger.warning(f"危険なパターン検出: {self._sanitize_path(path)}")
                            return False
                            
                    return True
            else:
                # 従来通りself.base_pathを使用
                base_path = self.base_path.resolve()
                abs_path = Path(normalized_path).resolve()
                
                if base_path not in abs_path.parents and abs_path != base_path:
                    logger.warning(f"不正なパスアクセス試行: {self._sanitize_path(path)}")
                    return False
                    
                dangerous_patterns = ['..', '~', '$', '`', '|', '&', ';']
                for pattern in dangerous_patterns:
                    if pattern in str(abs_path):
                        logger.warning(f"危険なパターン検出: {self._sanitize_path(path)}")
                        return False
                        
                return True
            
        except Exception as e:
            logger.error(f"パス検証エラー: {self._sanitize_path(path)} - {e}")
            return False
    
    def _get_file_info(self, file_path: Path) -> FileInfo:
        """
        ファイル情報を取得
        
        Args:
            file_path: ファイルパス
            
        Returns:
            FileInfo: ファイル情報
        """
        stat = file_path.stat()
        
        return FileInfo(
            name=file_path.name,
            path=str(file_path),
            size=stat.st_size,
            modified=datetime.fromtimestamp(stat.st_mtime),
            is_directory=file_path.is_dir(),
            extension=file_path.suffix if file_path.suffix else None
        )
    
    async def list_directory(self, directory_path: str = "", base_folder: Optional[str] = None) -> DirectoryListing:
        """
        ディレクトリ一覧を取得
        
        Args:
            directory_path: ディレクトリパス
            base_folder: ベースフォルダ（指定された場合はそれを基準とする）
            
        Returns:
            DirectoryListing: ディレクトリ一覧
            
        Raises:
            ValueError: 不正なパス
            FileNotFoundError: ディレクトリが存在しない
        """
        # パスの正規化
        normalized_directory_path = self._normalize_path(directory_path) if directory_path else ""
        normalized_base_folder = self._normalize_path(base_folder) if base_folder else None
        
        # base_folderが指定されている場合はそれを基準とする
        if normalized_base_folder:
            if self._is_windows_path(normalized_base_folder):
                # Windowsパスの場合：Unix系OSでは実際のファイル操作はできないため、
                # モックレスポンスを返す
                if not self._is_safe_path(normalized_directory_path, normalized_base_folder):
                    raise ValueError("不正なパスです")
                
                # Windowsパスへのリクエストの場合は、エラーメッセージで対応
                raise FileNotFoundError(f"リモートWindowsパスへのアクセスはサポートされていません: {directory_path}")
            else:
                # Unix系パスの場合は従来通り
                base_path = Path(normalized_base_folder)
                if not normalized_directory_path:
                    target_path = base_path
                else:
                    if not Path(normalized_directory_path).is_absolute():
                        target_path = base_path / normalized_directory_path
                    else:
                        target_path = Path(normalized_directory_path)
                
                if not self._is_safe_path(str(target_path), normalized_base_folder):
                    raise ValueError("不正なパスです")
                    
                if not target_path.exists():
                    raise FileNotFoundError(f"ディレクトリが見つかりません: {directory_path}")
                    
                if not target_path.is_dir():
                    raise ValueError(f"指定されたパスはディレクトリではありません: {directory_path}")
        else:
            # 従来通りの処理
            if not normalized_directory_path:
                target_path = self.base_path
            else:
                target_path = Path(normalized_directory_path)
                
            if not self._is_safe_path(str(target_path), normalized_base_folder):
                raise ValueError("不正なパスです")
                
            if not target_path.exists():
                raise FileNotFoundError(f"ディレクトリが見つかりません: {directory_path}")
                
            if not target_path.is_dir():
                raise ValueError(f"指定されたパスはディレクトリではありません: {directory_path}")
        
        files = []
        
        try:
            # ディレクトリ内のファイル一覧を取得
            for item in target_path.iterdir():
                try:
                    # 隠しファイルをスキップ
                    if item.name.startswith('.'):
                        continue
                        
                    file_info = self._get_file_info(item)
                    files.append(file_info)
                    
                except PermissionError:
                    logger.warning(f"アクセス権限なし: {item}")
                    continue
                except Exception as e:
                    logger.error(f"ファイル情報取得エラー: {e}")
                    continue
            
            # ファイル名でソート
            files.sort(key=lambda x: (not x.is_directory, x.name.lower()))
            
            return DirectoryListing(
                current_path=str(target_path),
                files=files,
                total_count=len(files)
            )
            
        except Exception as e:
            logger.error(f"ディレクトリ一覧取得エラー: {e}")
            raise
    
    async def load_file(self, file_path: str, base_folder: Optional[str] = None) -> FileLoadResponse:
        """
        ファイルを読み込み
        
        Args:
            file_path: ファイルパス（base_pathからの相対パス）
            base_folder: ベースフォルダ（指定された場合はそれを基準とする）
            
        Returns:
            FileLoadResponse: ファイル読み込み結果
            
        Raises:
            ValueError: 不正なパス
            FileNotFoundError: ファイルが存在しない
        """
        # base_pathからの相対パスとして解釈
        if Path(file_path).is_absolute():
            target_path = Path(file_path)
        else:
            target_path = self.base_path / file_path
        
        if not self._is_safe_path(str(target_path), base_folder):
            raise ValueError("不正なパスです")
            
        if not target_path.exists():
            raise FileNotFoundError(f"ファイルが見つかりません: {target_path}")
            
        if not target_path.is_file():
            raise ValueError(f"指定されたパスはファイルではありません: {target_path}")
        
        # 拡張子チェック
        if target_path.suffix not in self.allowed_extensions:
            raise ValueError(f"サポートされていないファイル形式です: {target_path.suffix}")
        
        try:
            async with aiofiles.open(target_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                
            # JSONフォーマットの検証
            try:
                json.loads(content)
            except json.JSONDecodeError as e:
                raise ValueError(f"不正なJSONファイルです: {e}")
            
            file_info = self._get_file_info(target_path)
            
            return FileLoadResponse(
                content=content,
                file_info=file_info,
                success=True
            )
            
        except Exception as e:
            logger.error(f"ファイル読み込みエラー: {e}")
            raise
    
    async def save_file(self, file_path: str, content: str, create_directories: bool = True, base_folder: Optional[str] = None) -> FileSaveResponse:
        """
        ファイルを保存
        
        Args:
            file_path: 保存先ファイルパス（base_pathからの相対パス）
            content: 保存内容
            create_directories: ディレクトリが存在しない場合の自動作成
            base_folder: ベースフォルダ（指定された場合はそれを基準とする）
            
        Returns:
            FileSaveResponse: ファイル保存結果
            
        Raises:
            ValueError: 不正なパスまたは内容
        """
        # base_pathからの相対パスとして解釈
        if Path(file_path).is_absolute():
            target_path = Path(file_path)
        else:
            target_path = self.base_path / file_path
        
        if not self._is_safe_path(str(target_path), base_folder):
            raise ValueError("不正なパスです")
        
        # 拡張子チェック
        if target_path.suffix not in self.allowed_extensions:
            raise ValueError(f"サポートされていないファイル形式です: {target_path.suffix}")
        
        # JSONフォーマットの検証
        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"不正なJSONファイルです: {e}")
        
        # ディレクトリ作成
        if create_directories:
            target_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # バックアップ機能を使用してファイルを保存
            relative_path = target_path.relative_to(self.base_path)
            self.backup_manager.save_with_backup(str(relative_path), content)
            
            file_info = self._get_file_info(target_path)
            
            return FileSaveResponse(
                file_info=file_info,
                success=True,
                message=f"ファイルを保存しました: {target_path}"
            )
            
        except Exception as e:
            logger.error(f"ファイル保存エラー: {e}")
            raise
    
    async def delete_file(self, file_path: str, base_folder: Optional[str] = None) -> FileDeleteResponse:
        """
        ファイルを削除
        
        Args:
            file_path: 削除するファイルパス（base_pathからの相対パス）
            base_folder: ベースフォルダ（指定された場合はそれを基準とする）
            
        Returns:
            FileDeleteResponse: ファイル削除結果
            
        Raises:
            ValueError: 不正なパス
            FileNotFoundError: ファイルが存在しない
        """
        # base_pathからの相対パスとして解釈
        if Path(file_path).is_absolute():
            target_path = Path(file_path)
        else:
            target_path = self.base_path / file_path
        
        if not self._is_safe_path(str(target_path), base_folder):
            raise ValueError("不正なパスです")
            
        if not target_path.exists():
            raise FileNotFoundError(f"ファイルが見つかりません: {target_path}")
            
        if not target_path.is_file():
            raise ValueError(f"指定されたパスはファイルではありません: {target_path}")
        
        try:
            target_path.unlink()
            
            return FileDeleteResponse(
                success=True,
                message=f"ファイルを削除しました: {target_path}"
            )
            
        except Exception as e:
            logger.error(f"ファイル削除エラー: {e}")
            raise
    
    async def create_directory(self, directory_path: str, base_folder: Optional[str] = None) -> bool:
        """
        ディレクトリを作成
        
        Args:
            directory_path: 作成するディレクトリパス（base_pathからの相対パス）
            base_folder: ベースフォルダ（指定された場合はそれを基準とする）
            
        Returns:
            bool: 作成成功の場合True
            
        Raises:
            ValueError: 不正なパス
        """
        # base_pathからの相対パスとして解釈
        if Path(directory_path).is_absolute():
            target_path = Path(directory_path)
        else:
            target_path = self.base_path / directory_path
        
        if not self._is_safe_path(str(target_path), base_folder):
            raise ValueError("不正なパスです")
        
        try:
            target_path.mkdir(parents=True, exist_ok=True)
            return True
            
        except Exception as e:
            logger.error(f"ディレクトリ作成エラー: {e}")
            raise
    
    def get_absolute_path(self, relative_path: str) -> str:
        """
        相対パスから絶対パスを取得
        
        Args:
            relative_path: 相対パス
            
        Returns:
            str: 絶対パス
        """
        return str((self.base_path / relative_path).resolve())
    
    def update_backup_config(self, config: BackupConfig) -> None:
        """
        バックアップ設定を更新
        
        Args:
            config: 新しいバックアップ設定
        """
        self.backup_manager.update_config(config)
    
    def get_file_info(self, file_path: str, base_folder: Optional[str] = None) -> dict:
        """
        ファイル情報を取得
        
        Args:
            file_path: 情報を取得するファイルのパス
            base_folder: ベースフォルダ（指定された場合はそれを基準とする）
            
        Returns:
            dict: ファイル情報
            
        Raises:
            ValueError: 不正なパス
            FileNotFoundError: ファイルが存在しない
        """
        # base_pathからの相対パスとして解釈
        if Path(file_path).is_absolute():
            target_path = Path(file_path)
        else:
            target_path = self.base_path / file_path
        
        if not self._is_safe_path(str(target_path), base_folder):
            raise ValueError("不正なパスです")
            
        if not target_path.exists():
            raise FileNotFoundError(f"ファイルが見つかりません: {target_path}")
        
        file_info = self._get_file_info(target_path)
        
        return {
            "file_info": file_info.model_dump(),
            "absolute_path": str(target_path.resolve())
        }
        
    def get_backup_info(self, file_path: str) -> dict:
        """
        バックアップ情報を取得
        
        Args:
            file_path: ファイルパス
            
        Returns:
            dict: バックアップ情報
        """
        # base_pathからの相対パスとして解釈
        if Path(file_path).is_absolute():
            target_path = Path(file_path)
        else:
            target_path = self.base_path / file_path
        
        relative_path = target_path.relative_to(self.base_path)
        return self.backup_manager.get_backup_info(str(relative_path))
    
    def restore_from_backup(self, file_path: str, backup_filename: str) -> bool:
        """
        バックアップからファイルを復元
        
        Args:
            file_path: 復元先ファイルパス
            backup_filename: バックアップファイル名
            
        Returns:
            bool: 復元成功かどうか
        """
        # base_pathからの相対パスとして解釈
        if Path(file_path).is_absolute():
            target_path = Path(file_path)
        else:
            target_path = self.base_path / file_path
        
        relative_path = target_path.relative_to(self.base_path)
        return self.backup_manager.restore_from_backup(str(relative_path), backup_filename)
    
    def delete_backup(self, backup_filename: str) -> bool:
        """
        バックアップファイルを削除
        
        Args:
            backup_filename: バックアップファイル名
            
        Returns:
            bool: 削除成功かどうか
        """
        return self.backup_manager.delete_backup(backup_filename)