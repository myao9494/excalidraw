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
} from "./frontend-api-types";

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
} from "./frontend-api-types";

export class ExcalidrawApiClient {
  private config: Required<ApiConfig>;

  constructor(config: ApiConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout || 10000,
    };
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
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
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
    const request: FileSaveRequest = {
      file_path: filePath,
      content: JSON.stringify(excalidrawData),
      create_directories: createDirectories,
    };

    return this.makeRequest<FileSaveResponse>(API_ENDPOINTS.FILES_SAVE, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * ファイル読み込み
   */
  async loadFile(filePath: string): Promise<{
    data: ExcalidrawData;
    fileInfo: FileLoadResponse["file_info"];
  }> {
    const queryString = this.buildQueryString({ file_path: filePath });
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
    const queryString = this.buildQueryString({
      directory_path: directoryPath,
    });
    return this.makeRequest<DirectoryListing>(
      `${API_ENDPOINTS.FILES_LIST}${queryString}`,
    );
  }

  /**
   * ファイル削除
   */
  async deleteFile(filePath: string): Promise<FileDeleteResponse> {
    const queryString = this.buildQueryString({ file_path: filePath });
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
    const queryString = this.buildQueryString({ file_path: filePath });
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
      await this.getFileInfo(filePath);
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
    return folderPath
      .split("/")
      .filter((segment) => segment.length > 0 && segment !== ".")
      .join("/");
  }

  /**
   * 完全なファイルパスを構築
   */
  buildFilePath(folderPath: string, fileName: string): string {
    const normalizedFolder = this.normalizeFolderPath(folderPath);

    if (normalizedFolder === "") {
      return fileName;
    }

    return `${normalizedFolder}/${fileName}`;
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
): ExcalidrawApiClient {
  return new ExcalidrawApiClient({ baseUrl });
}

// ========================================================================
// 使用例（参考）
// ========================================================================

/*
// 基本的な使用例
const apiClient = createApiClient();

// ファイル保存
const excalidrawData = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: [],
  appState: { viewBackgroundColor: "#ffffff" }
};

try {
  const result = await apiClient.saveFile('my-project/diagram.excalidraw', excalidrawData);
  console.log('保存成功:', result.message);
} catch (error) {
  console.error('保存エラー:', apiClient.getErrorMessage(error));
}

// ファイル読み込み
try {
  const { data, fileInfo } = await apiClient.loadFile('my-project/diagram.excalidraw');
  console.log('読み込み成功:', data);
} catch (error) {
  console.error('読み込みエラー:', apiClient.getErrorMessage(error));
}

// 安全なAPIコール
const result = await apiClient.safeApiCall(() => 
  apiClient.listFiles('my-project')
);

if (result.success) {
  console.log('ファイル一覧:', result.data.files);
} else {
  console.error('エラー:', result.error.message);
}
*/
