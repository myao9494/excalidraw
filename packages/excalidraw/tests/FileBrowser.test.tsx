/**
 * FileBrowser コンポーネント基本テスト
 */

import { describe, it, expect } from "vitest";

import { FileBrowser } from "../components/FileBrowser";

describe("FileBrowser", () => {
  describe("基本機能", () => {
    it("コンポーネントが定義されている", () => {
      // Assert
      expect(FileBrowser).toBeDefined();
      expect(typeof FileBrowser).toBe("function");
    });
  });
});
