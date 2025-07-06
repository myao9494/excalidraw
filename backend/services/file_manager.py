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

logger = logging.getLogger(__name__)


class FileManager:
    """ファイル管理クラス"""
    
    def __init__(self, base_path: Optional[str] = None):
        """
        初期化
        
        Args:
            base_path: ベースパス（指定されない場合は現在のディレクトリ）
        """
        self.base_path = Path(base_path) if base_path else Path.cwd()
        self.allowed_extensions = {'.excalidraw'}
        
    def _is_safe_path(self, path: str) -> bool:
        """
        安全なパスかどうかチェック
        
        Args:
            path: チェックするパス
            
        Returns:
            bool: 安全なパスの場合True
        """
        try:
            # 絶対パスに変換
            abs_path = Path(path).resolve()
            
            # ベースパス外へのアクセスを防ぐ
            if self.base_path.resolve() not in abs_path.parents and abs_path != self.base_path.resolve():
                return False
                
            # 危険なパターンチェック
            dangerous_patterns = ['..', '~', '$', '`', '|', '&', ';']
            for pattern in dangerous_patterns:
                if pattern in str(abs_path):
                    return False
                    
            return True
            
        except Exception as e:
            logger.error(f"パス検証エラー: {e}")
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
    
    async def list_directory(self, directory_path: str = "") -> DirectoryListing:
        """
        ディレクトリ一覧を取得
        
        Args:
            directory_path: ディレクトリパス
            
        Returns:
            DirectoryListing: ディレクトリ一覧
            
        Raises:
            ValueError: 不正なパス
            FileNotFoundError: ディレクトリが存在しない
        """
        if not directory_path:
            target_path = self.base_path
        else:
            target_path = Path(directory_path)
            
        if not self._is_safe_path(str(target_path)):
            raise ValueError("不正なパスです")
            
        if not target_path.exists():
            raise FileNotFoundError(f"ディレクトリが見つかりません: {target_path}")
            
        if not target_path.is_dir():
            raise ValueError(f"指定されたパスはディレクトリではありません: {target_path}")
        
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
    
    async def load_file(self, file_path: str) -> FileLoadResponse:
        """
        ファイルを読み込み
        
        Args:
            file_path: ファイルパス（base_pathからの相対パス）
            
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
        
        if not self._is_safe_path(str(target_path)):
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
    
    async def save_file(self, file_path: str, content: str, create_directories: bool = True) -> FileSaveResponse:
        """
        ファイルを保存
        
        Args:
            file_path: 保存先ファイルパス（base_pathからの相対パス）
            content: 保存内容
            create_directories: ディレクトリが存在しない場合の自動作成
            
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
        
        if not self._is_safe_path(str(target_path)):
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
            async with aiofiles.open(target_path, 'w', encoding='utf-8') as f:
                await f.write(content)
                
            file_info = self._get_file_info(target_path)
            
            return FileSaveResponse(
                file_info=file_info,
                success=True,
                message=f"ファイルを保存しました: {target_path}"
            )
            
        except Exception as e:
            logger.error(f"ファイル保存エラー: {e}")
            raise
    
    async def delete_file(self, file_path: str) -> FileDeleteResponse:
        """
        ファイルを削除
        
        Args:
            file_path: 削除するファイルパス（base_pathからの相対パス）
            
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
        
        if not self._is_safe_path(str(target_path)):
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
    
    async def create_directory(self, directory_path: str) -> bool:
        """
        ディレクトリを作成
        
        Args:
            directory_path: 作成するディレクトリパス（base_pathからの相対パス）
            
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
        
        if not self._is_safe_path(str(target_path)):
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