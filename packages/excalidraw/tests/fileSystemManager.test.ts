/**
 * FileSystemManager テストファイル
 * TDD原則に従い、まずテストを作成
 */

import { describe, it, expect, beforeEach } from "vitest";

import { FileSystemManager } from "../data/fileSystemManager";

import type { ExcalidrawData } from "../data/api-types";

// モックデータ
const mockExcalidrawData: ExcalidrawData = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: [],
  appState: {
    viewBackgroundColor: "#ffffff",
  },
};

describe("FileSystemManager", () => {
  let fileManager: FileSystemManager;

  beforeEach(() => {
    // ファイルマネージャーを初期化
    fileManager = new FileSystemManager("http://localhost:8000");
  });

  describe("基本機能", () => {
    it("FileSystemManagerが正常に初期化される", () => {
      // Assert
      expect(fileManager).toBeInstanceOf(FileSystemManager);
    });

    it("現在のフォルダパスの設定と取得ができる", () => {
      // Arrange
      const testPath = "projects/diagrams";

      // Act
      fileManager.setCurrentFolder(testPath);

      // Assert
      expect(fileManager.getCurrentFolder()).toBe(testPath);
    });
  });

  describe("ファイル名生成", () => {
    it("安全なファイル名を生成できる", () => {
      // Arrange
      const baseName = "My Diagram!@#";

      // Act
      const result = fileManager.generateSafeFileName(baseName);

      // Assert
      expect(result).toBe("my_diagram.excalidraw");
    });
  });
});
