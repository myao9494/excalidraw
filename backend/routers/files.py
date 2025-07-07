from fastapi import APIRouter, HTTPException, Query, Path, Depends
from typing import Optional
import logging
from services.file_manager import FileManager
from models.schemas import (
    DirectoryListing, FileLoadRequest, FileLoadResponse,
    FileSaveRequest, FileSaveResponse, FileDeleteRequest,
    FileDeleteResponse, ErrorResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/files",
    tags=["files"],
    responses={404: {"model": ErrorResponse}}
)

# FileManagerインスタンスを取得する依存関数
def get_file_manager(
    base_folder: Optional[str] = Query(None, description="ベースフォルダパス")
) -> FileManager:
    """FileManagerインスタンスを取得"""
    # デフォルトは現在のディレクトリ、base_folderが指定されていればそれを使用
    work_dir = base_folder if base_folder else None
    return FileManager(work_dir)


@router.get("/", response_model=DirectoryListing)
async def list_files(
    directory_path: Optional[str] = Query("", description="ディレクトリパス"),
    base_folder: Optional[str] = Query(None, description="ベースフォルダパス"),
    file_manager: FileManager = Depends(get_file_manager)
):
    """
    ファイル一覧を取得
    
    Args:
        directory_path: ディレクトリパス（空文字列の場合は現在のディレクトリ）
        base_folder: ベースフォルダパス
        file_manager: FileManagerインスタンス
        
    Returns:
        DirectoryListing: ディレクトリ一覧
        
    Raises:
        HTTPException: エラーが発生した場合
    """
    try:
        return await file_manager.list_directory(directory_path, base_folder)
        
    except ValueError as e:
        logger.error(f"不正なパス: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except FileNotFoundError as e:
        logger.error(f"ディレクトリが見つからない: {e}")
        raise HTTPException(status_code=404, detail=str(e))
        
    except PermissionError as e:
        logger.error(f"アクセス権限エラー: {e}")
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="サーバー内部エラー")


@router.get("/load/", response_model=FileLoadResponse)
async def load_file(
    file_path: str = Query(..., description="読み込むファイルのパス"),
    file_manager: FileManager = Depends(get_file_manager)
):
    """
    ファイルを読み込み
    
    Args:
        file_path: 読み込むファイルのパス
        file_manager: FileManagerインスタンス
        
    Returns:
        FileLoadResponse: ファイル読み込み結果
        
    Raises:
        HTTPException: エラーが発生した場合
    """
    try:
        return await file_manager.load_file(file_path)
        
    except ValueError as e:
        logger.error(f"不正なパスまたはファイル形式: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except FileNotFoundError as e:
        logger.error(f"ファイルが見つからない: {e}")
        raise HTTPException(status_code=404, detail=str(e))
        
    except PermissionError as e:
        logger.error(f"アクセス権限エラー: {e}")
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="サーバー内部エラー")


@router.post("/save/", response_model=FileSaveResponse)
async def save_file(
    request: FileSaveRequest,
    file_manager: FileManager = Depends(get_file_manager)
):
    """
    ファイルを保存
    
    Args:
        request: ファイル保存リクエスト
        file_manager: FileManagerインスタンス
        
    Returns:
        FileSaveResponse: ファイル保存結果
        
    Raises:
        HTTPException: エラーが発生した場合
    """
    try:
        return await file_manager.save_file(
            file_path=request.file_path,
            content=request.content,
            create_directories=request.create_directories
        )
        
    except ValueError as e:
        logger.error(f"不正なパスまたはファイル形式: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except PermissionError as e:
        logger.error(f"アクセス権限エラー: {e}")
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="サーバー内部エラー")


@router.delete("/", response_model=FileDeleteResponse)
async def delete_file(
    file_path: str = Query(..., description="削除するファイルのパス"),
    file_manager: FileManager = Depends(get_file_manager)
):
    """
    ファイルを削除
    
    Args:
        file_path: 削除するファイルのパス
        file_manager: FileManagerインスタンス
        
    Returns:
        FileDeleteResponse: ファイル削除結果
        
    Raises:
        HTTPException: エラーが発生した場合
    """
    try:
        return await file_manager.delete_file(file_path)
        
    except ValueError as e:
        logger.error(f"不正なパス: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except FileNotFoundError as e:
        logger.error(f"ファイルが見つからない: {e}")
        raise HTTPException(status_code=404, detail=str(e))
        
    except PermissionError as e:
        logger.error(f"アクセス権限エラー: {e}")
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="サーバー内部エラー")


@router.post("/directory/", response_model=dict)
async def create_directory(
    directory_path: str = Query(..., description="作成するディレクトリパス"),
    file_manager: FileManager = Depends(get_file_manager)
):
    """
    ディレクトリを作成
    
    Args:
        directory_path: 作成するディレクトリパス
        file_manager: FileManagerインスタンス
        
    Returns:
        dict: 作成結果
        
    Raises:
        HTTPException: エラーが発生した場合
    """
    try:
        success = await file_manager.create_directory(directory_path)
        
        return {
            "success": success,
            "message": f"ディレクトリを作成しました: {directory_path}"
        }
        
    except ValueError as e:
        logger.error(f"不正なパス: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except PermissionError as e:
        logger.error(f"アクセス権限エラー: {e}")
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="サーバー内部エラー")


@router.get("/info/", response_model=dict)
async def get_file_info(
    file_path: str = Query(..., description="情報を取得するファイルのパス"),
    file_manager: FileManager = Depends(get_file_manager)
):
    """
    ファイル情報を取得
    
    Args:
        file_path: 情報を取得するファイルのパス
        file_manager: FileManagerインスタンス
        
    Returns:
        dict: ファイル情報
        
    Raises:
        HTTPException: エラーが発生した場合
    """
    try:
        return file_manager.get_file_info(file_path)
        
    except ValueError as e:
        logger.error(f"不正なパス: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except FileNotFoundError as e:
        logger.error(f"ファイルが見つからない: {e}")
        raise HTTPException(status_code=404, detail=str(e))
        
    except PermissionError as e:
        logger.error(f"アクセス権限エラー: {e}")
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="サーバー内部エラー")