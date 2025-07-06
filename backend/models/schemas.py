from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path


class FileInfo(BaseModel):
    """ファイル情報のスキーマ"""
    name: str = Field(..., description="ファイル名")
    path: str = Field(..., description="ファイルパス")
    size: int = Field(..., description="ファイルサイズ（バイト）")
    modified: datetime = Field(..., description="最終更新日時")
    is_directory: bool = Field(..., description="ディレクトリかどうか")
    extension: Optional[str] = Field(None, description="ファイル拡張子")


class DirectoryListing(BaseModel):
    """ディレクトリ一覧のスキーマ"""
    current_path: str = Field(..., description="現在のパス")
    files: List[FileInfo] = Field(..., description="ファイル一覧")
    total_count: int = Field(..., description="総ファイル数")


class FileLoadRequest(BaseModel):
    """ファイル読み込みリクエストのスキーマ"""
    file_path: str = Field(..., description="読み込むファイルのパス")
    
    @field_validator('file_path')
    @classmethod
    def validate_file_path(cls, v):
        if not v.strip():
            raise ValueError("ファイルパスは空にできません")
        
        # セキュリティチェック: 危険なパスの検出
        dangerous_patterns = ['..', '~', '$', '`', '|', '&', ';']
        for pattern in dangerous_patterns:
            if pattern in v:
                raise ValueError(f"不正なパス文字が含まれています: {pattern}")
        
        return v


class FileLoadResponse(BaseModel):
    """ファイル読み込みレスポンスのスキーマ"""
    content: str = Field(..., description="ファイル内容")
    file_info: FileInfo = Field(..., description="ファイル情報")
    success: bool = Field(True, description="読み込み成功フラグ")


class FileSaveRequest(BaseModel):
    """ファイル保存リクエストのスキーマ"""
    file_path: str = Field(..., description="保存するファイルのパス")
    content: str = Field(..., description="保存するファイル内容")
    create_directories: bool = Field(True, description="ディレクトリが存在しない場合の自動作成")
    
    @field_validator('file_path')
    @classmethod
    def validate_file_path(cls, v):
        if not v.strip():
            raise ValueError("ファイルパスは空にできません")
        
        # セキュリティチェック: 危険なパスの検出
        dangerous_patterns = ['..', '~', '$', '`', '|', '&', ';']
        for pattern in dangerous_patterns:
            if pattern in v:
                raise ValueError(f"不正なパス文字が含まれています: {pattern}")
        
        # .excalidrawファイルかチェック
        if not v.endswith('.excalidraw'):
            raise ValueError("Excalidrawファイル(.excalidraw)のみサポートされています")
        
        return v


class FileSaveResponse(BaseModel):
    """ファイル保存レスポンスのスキーマ"""
    file_info: FileInfo = Field(..., description="保存されたファイル情報")
    success: bool = Field(True, description="保存成功フラグ")
    message: str = Field(..., description="結果メッセージ")


class FileDeleteRequest(BaseModel):
    """ファイル削除リクエストのスキーマ"""
    file_path: str = Field(..., description="削除するファイルのパス")
    
    @field_validator('file_path')
    @classmethod
    def validate_file_path(cls, v):
        if not v.strip():
            raise ValueError("ファイルパスは空にできません")
        
        # セキュリティチェック: 危険なパスの検出
        dangerous_patterns = ['..', '~', '$', '`', '|', '&', ';']
        for pattern in dangerous_patterns:
            if pattern in v:
                raise ValueError(f"不正なパス文字が含まれています: {pattern}")
        
        return v


class FileDeleteResponse(BaseModel):
    """ファイル削除レスポンスのスキーマ"""
    success: bool = Field(True, description="削除成功フラグ")
    message: str = Field(..., description="結果メッセージ")


class ErrorResponse(BaseModel):
    """エラーレスポンスのスキーマ"""
    error: str = Field(..., description="エラーの種類")
    message: str = Field(..., description="エラーメッセージ")
    details: Optional[Dict[str, Any]] = Field(None, description="詳細情報")


class HealthCheckResponse(BaseModel):
    """ヘルスチェックレスポンスのスキーマ"""
    status: str = Field(..., description="サービスステータス")
    timestamp: datetime = Field(..., description="チェック時刻")
    version: str = Field(..., description="APIバージョン")