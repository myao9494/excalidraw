/**
 * Excalidraw File Manager API Client
 * バックエンドAPIとの連携用クライアントクラス
 */

import {
  FileLoadParams,
  FileListParams,
  FileDeleteParams,
  DirectoryCreateParams,
  FileInfoParams,
  API_ENDPOINTS,
  HTTP_STATUS,
  ApiClientError,
  NetworkError,
} from "./api-types";

import type {
  ApiConfig,
  ApiError,
  ApiResponse,
  FileSaveRequest,
  FileSaveResponse,
  FileLoadResponse,
  DirectoryListing,
  FileDeleteResponse,
  DirectoryCreateResponse,
  FileInfoResponse,
  HealthCheckResponse,
  ExcalidrawData,
} from "./api-types";

export class ExcalidrawApiClient {
  private config: Required<ApiConfig>;
  private baseFolder?: string;

  constructor(config: ApiConfig, baseFolder?: string) {
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout || 10000,
    };
    this.baseFolder = baseFolder;
  }

  // ========================================================================
  // プライベートメソッド
  // ========================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new ApiClientError(response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new NetworkError("リクエストがタイムアウトしました");
      }

      throw new NetworkError(
        "ネットワークエラーが発生しました",
        error as Error,
      );
    }
  }

  private buildQueryString(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();

    // baseFolderがある場合は追加
    if (this.baseFolder) {
      searchParams.append("base_folder", this.baseFolder);
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  /**
   * パスを正規化（先頭のスラッシュを除去）
   */
  private normalizePath(path: string): string {
    // 先頭のスラッシュを除去して相対パスにする
    return path.replace(/^\/+/, "");
  }

  // ========================================================================
  // パブリックメソッド
  // ========================================================================

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.makeRequest<HealthCheckResponse>(API_ENDPOINTS.HEALTH);
  }

  /**
   * ファイル保存
   */
  async saveFile(
    filePath: string,
    excalidrawData: ExcalidrawData,
    createDirectories: boolean = true,
  ): Promise<FileSaveResponse> {
    const normalizedPath = this.normalizePath(filePath);
    const request: FileSaveRequest = {
      file_path: normalizedPath,
      content: JSON.stringify(excalidrawData),
      create_directories: createDirectories,
    };

    // POSTリクエストでもbase_folderパラメータを追加
    const queryString = this.baseFolder
      ? `?base_folder=${encodeURIComponent(this.baseFolder)}`
      : "";

    return this.makeRequest<FileSaveResponse>(
      `${API_ENDPOINTS.FILES_SAVE}${queryString}`,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
  }

  /**
   * ファイル読み込み
   */
  async loadFile(filePath: string): Promise<{
    data: ExcalidrawData;
    fileInfo: FileLoadResponse["file_info"];
  }> {
    const normalizedPath = this.normalizePath(filePath);
    const queryString = this.buildQueryString({ file_path: normalizedPath });
    const response = await this.makeRequest<FileLoadResponse>(
      `${API_ENDPOINTS.FILES_LOAD}${queryString}`,
    );

    const excalidrawData: ExcalidrawData = JSON.parse(response.content);

    return {
      data: excalidrawData,
      fileInfo: response.file_info,
    };
  }

  /**
   * ファイル一覧取得
   */
  async listFiles(directoryPath: string = ""): Promise<DirectoryListing> {
    const normalizedPath = directoryPath
      ? this.normalizePath(directoryPath)
      : "";
    const queryString = this.buildQueryString({
      directory_path: normalizedPath,
    });
    return this.makeRequest<DirectoryListing>(
      `${API_ENDPOINTS.FILES_LIST}${queryString}`,
    );
  }

  /**
   * ファイル削除
   */
  async deleteFile(filePath: string): Promise<FileDeleteResponse> {
    const normalizedPath = this.normalizePath(filePath);
    const queryString = this.buildQueryString({ file_path: normalizedPath });
    return this.makeRequest<FileDeleteResponse>(
      `${API_ENDPOINTS.FILES_DELETE}${queryString}`,
      { method: "DELETE" },
    );
  }

  /**
   * ディレクトリ作成
   */
  async createDirectory(
    directoryPath: string,
  ): Promise<DirectoryCreateResponse> {
    const queryString = this.buildQueryString({
      directory_path: directoryPath,
    });
    return this.makeRequest<DirectoryCreateResponse>(
      `${API_ENDPOINTS.DIRECTORY_CREATE}${queryString}`,
      { method: "POST" },
    );
  }

  /**
   * ファイル情報取得
   */
  async getFileInfo(filePath: string): Promise<FileInfoResponse> {
    const normalizedPath = this.normalizePath(filePath);
    const queryString = this.buildQueryString({ file_path: normalizedPath });
    return this.makeRequest<FileInfoResponse>(
      `${API_ENDPOINTS.FILES_INFO}${queryString}`,
    );
  }

  // ========================================================================
  // 高レベルメソッド（便利関数）
  // ========================================================================

  /**
   * フォルダ階層を取得
   */
  async getFolderStructure(rootPath: string = ""): Promise<{
    folders: string[];
    files: string[];
  }> {
    const listing = await this.listFiles(rootPath);

    const folders = listing.files
      .filter((file) => file.is_directory)
      .map((file) => file.name);

    const files = listing.files
      .filter((file) => !file.is_directory && file.extension === ".excalidraw")
      .map((file) => file.name);

    return { folders, files };
  }

  /**
   * ファイルが存在するかチェック
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      await this.getFileInfo(normalizedPath);
      return true;
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === HTTP_STATUS.NOT_FOUND
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 安全なファイル名を生成
   */
  generateSafeFileName(
    baseName: string,
    extension: string = ".excalidraw",
  ): string {
    // 危険な文字を除去
    const safeName = baseName
      .replace(/[^\w\s\-\.]/g, "") // 英数字、スペース、ハイフン、ドット以外を除去
      .replace(/\s+/g, "_") // スペースをアンダースコアに変換
      .toLowerCase();

    // 拡張子を付与
    if (!safeName.endsWith(extension)) {
      return `${safeName}${extension}`;
    }

    return safeName;
  }

  /**
   * フォルダパスを正規化
   */
  normalizeFolderPath(folderPath: string): string {
    return this.normalizePath(folderPath)
      .split("/")
      .filter((segment) => segment.length > 0 && segment !== ".")
      .join("/");
  }

  /**
   * 完全なファイルパスを構築
   */
  buildFilePath(folderPath: string, fileName: string): string {
    const normalizedFolder = this.normalizeFolderPath(folderPath);
    const normalizedFileName = this.normalizePath(fileName);

    if (normalizedFolder === "") {
      return normalizedFileName;
    }

    return `${normalizedFolder}/${normalizedFileName}`;
  }

  // ========================================================================
  // エラーハンドリング用ヘルパー
  // ========================================================================

  /**
   * APIレスポンスをラップしてエラーハンドリングを統一
   */
  async safeApiCall<T>(apiCall: () => Promise<T>): Promise<ApiResponse<T>> {
    try {
      const data = await apiCall();
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiClientError || error instanceof NetworkError) {
        return {
          success: false,
          error: {
            error: error.name,
            message: error.message,
            details:
              error instanceof ApiClientError ? error.apiError : undefined,
          },
        };
      }

      return {
        success: false,
        error: {
          error: "UnknownError",
          message: "予期しないエラーが発生しました",
          details: error,
        },
      };
    }
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを取得
   */
  getErrorMessage(error: Error): string {
    if (error instanceof ApiClientError) {
      return error.apiError.message;
    }

    if (error instanceof NetworkError) {
      return error.message;
    }

    return "予期しないエラーが発生しました";
  }
}

// ========================================================================
// ファクトリー関数
// ========================================================================

/**
 * APIクライアントのインスタンスを作成
 */
export function createApiClient(
  baseUrl: string = "http://localhost:8000",
  baseFolder?: string,
): ExcalidrawApiClient {
  return new ExcalidrawApiClient({ baseUrl }, baseFolder);
}

// 型エクスポート
export type { ApiConfig, ApiError, ApiResponse, ExcalidrawData };
export { ApiClientError, NetworkError };
