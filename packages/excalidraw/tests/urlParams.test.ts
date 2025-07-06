/**
 * URLパラメータ機能のテスト
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  getUrlFileParams,
  updateUrlFileParams,
  getFullFilePath,
  splitFilePath,
  generateSafeFileName,
} from "../utils/urlParams";

// URLSearchParamsのモック
const mockURLSearchParams = vi.fn();
const mockReplaceState = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // windowオブジェクトのモック
  Object.defineProperty(window, "location", {
    value: {
      search: "",
      pathname: "/",
    },
    writable: true,
  });

  Object.defineProperty(window, "history", {
    value: {
      replaceState: mockReplaceState,
    },
    writable: true,
  });

  global.URLSearchParams = mockURLSearchParams;
});

describe("URLパラメータ機能", () => {
  describe("getUrlFileParams", () => {
    it("URLパラメータからフォルダとファイル情報を取得する", () => {
      const mockGet = vi.fn().mockImplementation((key: string) => {
        switch (key) {
          case "folder":
            return "drawings/project1";
          case "file":
            return "sketch.excalidraw";
          case "baseFolder":
            return null;
          case "filepath":
            return null;
          default:
            return null;
        }
      });

      mockURLSearchParams.mockReturnValue({
        get: mockGet,
      });

      window.location.search =
        "?folder=drawings/project1&file=sketch.excalidraw";

      const params = getUrlFileParams();

      expect(params).toEqual({
        folder: "drawings/project1",
        file: "sketch.excalidraw",
        baseFolder: undefined,
        filepath: undefined,
      });
    });

    it("パラメータが存在しない場合は空のオブジェクトを返す", () => {
      const mockGet = vi.fn().mockReturnValue(null);

      mockURLSearchParams.mockReturnValue({
        get: mockGet,
      });

      window.location.search = "";

      const params = getUrlFileParams();

      expect(params).toEqual({
        folder: undefined,
        file: undefined,
        baseFolder: undefined,
        filepath: undefined,
      });
    });
  });

  describe("getFullFilePath", () => {
    it("フォルダとファイル名から完全なパスを生成する", () => {
      const path = getFullFilePath("drawings/project1", "sketch.excalidraw");
      expect(path).toBe("drawings/project1/sketch.excalidraw");
    });

    it("フォルダが空の場合はファイル名のみを返す", () => {
      const path = getFullFilePath("", "sketch.excalidraw");
      expect(path).toBe("sketch.excalidraw");
    });

    it("ファイル名が空の場合はnullを返す", () => {
      const path = getFullFilePath("drawings", "");
      expect(path).toBe(null);
    });
  });

  describe("splitFilePath", () => {
    it("ファイルパスをフォルダとファイル名に分解する", () => {
      const result = splitFilePath("drawings/project1/sketch.excalidraw");
      expect(result).toEqual({
        folder: "drawings/project1",
        file: "sketch.excalidraw",
      });
    });

    it("スラッシュが無い場合はフォルダが空になる", () => {
      const result = splitFilePath("sketch.excalidraw");
      expect(result).toEqual({
        folder: "",
        file: "sketch.excalidraw",
      });
    });
  });

  describe("generateSafeFileName", () => {
    it("安全なファイル名を生成する", () => {
      const safeName = generateSafeFileName("my drawing with spaces");
      expect(safeName).toBe("my_drawing_with_spaces.excalidraw");
    });

    it("危険な文字を置換する", () => {
      const safeName = generateSafeFileName('my<>:"/\\|?*drawing');
      expect(safeName).toBe("my_________drawing.excalidraw");
    });

    it("すでに.excalidraw拡張子がある場合は追加しない", () => {
      const safeName = generateSafeFileName("drawing.excalidraw");
      expect(safeName).toBe("drawing.excalidraw");
    });

    it("空の名前の場合はデフォルト名を返す", () => {
      const safeName = generateSafeFileName("");
      expect(safeName).toBe("untitled.excalidraw");
    });
  });
});
