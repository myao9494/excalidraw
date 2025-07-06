/**
 * フォルダ保存アクション テストファイル
 * TDD原則に従い、まずテストを作成
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  actionSaveToFolder,
  actionLoadFromFolder,
  actionSaveAsWithFolder,
} from "../actions/actionFolderSave";

describe("フォルダ保存アクション", () => {
  describe("actionSaveToFolder", () => {
    it("アクションが定義されている", () => {
      expect(actionSaveToFolder).toBeDefined();
      expect(actionSaveToFolder.name).toBe("saveToActiveFile");
      expect(actionSaveToFolder.label).toBe("buttons.saveToFolder");
    });

    it("適切な権限チェック関数が定義されている", () => {
      expect(actionSaveToFolder.predicate).toBeDefined();
      expect(typeof actionSaveToFolder.predicate).toBe("function");
    });

    it("実行関数が定義されている", () => {
      expect(actionSaveToFolder.perform).toBeDefined();
      expect(typeof actionSaveToFolder.perform).toBe("function");
    });
  });

  describe("actionLoadFromFolder", () => {
    it("アクションが定義されている", () => {
      expect(actionLoadFromFolder).toBeDefined();
      expect(actionLoadFromFolder.name).toBe("loadScene");
      expect(actionLoadFromFolder.label).toBe("buttons.loadFromFolder");
    });

    it("実行関数が定義されている", () => {
      expect(actionLoadFromFolder.perform).toBeDefined();
      expect(typeof actionLoadFromFolder.perform).toBe("function");
    });
  });

  describe("actionSaveAsWithFolder", () => {
    it("アクションが定義されている", () => {
      expect(actionSaveAsWithFolder).toBeDefined();
      expect(actionSaveAsWithFolder.name).toBe("saveFileToDisk");
      expect(actionSaveAsWithFolder.label).toBe("buttons.saveAsWithFolder");
    });

    it("キーボードショートカットが定義されている", () => {
      expect(actionSaveAsWithFolder.keyTest).toBeDefined();
      expect(typeof actionSaveAsWithFolder.keyTest).toBe("function");
    });
  });
});
