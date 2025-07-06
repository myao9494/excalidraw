/**
 * SaveToFolderDialog コンポーネント テスト
 * TDD原則に従い、まずテストを作成
 */

import { describe, it, expect } from "vitest";

import { SaveToFolderDialog } from "../components/SaveToFolderDialog";

describe("SaveToFolderDialog", () => {
  describe("基本機能", () => {
    it("コンポーネントが定義されている", () => {
      expect(SaveToFolderDialog).toBeDefined();
      expect(typeof SaveToFolderDialog).toBe("function");
    });
  });
});
