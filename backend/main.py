from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os
from datetime import datetime
from routers import files
from models.schemas import HealthCheckResponse, ErrorResponse

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# アプリケーションの初期化とクリーンアップ
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時の処理
    logger.info("FastAPIアプリケーションが起動しました")
    yield
    # 終了時の処理
    logger.info("FastAPIアプリケーションが終了しました")

# FastAPIアプリケーションの作成
app = FastAPI(
    title="Excalidraw File Manager API",
    description="Excalidrawファイルのフォルダ指定機能のためのAPI",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切な設定に変更
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(files.router)

# グローバル例外ハンドラー
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """グローバル例外ハンドラー"""
    logger.error(f"予期しないエラーが発生しました: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="InternalServerError",
            message="サーバー内部エラーが発生しました"
        ).model_dump()
    )

# HTTPExceptionハンドラー
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTPException用のハンドラー"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=f"HTTPError{exc.status_code}",
            message=exc.detail
        ).model_dump()
    )

# ルートエンドポイント
@app.get("/", response_model=dict)
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Excalidraw File Manager API",
        "version": "1.0.0",
        "docs_url": "/api/docs"
    }

# ヘルスチェックエンドポイント
@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """ヘルスチェック"""
    return HealthCheckResponse(
        status="healthy",
        timestamp=datetime.now(),
        version="1.0.0"
    )

# API情報エンドポイント
@app.get("/api/v1/info", response_model=dict)
async def api_info():
    """API情報"""
    return {
        "api_version": "1.0.0",
        "endpoints": {
            "files": "/api/v1/files/",
            "load": "/api/v1/files/load/",
            "save": "/api/v1/files/save/",
            "delete": "/api/v1/files/",
            "directory": "/api/v1/files/directory/",
            "info": "/api/v1/files/info/"
        },
        "documentation": {
            "swagger": "/api/docs",
            "redoc": "/api/redoc"
        }
    }

# 開発用の起動設定
if __name__ == "__main__":
    import uvicorn
    
    # 環境変数から設定を取得
    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    logger.info(f"開発サーバーを起動します: {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )