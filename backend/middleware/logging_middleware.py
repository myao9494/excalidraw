"""
ログミドルウェア
URLエンコードされたパスを読みやすい形で出力
"""

import logging
import time
import urllib.parse
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    カスタムログミドルウェア
    URLエンコードされたパラメータをデコードしてログ出力
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # レスポンスを取得
        response: Response = await call_next(request)
        
        # 処理時間を計算
        process_time = time.time() - start_time
        
        # URLとクエリパラメータをデコード
        decoded_url = self._decode_url(str(request.url))
        
        # カスタムログ出力
        logger.info(
            f"{request.client.host}:{request.client.port} - "
            f"\"{request.method} {decoded_url} HTTP/1.1\" "
            f"{response.status_code} "
            f"({process_time:.3f}s)"
        )
        
        return response

    def _decode_url(self, url: str) -> str:
        """
        URLをデコードして読みやすくする
        
        Args:
            url: エンコードされたURL
            
        Returns:
            str: デコードされたURL
        """
        try:
            # URLを分解
            from urllib.parse import urlparse, parse_qs, unquote
            
            parsed = urlparse(url)
            decoded_path = unquote(parsed.path)
            
            # クエリパラメータもデコード
            if parsed.query:
                decoded_params = []
                params = parse_qs(parsed.query, keep_blank_values=True)
                
                for key, values in params.items():
                    decoded_key = unquote(key)
                    for value in values:
                        decoded_value = unquote(value)
                        decoded_params.append(f"{decoded_key}={decoded_value}")
                
                decoded_query = "&".join(decoded_params)
                return f"{decoded_path}?{decoded_query}"
            else:
                return decoded_path
                
        except Exception as e:
            # デコードに失敗した場合は元のURLを返す
            logger.debug(f"URL decode failed: {e}")
            return url