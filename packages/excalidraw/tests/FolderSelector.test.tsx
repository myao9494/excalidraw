/**
 * FolderSelector コンポーネント基本テスト
 */

import { describe, it, expect } from "vitest";

import { FolderSelector } from "../components/FolderSelector";
import { FileSystemManager } from "../data/fileSystemManager";

describe("FolderSelector", () => {
  describe("基本機能", () => {
    it("コンポーネントが定義されている", () => {
      // Assert
      expect(FolderSelector).toBeDefined();
      expect(typeof FolderSelector).toBe("function");
    });
  });
});
