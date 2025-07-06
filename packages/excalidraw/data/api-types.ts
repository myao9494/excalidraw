/**
 * Excalidraw File Manager API Type Definitions
 * バックエンドAPIとの連携用TypeScript型定義
 */

// ============================================================================
// 基本型定義
// ============================================================================

// ============================================================================
// Excalidraw データ型（参考）
// ============================================================================

// Excalidrawの正式な型をインポート
import type { ExcalidrawElement as OriginalExcalidrawElement } from "@excalidraw/element/types";

export interface FileInfo {
  name: string; // ファイル名
  path: string; // 絶対パス
  size: number; // ファイルサイズ（バイト）
  modified: string; // 最終更新日時（ISO 8601形式）
  is_directory: boolean; // ディレクトリかどうか
  extension: string | null; // ファイル拡張子
}

export interface ApiError {
  error: string; // エラーの種類
  message: string; // エラーメッセージ（日本語）
  details?: any; // 詳細情報
}

// ============================================================================
// API リクエスト・レスポンス型定義
// ============================================================================

// ファイル保存
export interface FileSaveRequest {
  file_path: string; // 相対パス（例: "drawings/my_file.excalidraw"）
  content: string; // JSON文字列
  create_directories: boolean; // ディレクトリ自動作成
}

export interface FileSaveResponse {
  file_info: FileInfo;
  success: boolean;
  message: string;
}

// ファイル読み込み
export interface FileLoadParams {
  file_path: string; // 相対パス
}

export interface FileLoadResponse {
  content: string; // JSON文字列
  file_info: FileInfo;
  success: boolean;
}

// ファイル一覧
export interface FileListParams {
  directory_path?: string; // 相対パス（空の場合はルート）
}

export interface DirectoryListing {
  current_path: string;
  files: FileInfo[];
  total_count: number;
}

// ファイル削除
export interface FileDeleteParams {
  file_path: string; // 相対パス
}

export interface FileDeleteResponse {
  success: boolean;
  message: string;
}

// ディレクトリ作成
export interface DirectoryCreateParams {
  directory_path: string; // 相対パス
}

export interface DirectoryCreateResponse {
  success: boolean;
  message: string;
}

// ファイル情報取得
export interface FileInfoParams {
  file_path: string; // 相対パス
}

export interface FileInfoResponse {
  file_info: FileInfo;
  absolute_path: string;
}

// ヘルスチェック
export interface HealthCheckResponse {
  status: string; // "healthy"
  timestamp: string; // ISO 8601形式
  version: string; // APIバージョン
}

// ============================================================================
// API クライアント設定
// ============================================================================

export interface ApiConfig {
  baseUrl: string; // API ベースURL（例: "http://localhost:8000"）
  timeout?: number; // タイムアウト（ミリ秒）
}

// APIで使用するExcalidraw要素型（正式な型を使用）
export type ExcalidrawElement = OriginalExcalidrawElement;

export interface ExcalidrawAppState {
  viewBackgroundColor: string;
  currentItemStrokeColor?: string;
  currentItemBackgroundColor?: string;
  currentItemFillStyle?: string;
  currentItemStrokeWidth?: number;
  currentItemStrokeStyle?: string;
  currentItemRoughness?: number;
  currentItemOpacity?: number;
  currentItemFontFamily?: number;
  currentItemFontSize?: number;
  currentItemTextAlign?: string;
  currentItemStartArrowhead?: string | null;
  currentItemEndArrowhead?: string;
  scrollX?: number;
  scrollY?: number;
  zoom?: {
    value: number;
  };
}

export interface ExcalidrawData {
  type: "excalidraw";
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: ExcalidrawAppState;
}

// ============================================================================
// ユーティリティ型
// ============================================================================

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ApiError;
    };

export interface FolderPath {
  segments: string[]; // パス要素の配列
  full: string; // 完全なパス文字列
}

export interface FileHandle {
  folder: FolderPath;
  filename: string;
  fullPath: string;
}

// ============================================================================
// 定数
// ============================================================================

export const API_ENDPOINTS = {
  FILES_LIST: "/api/v1/files/",
  FILES_LOAD: "/api/v1/files/load/",
  FILES_SAVE: "/api/v1/files/save/",
  FILES_DELETE: "/api/v1/files/",
  FILES_INFO: "/api/v1/files/info/",
  DIRECTORY_CREATE: "/api/v1/files/directory/",
  HEALTH: "/health",
  API_INFO: "/api/v1/info",
} as const;

export const FILE_EXTENSIONS = {
  EXCALIDRAW: ".excalidraw",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================================================
// エラークラス
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public apiError: ApiError,
    message?: string,
  ) {
    super(message || apiError.message);
    this.name = "ApiClientError";
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = "NetworkError";
  }
}
