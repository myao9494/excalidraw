import type { ExcalidrawApiClient } from "./api-client";

export interface BackupConfig {
  maxBackups: number;
  enabled: boolean;
  backupOnSave: boolean;
  backupOnAutoSave: boolean;
}

export interface BackupInfo {
  filename: string;
  backup_count: number;
  max_backups: number;
  backups: Array<{
    filename: string;
    timestamp: string;
    size: number;
  }>;
}

export class BackupManager {
  private apiClient: ExcalidrawApiClient;
  public config: BackupConfig;

  constructor(apiClient: ExcalidrawApiClient, config?: Partial<BackupConfig>) {
    this.apiClient = apiClient;
    this.config = {
      maxBackups: 3,
      enabled: true,
      backupOnSave: true,
      backupOnAutoSave: true,
      ...config,
    };
  }

  /**
   * バックアップファイル名を生成する
   */
  generateBackupFilename(filename: string): string {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[:T]/g, "-")
      .replace(/\.\d{3}Z$/, "");

    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1) {
      return `${filename}.backup.${timestamp}`;
    }

    const name = filename.substring(0, dotIndex);
    const extension = filename.substring(dotIndex);
    return `${name}.backup.${timestamp}${extension}`;
  }

  /**
   * バックアップファイルかどうかを判定する
   */
  isBackupFile(filename: string): boolean {
    const backupPattern = /\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}(\.|$)/;
    return backupPattern.test(filename);
  }

  /**
   * 指定されたファイルのバックアップファイル一覧を取得する
   */
  async getBackupFiles(folder: string, filename: string): Promise<string[]> {
    try {
      const backupFolder = folder ? `${folder}/backup` : "backup";
      const directoryListing = await this.apiClient.listFiles(backupFolder);
      const files = directoryListing.files;
      const baseName = filename.replace(/\.excalidraw$/, "");

      return files
        .filter((file) => {
          if (!this.isBackupFile(file.name)) {
            return false;
          }
          const fileBaseName = file.name.replace(
            /\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}.*$/,
            "",
          );
          return fileBaseName === baseName;
        })
        .map((file) => file.name)
        .sort()
        .reverse(); // 新しい順にソート
    } catch (error) {
      console.error("Failed to get backup files:", error);
      return [];
    }
  }

  /**
   * バックアップを作成する
   */
  async createBackup(folder: string, filename: string): Promise<string | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const filePath = `${folder}/${filename}`;
      const { data } = await this.apiClient.loadFile(filePath);

      const backupFilename = this.generateBackupFilename(filename);
      const backupFolder = folder ? `${folder}/backup` : "backup";
      const backupFilePath = `${backupFolder}/${backupFilename}`;

      await this.apiClient.saveFile(backupFilePath, data, true);
      return backupFilename;
    } catch (error) {
      console.error("Failed to create backup:", error);
      return null;
    }
  }

  /**
   * 古いバックアップファイルをクリーンアップする
   */
  async cleanupOldBackups(folder: string, filename: string): Promise<void> {
    try {
      const backupFiles = await this.getBackupFiles(folder, filename);

      if (backupFiles.length <= this.config.maxBackups) {
        return;
      }

      const filesToDelete = backupFiles.slice(this.config.maxBackups);
      const backupFolder = folder ? `${folder}/backup` : "backup";

      for (const file of filesToDelete) {
        const filePath = `${backupFolder}/${file}`;
        await this.apiClient.deleteFile(filePath);
      }
    } catch (error) {
      console.error("Failed to cleanup old backups:", error);
    }
  }

  /**
   * バックアップ付きでファイルを保存する
   */
  async saveWithBackup(
    folder: string,
    filename: string,
    content: string,
    createDirectories: boolean = false,
  ): Promise<void> {
    try {
      // バックアップを作成
      if (this.config.enabled && this.config.backupOnSave) {
        await this.createBackup(folder, filename);
      }

      // メインファイルを保存（contentを適切なExcalidrawDataに変換）
      const excalidrawData = JSON.parse(content);
      const filePath = `${folder}/${filename}`;
      await this.apiClient.saveFile(
        filePath,
        excalidrawData,
        createDirectories,
      );

      // 古いバックアップをクリーンアップ
      if (this.config.enabled) {
        await this.cleanupOldBackups(folder, filename);
      }
    } catch (error) {
      console.error("Failed to save with backup:", error);
      throw error;
    }
  }

  /**
   * 自動保存でバックアップ付きファイル保存を行う
   */
  async autoSaveWithBackup(
    folder: string,
    filename: string,
    content: string,
  ): Promise<void> {
    if (!this.config.backupOnAutoSave) {
      const excalidrawData = JSON.parse(content);
      const filePath = `${folder}/${filename}`;
      await this.apiClient.saveFile(filePath, excalidrawData, false);
      return;
    }

    await this.saveWithBackup(folder, filename, content, false);
  }

  /**
   * 設定を更新する
   */
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * バックアップ情報を取得する
   */
  async getBackupInfo(folder: string, filename: string): Promise<BackupInfo> {
    const backupFiles = await this.getBackupFiles(folder, filename);

    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const timestampMatch = file.match(
          /\.backup\.(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/,
        );
        const timestamp = timestampMatch ? timestampMatch[1] : "";

        try {
          const backupFolder = folder ? `${folder}/backup` : "backup";
          const { data } = await this.apiClient.loadFile(
            `${backupFolder}/${file}`,
          );
          const content = JSON.stringify(data);
          return {
            filename: file,
            timestamp,
            size: content.length,
          };
        } catch (error) {
          return {
            filename: file,
            timestamp,
            size: 0,
          };
        }
      }),
    );

    return {
      filename,
      backup_count: backupFiles.length,
      max_backups: this.config.maxBackups,
      backups,
    };
  }
}
