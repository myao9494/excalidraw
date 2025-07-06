/**
 * Windows パス対応のテスト
 */

import {
  normalizePath,
  splitFilePath,
  getFullFilePath,
} from "../utils/urlParams";

describe("Windows Path Support", () => {
  describe("normalizePath", () => {
    test("Windowsバックスラッシュをフォワードスラッシュに変換", () => {
      expect(normalizePath("C:\\Users\\test\\file.txt")).toBe(
        "C:/Users/test/file.txt",
      );
      expect(normalizePath("\\\\server\\share\\file.txt")).toBe(
        "//server/share/file.txt",
      );
      expect(normalizePath("relative\\path\\file.txt")).toBe(
        "relative/path/file.txt",
      );
    });

    test("Unix形式のパスはそのまま", () => {
      expect(normalizePath("/Users/test/file.txt")).toBe(
        "/Users/test/file.txt",
      );
      expect(normalizePath("relative/path/file.txt")).toBe(
        "relative/path/file.txt",
      );
    });

    test("混在パスの正規化", () => {
      expect(normalizePath("C:\\Users/test\\file.txt")).toBe(
        "C:/Users/test/file.txt",
      );
    });
  });

  describe("splitFilePath - Windows paths", () => {
    test("Windows絶対パスの分割", () => {
      const result = splitFilePath(
        "C:\\Users\\test\\Documents\\file.excalidraw",
      );
      expect(result.folder).toBe("C:/Users/test/Documents");
      expect(result.file).toBe("file.excalidraw");
    });

    test("UNCパスの分割", () => {
      const result = splitFilePath(
        "\\\\server\\share\\folder\\file.excalidraw",
      );
      expect(result.folder).toBe("//server/share/folder");
      expect(result.file).toBe("file.excalidraw");
    });

    test("Windows相対パスの分割", () => {
      const result = splitFilePath("Documents\\subfolder\\file.excalidraw");
      expect(result.folder).toBe("Documents/subfolder");
      expect(result.file).toBe("file.excalidraw");
    });

    test("ルートディレクトリのファイル", () => {
      const result = splitFilePath("C:\\file.excalidraw");
      expect(result.folder).toBe("C:");
      expect(result.file).toBe("file.excalidraw");
    });

    test("混在パスの分割", () => {
      const result = splitFilePath("C:\\Users/test\\file.excalidraw");
      expect(result.folder).toBe("C:/Users/test");
      expect(result.file).toBe("file.excalidraw");
    });
  });

  describe("getFullFilePath - Windows compatibility", () => {
    test("Windowsフォルダとファイルの結合", () => {
      expect(getFullFilePath("C:\\Users\\test", "file.excalidraw")).toBe(
        "C:/Users/test/file.excalidraw",
      );
    });

    test("相対パスの結合", () => {
      expect(getFullFilePath("Documents\\subfolder", "file.excalidraw")).toBe(
        "Documents/subfolder/file.excalidraw",
      );
    });

    test("空フォルダの場合", () => {
      expect(getFullFilePath("", "file.excalidraw")).toBe("file.excalidraw");
      expect(getFullFilePath(undefined, "file.excalidraw")).toBe(
        "file.excalidraw",
      );
    });
  });

  describe("Real-world Windows scenarios", () => {
    test("典型的なWindows Documentsパス", () => {
      const windowsPath =
        "C:\\Users\\username\\Documents\\Excalidraw\\drawing.excalidraw";
      const { folder, file } = splitFilePath(windowsPath);

      expect(folder).toBe("C:/Users/username/Documents/Excalidraw");
      expect(file).toBe("drawing.excalidraw");

      const reconstructed = getFullFilePath(folder, file);
      expect(reconstructed).toBe(
        "C:/Users/username/Documents/Excalidraw/drawing.excalidraw",
      );
    });

    test("ネットワークドライブのパス", () => {
      const networkPath =
        "\\\\company-server\\shared\\projects\\design.excalidraw";
      const { folder, file } = splitFilePath(networkPath);

      expect(folder).toBe("//company-server/shared/projects");
      expect(file).toBe("design.excalidraw");
    });

    test("相対パス（プロジェクト内）", () => {
      const relativePath = "assets\\drawings\\diagram.excalidraw";
      const { folder, file } = splitFilePath(relativePath);

      expect(folder).toBe("assets/drawings");
      expect(file).toBe("diagram.excalidraw");
    });
  });
});
