import { describe, it, expect, vi, beforeEach } from "vitest";

import { BackupManager } from "../data/backupManager";

import type { BackupConfig } from "../data/backupManager";

describe("BackupManager", () => {
  let backupManager: BackupManager;
  let mockApiClient: any;

  const defaultConfig: BackupConfig = {
    maxBackups: 3,
    enabled: true,
    backupOnSave: true,
    backupOnAutoSave: true,
  };

  beforeEach(() => {
    mockApiClient = {
      listFiles: vi.fn(),
      deleteFile: vi.fn(),
      saveFile: vi.fn(),
      loadFile: vi.fn(),
    };
    backupManager = new BackupManager(mockApiClient, defaultConfig);
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const manager = new BackupManager(mockApiClient);
      expect(manager.config.maxBackups).toBe(3);
      expect(manager.config.enabled).toBe(true);
    });

    it("should initialize with custom config", () => {
      const customConfig: BackupConfig = {
        maxBackups: 5,
        enabled: false,
        backupOnSave: false,
        backupOnAutoSave: false,
      };
      const manager = new BackupManager(mockApiClient, customConfig);
      expect(manager.config.maxBackups).toBe(5);
      expect(manager.config.enabled).toBe(false);
    });
  });

  describe("generateBackupFilename", () => {
    it("should generate backup filename with timestamp", () => {
      const filename = "test.excalidraw";
      const result = backupManager.generateBackupFilename(filename);
      expect(result).toMatch(
        /^test\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.excalidraw$/,
      );
    });

    it("should handle filename without extension", () => {
      const filename = "test";
      const result = backupManager.generateBackupFilename(filename);
      expect(result).toMatch(
        /^test\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/,
      );
    });

    it("should handle complex filename", () => {
      const filename = "my-complex.file.name.excalidraw";
      const result = backupManager.generateBackupFilename(filename);
      expect(result).toMatch(
        /^my-complex\.file\.name\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.excalidraw$/,
      );
    });
  });

  describe("isBackupFile", () => {
    it("should identify backup files", () => {
      expect(
        backupManager.isBackupFile(
          "test.backup.2023-12-01-10-30-45.excalidraw",
        ),
      ).toBe(true);
      expect(
        backupManager.isBackupFile("test.backup.2023-12-01-10-30-45"),
      ).toBe(true);
    });

    it("should not identify regular files as backup files", () => {
      expect(backupManager.isBackupFile("test.excalidraw")).toBe(false);
      expect(backupManager.isBackupFile("test.backup.txt")).toBe(false);
      expect(backupManager.isBackupFile("backup.excalidraw")).toBe(false);
    });
  });

  describe("getBackupFiles", () => {
    it("should get backup files for a given filename", async () => {
      const files = [
        "test.excalidraw",
        "test.backup.2023-12-01-10-30-45.excalidraw",
        "test.backup.2023-12-01-10-25-30.excalidraw",
        "other.excalidraw",
        "other.backup.2023-12-01-10-20-15.excalidraw",
      ];

      mockApiClient.listFiles.mockResolvedValue({
        files: files.map((name) => ({
          name,
          is_directory: false,
          path: name,
          size: 100,
          modified: "2023-12-01",
          extension: name.includes(".") ? `.${name.split(".").pop()}` : null,
        })),
        current_path: "folder",
        total_count: files.length,
      });

      const result = await backupManager.getBackupFiles(
        "folder",
        "test.excalidraw",
      );
      expect(result).toEqual([
        "test.backup.2023-12-01-10-30-45.excalidraw",
        "test.backup.2023-12-01-10-25-30.excalidraw",
      ]);
    });

    it("should return empty array when no backup files exist", async () => {
      mockApiClient.listFiles.mockResolvedValue({ files: ["test.excalidraw"] });

      const result = await backupManager.getBackupFiles(
        "folder",
        "test.excalidraw",
      );
      expect(result).toEqual([]);
    });
  });

  describe("createBackup", () => {
    it("should create backup when file exists", async () => {
      const existingData = { elements: [], appState: {} };
      mockApiClient.loadFile.mockResolvedValue({ data: existingData });
      mockApiClient.saveFile.mockResolvedValue({});

      await backupManager.createBackup("folder", "test.excalidraw");

      expect(mockApiClient.loadFile).toHaveBeenCalledWith(
        "folder/test.excalidraw",
      );
      expect(mockApiClient.saveFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /^folder\/test\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.excalidraw$/,
        ),
        existingData,
        false,
      );
    });

    it("should not create backup when file does not exist", async () => {
      mockApiClient.loadFile.mockRejectedValue(new Error("File not found"));

      await backupManager.createBackup("folder", "test.excalidraw");

      expect(mockApiClient.saveFile).not.toHaveBeenCalled();
    });

    it("should not create backup when disabled", async () => {
      const disabledManager = new BackupManager(mockApiClient, {
        ...defaultConfig,
        enabled: false,
      });

      await disabledManager.createBackup("folder", "test.excalidraw");

      expect(mockApiClient.loadFile).not.toHaveBeenCalled();
      expect(mockApiClient.saveFile).not.toHaveBeenCalled();
    });
  });

  describe("cleanupOldBackups", () => {
    it("should delete old backups when exceeding maxBackups", async () => {
      const files = [
        "test.backup.2023-12-01-10-30-45.excalidraw",
        "test.backup.2023-12-01-10-25-30.excalidraw",
        "test.backup.2023-12-01-10-20-15.excalidraw",
        "test.backup.2023-12-01-10-15-00.excalidraw",
        "test.backup.2023-12-01-10-10-00.excalidraw",
      ];

      mockApiClient.listFiles.mockResolvedValue({
        files: files.map((name) => ({
          name,
          is_directory: false,
          path: name,
          size: 100,
          modified: "2023-12-01",
          extension: name.includes(".") ? `.${name.split(".").pop()}` : null,
        })),
        current_path: "folder",
        total_count: files.length,
      });
      mockApiClient.deleteFile.mockResolvedValue({});

      await backupManager.cleanupOldBackups("folder", "test.excalidraw");

      expect(mockApiClient.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockApiClient.deleteFile).toHaveBeenCalledWith(
        "folder/test.backup.2023-12-01-10-15-00.excalidraw",
      );
      expect(mockApiClient.deleteFile).toHaveBeenCalledWith(
        "folder/test.backup.2023-12-01-10-10-00.excalidraw",
      );
    });

    it("should not delete backups when under maxBackups limit", async () => {
      const files = [
        "test.backup.2023-12-01-10-30-45.excalidraw",
        "test.backup.2023-12-01-10-25-30.excalidraw",
      ];

      mockApiClient.listFiles.mockResolvedValue({
        files: files.map((name) => ({
          name,
          is_directory: false,
          path: name,
          size: 100,
          modified: "2023-12-01",
          extension: name.includes(".") ? `.${name.split(".").pop()}` : null,
        })),
        current_path: "folder",
        total_count: files.length,
      });

      await backupManager.cleanupOldBackups("folder", "test.excalidraw");

      expect(mockApiClient.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe("saveWithBackup", () => {
    it("should create backup and save file", async () => {
      const existingContent = JSON.stringify({ elements: [], appState: {} });
      const newContent = JSON.stringify({
        elements: [{ id: "1" }],
        appState: {},
      });

      mockApiClient.loadFile.mockResolvedValue({ content: existingContent });
      mockApiClient.saveFile.mockResolvedValue({});
      mockApiClient.listFiles.mockResolvedValue({ files: [] });

      await backupManager.saveWithBackup(
        "folder",
        "test.excalidraw",
        newContent,
      );

      expect(mockApiClient.saveFile).toHaveBeenCalledTimes(2);
      expect(mockApiClient.saveFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /^folder\/test\.backup\.\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.excalidraw$/,
        ),
        existingContent,
        false,
      );
      expect(mockApiClient.saveFile).toHaveBeenCalledWith(
        "folder/test.excalidraw",
        newContent,
        false,
      );
    });

    it("should only save file when backup creation fails", async () => {
      const newContent = JSON.stringify({
        elements: [{ id: "1" }],
        appState: {},
      });

      mockApiClient.loadFile.mockRejectedValue(new Error("File not found"));
      mockApiClient.saveFile.mockResolvedValue({});

      await backupManager.saveWithBackup(
        "folder",
        "test.excalidraw",
        newContent,
      );

      expect(mockApiClient.saveFile).toHaveBeenCalledTimes(1);
      expect(mockApiClient.saveFile).toHaveBeenCalledWith(
        "folder/test.excalidraw",
        newContent,
        false,
      );
    });
  });

  describe("updateConfig", () => {
    it("should update config", () => {
      const newConfig: Partial<BackupConfig> = {
        maxBackups: 5,
        enabled: false,
      };

      backupManager.updateConfig(newConfig);

      expect(backupManager.config.maxBackups).toBe(5);
      expect(backupManager.config.enabled).toBe(false);
      expect(backupManager.config.backupOnSave).toBe(true);
    });
  });
});
