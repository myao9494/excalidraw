/**
 * FileSystemManager - Excalidrawのファイルシステム管理クラス
 * バックエンドAPIとの連携を担当
 */

import { createApiClient } from "./api-client";

import { BackupManager } from "./backupManager";

import { ApiClientError, NetworkError } from "./api-types";

import type { BackupConfig } from "./backupManager";

import type { ExcalidrawApiClient } from "./api-client";
import type {
  ExcalidrawData,
  DirectoryListing,
  FileSaveResponse,
  FileDeleteResponse,
  DirectoryCreateResponse,
} from "./api-types";

export class FileSystemManager {
  private apiClient: ExcalidrawApiClient;
  private backupManager: BackupManager;
  private currentFolder: string = "";

  constructor(
    apiBaseUrl: string = "http://localhost:8000",
    backupConfig?: Partial<BackupConfig>,
    baseFolder?: string,
  ) {
    this.apiClient = createApiClient(apiBaseUrl, baseFolder);
    this.backupManager = new BackupManager(this.apiClient, backupConfig);
  }

  /**
   * 指定されたフォルダにファイルを保存
   * @param folderPath フォルダパス
   * @param fileName ファイル名
   * @param data Excalidrawデータ
   * @returns 保存結果
   */
  async saveToFolder(
    folderPath: string,
    fileName: string,
    data: ExcalidrawData,
  ): Promise<FileSaveResponse> {
    const jsonContent = JSON.stringify(data);
    await this.backupManager.saveWithBackup(
      folderPath,
      fileName,
      jsonContent,
      true,
    );

    // ファイル情報を取得
    const fileInfoResponse = await this.apiClient.getFileInfo(
      `${folderPath}/${fileName}`,
    );
    const fileInfo = fileInfoResponse.file_info;

    return {
      success: true,
      message: "File saved successfully",
      file_info: fileInfo,
    };
  }

  /**
   * 指定されたフォルダからファイルを読み込み
   * @param folderPath フォルダパス
   * @param fileName ファイル名
   * @returns Excalidrawデータ
   */
  async loadFromFolder(
    folderPath: string,
    fileName: string,
  ): Promise<ExcalidrawData> {
    const filePath = this.apiClient.buildFilePath(folderPath, fileName);
    const result = await this.apiClient.loadFile(filePath);
    return result.data;
  }

  /**
   * フォルダの内容を一覧表示
   * @param folderPath フォルダパス（空の場合はルート）
   * @returns ディレクトリ一覧
   */
  async listFolderContents(folderPath: string = ""): Promise<DirectoryListing> {
    return await this.apiClient.listFiles(folderPath);
  }

  /**
   * 新しいフォルダを作成
   * @param folderPath 作成するフォルダパス
   * @returns 作成結果
   */
  async createFolder(folderPath: string): Promise<DirectoryCreateResponse> {
    return await this.apiClient.createDirectory(folderPath);
  }

  /**
   * ファイルを削除
   * @param folderPath フォルダパス
   * @param fileName ファイル名
   * @returns 削除結果
   */
  async deleteFile(
    folderPath: string,
    fileName: string,
  ): Promise<FileDeleteResponse> {
    const filePath = this.apiClient.buildFilePath(folderPath, fileName);
    return await this.apiClient.deleteFile(filePath);
  }

  /**
   * ファイルの存在確認
   * @param folderPath フォルダパス
   * @param fileName ファイル名
   * @returns ファイルが存在するかどうか
   */
  async fileExists(folderPath: string, fileName: string): Promise<boolean> {
    const filePath = this.apiClient.buildFilePath(folderPath, fileName);
    return await this.apiClient.fileExists(filePath);
  }

  /**
   * フォルダの階層構造を取得
   * @param rootPath ルートパス
   * @returns フォルダとファイルの配列
   */
  async getFolderStructure(rootPath: string = ""): Promise<{
    folders: string[];
    files: string[];
  }> {
    return await this.apiClient.getFolderStructure(rootPath);
  }

  /**
   * 現在のフォルダパスを取得
   * @returns 現在のフォルダパス
   */
  getCurrentFolder(): string {
    return this.currentFolder;
  }

  /**
   * 現在のフォルダパスを設定
   * @param folderPath 新しいフォルダパス
   */
  setCurrentFolder(folderPath: string): void {
    this.currentFolder = this.apiClient.normalizeFolderPath(folderPath);
  }

  /**
   * 安全なファイル名を生成
   * @param baseName 基本ファイル名
   * @param extension 拡張子
   * @returns 安全なファイル名
   */
  generateSafeFileName(
    baseName: string,
    extension: string = ".excalidraw",
  ): string {
    return this.apiClient.generateSafeFileName(baseName, extension);
  }

  /**
   * エラーメッセージを取得
   * @param error エラーオブジェクト
   * @returns ユーザーフレンドリーなエラーメッセージ
   */
  getErrorMessage(error: Error): string {
    return this.apiClient.getErrorMessage(error);
  }

  /**
   * APIの健康状態をチェック
   * @returns ヘルスチェック結果
   */
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.apiClient.healthCheck();
      return result.status === "healthy";
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * 重複しないファイル名を生成
   * @param folderPath フォルダパス
   * @param baseName 基本ファイル名
   * @param extension 拡張子
   * @returns 重複しないファイル名
   */
  async generateUniqueFileName(
    folderPath: string,
    baseName: string,
    extension: string = ".excalidraw",
  ): Promise<string> {
    let fileName = this.generateSafeFileName(baseName, extension);
    let counter = 1;

    // ファイル名が既存のファイルと重複しないかチェック
    while (await this.fileExists(folderPath, fileName)) {
      const nameWithoutExt = baseName.replace(extension, "");
      fileName = this.generateSafeFileName(
        `${nameWithoutExt}_${counter}`,
        extension,
      );
      counter++;
    }

    return fileName;
  }

  /**
   * 複数ファイルを一括保存
   * @param folderPath 保存先フォルダパス
   * @param files ファイル配列（名前とデータのペア）
   * @returns 保存結果の配列
   */
  async saveMultipleFiles(
    folderPath: string,
    files: { name: string; data: ExcalidrawData }[],
  ): Promise<{
    success: FileSaveResponse[];
    errors: { name: string; error: Error }[];
  }> {
    const success: FileSaveResponse[] = [];
    const errors: { name: string; error: Error }[] = [];

    for (const file of files) {
      try {
        const result = await this.saveToFolder(
          folderPath,
          file.name,
          file.data,
        );
        success.push(result);
      } catch (error) {
        errors.push({ name: file.name, error: error as Error });
      }
    }

    return { success, errors };
  }

  /**
   * フォルダのサイズ情報を取得
   * @param folderPath フォルダパス
   * @returns フォルダサイズ情報
   */
  async getFolderStats(folderPath: string = ""): Promise<{
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
  }> {
    const listing = await this.listFolderContents(folderPath);

    let totalFiles = 0;
    let totalFolders = 0;
    let totalSize = 0;

    for (const file of listing.files) {
      if (file.is_directory) {
        totalFolders++;
      } else {
        totalFiles++;
        totalSize += file.size;
      }
    }

    return { totalFiles, totalFolders, totalSize };
  }

  /**
   * バックアップ設定を更新
   * @param config 新しいバックアップ設定
   */
  updateBackupConfig(config: Partial<BackupConfig>): void {
    this.backupManager.updateConfig(config);
  }

  /**
   * バックアップ情報を取得
   * @param folderPath フォルダパス
   * @param fileName ファイル名
   * @returns バックアップ情報
   */
  async getBackupInfo(folderPath: string, fileName: string) {
    return await this.backupManager.getBackupInfo(folderPath, fileName);
  }

  /**
   * 自動保存（バックアップ付き）
   * @param folderPath フォルダパス
   * @param fileName ファイル名
   * @param data Excalidrawデータ
   * @returns 保存結果
   */
  async autoSave(
    folderPath: string,
    fileName: string,
    data: ExcalidrawData,
  ): Promise<FileSaveResponse> {
    const jsonContent = JSON.stringify(data);
    await this.backupManager.autoSaveWithBackup(
      folderPath,
      fileName,
      jsonContent,
    );

    // ファイル情報を取得
    const fileInfoResponse = await this.apiClient.getFileInfo(
      `${folderPath}/${fileName}`,
    );
    const fileInfo = fileInfoResponse.file_info;

    return {
      success: true,
      message: "File auto-saved successfully",
      file_info: fileInfo,
    };
  }

  /**
   * バックアップマネージャーを取得
   * @returns バックアップマネージャー
   */
  getBackupManager(): BackupManager {
    return this.backupManager;
  }
}
