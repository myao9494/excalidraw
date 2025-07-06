/**
 * 日本語パス対応のテスト
 */

import {
  normalizePath,
  splitFilePath,
  getFullFilePath,
  generateSafeFileName,
  getUrlFileParams,
  updateUrlFileParams,
} from "../utils/urlParams";

describe("Japanese Path Support", () => {
  describe("normalizePath with Japanese characters", () => {
    test("日本語フォルダ名の正規化", () => {
      expect(normalizePath("C:\\ユーザー\\テスト\\ファイル.txt")).toBe(
        "C:/ユーザー/テスト/ファイル.txt",
      );
      expect(normalizePath("/Users/テスト/書類/ファイル.excalidraw")).toBe(
        "/Users/テスト/書類/ファイル.excalidraw",
      );
    });

    test("ひらがな・カタカナ・漢字混在パス", () => {
      expect(
        normalizePath("C:\\プロジェクト\\図面\\設計書\\スケッチ.excalidraw"),
      ).toBe("C:/プロジェクト/図面/設計書/スケッチ.excalidraw");
    });

    test("日本語とアルファベット混在", () => {
      expect(
        normalizePath(
          "C:\\Users\\田中太郎\\Documents\\図面\\design.excalidraw",
        ),
      ).toBe("C:/Users/田中太郎/Documents/図面/design.excalidraw");
    });
  });

  describe("splitFilePath with Japanese paths", () => {
    test("日本語フォルダとファイル名の分割", () => {
      const result = splitFilePath(
        "C:\\ユーザー\\書類\\プロジェクト\\図面.excalidraw",
      );
      expect(result.folder).toBe("C:/ユーザー/書類/プロジェクト");
      expect(result.file).toBe("図面.excalidraw");
    });

    test("macOS日本語パスの分割", () => {
      const result = splitFilePath(
        "/Users/田中太郎/デスクトップ/スケッチ/図面.excalidraw",
      );
      expect(result.folder).toBe("/Users/田中太郎/デスクトップ/スケッチ");
      expect(result.file).toBe("図面.excalidraw");
    });

    test("全角文字を含むパス", () => {
      const result = splitFilePath(
        "プロジェクト（２０２４年）／図面／概要図.excalidraw",
      );
      expect(result.folder).toBe("プロジェクト（２０２４年）/図面");
      expect(result.file).toBe("概要図.excalidraw");
    });

    test("絵文字を含むパス", () => {
      const result = splitFilePath(
        "📁プロジェクト/🎨デザイン/図面📊.excalidraw",
      );
      expect(result.folder).toBe("📁プロジェクト/🎨デザイン");
      expect(result.file).toBe("図面📊.excalidraw");
    });
  });

  describe("getFullFilePath with Japanese paths", () => {
    test("日本語フォルダとファイルの結合", () => {
      expect(getFullFilePath("C:\\ユーザー\\書類", "図面.excalidraw")).toBe(
        "C:/ユーザー/書類/図面.excalidraw",
      );
    });

    test("複雑な日本語パスの結合", () => {
      expect(
        getFullFilePath(
          "プロジェクト\\設計図\\バージョン２",
          "最終版（確認済み）.excalidraw",
        ),
      ).toBe("プロジェクト/設計図/バージョン２/最終版（確認済み）.excalidraw");
    });
  });

  describe("generateSafeFileName with Japanese", () => {
    test("日本語ファイル名の安全化", () => {
      // 現在の実装では日本語文字は除去される可能性があるため、
      // まず現在の動作を確認
      const result = generateSafeFileName("図面設計書");
      console.log("generateSafeFileName result:", result);

      // 拡張子が追加されることを確認
      expect(result.endsWith(".excalidraw")).toBe(true);
    });

    test("危険文字を含む日本語ファイル名", () => {
      const result = generateSafeFileName("図面<設計>書|最終版.txt");
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).not.toContain("|");
      expect(result.endsWith(".excalidraw")).toBe(true);
    });
  });

  describe("URL parameter handling with Japanese", () => {
    // JSDOM環境での URLSearchParams のモック
    const mockURLSearchParams = (params: Record<string, string>) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.set(key, value);
      });

      // window.location.search をモック
      Object.defineProperty(window, "location", {
        value: {
          search: `?${searchParams.toString()}`,
        },
        writable: true,
      });
    };

    test("日本語パスのURL エンコーディング/デコーディング", () => {
      const japanesePath = "/Users/田中太郎/書類/図面.excalidraw";

      // URL エンコードされた状態をシミュレート
      const encodedPath = encodeURIComponent(japanesePath);
      mockURLSearchParams({ filepath: encodedPath });

      const params = getUrlFileParams();
      expect(params.filepath).toBe(japanesePath);
    });

    test("複雑な日本語パスのURL処理", () => {
      const complexPath = "プロジェクト（２０２４年）/図面/概要図.excalidraw";
      const encodedPath = encodeURIComponent(complexPath);

      mockURLSearchParams({ filepath: encodedPath });

      const params = getUrlFileParams();
      expect(params.filepath).toBe(complexPath);
    });
  });

  describe("Real-world Japanese scenarios", () => {
    test("典型的な日本のWindows環境パス", () => {
      const windowsPath =
        "C:\\Users\\田中太郎\\ドキュメント\\Excalidraw\\設計図\\システム構成図.excalidraw";
      const { folder, file } = splitFilePath(windowsPath);

      expect(folder).toBe("C:/Users/田中太郎/ドキュメント/Excalidraw/設計図");
      expect(file).toBe("システム構成図.excalidraw");

      const reconstructed = getFullFilePath(folder, file);
      expect(reconstructed).toBe(
        "C:/Users/田中太郎/ドキュメント/Excalidraw/設計図/システム構成図.excalidraw",
      );
    });

    test("macOS日本語環境パス", () => {
      const macPath =
        "/Users/田中太郎/デスクトップ/プロジェクト/UX設計/ワイヤーフレーム.excalidraw";
      const { folder, file } = splitFilePath(macPath);

      expect(folder).toBe("/Users/田中太郎/デスクトップ/プロジェクト/UX設計");
      expect(file).toBe("ワイヤーフレーム.excalidraw");
    });

    test("企業環境での日本語ネットワークパス", () => {
      const networkPath =
        "\\\\サーバー01\\共有フォルダ\\設計部\\図面\\配置図.excalidraw";
      const { folder, file } = splitFilePath(networkPath);

      expect(folder).toBe("//サーバー01/共有フォルダ/設計部/図面");
      expect(file).toBe("配置図.excalidraw");
    });

    test("全角記号を含むパス", () => {
      const symbolPath =
        "プロジェクト（２０２４年度）／第１四半期／図面［最終版］.excalidraw";
      const { folder, file } = splitFilePath(symbolPath);

      expect(folder).toBe("プロジェクト（２０２４年度）/第１四半期");
      expect(file).toBe("図面［最終版］.excalidraw");
    });
  });
});
