/**
 * URL パラメータ管理ユーティリティ
 * フォルダパスとファイル名の URL 連動機能
 */

export interface UrlFileParams {
  folder?: string;
  file?: string;
  baseFolder?: string;
  filepath?: string;
}

/**
 * URLパラメータからフォルダとファイル情報を取得
 */
export const getUrlFileParams = (): UrlFileParams => {
  if (typeof window === "undefined") {
    return {};
  }

  const urlParams = new URLSearchParams(window.location.search);

  return {
    folder: urlParams.get("folder")
      ? decodeURIComponent(urlParams.get("folder")!)
      : undefined,
    file: urlParams.get("file")
      ? decodeURIComponent(urlParams.get("file")!)
      : undefined,
    baseFolder: urlParams.get("baseFolder")
      ? decodeURIComponent(urlParams.get("baseFolder")!)
      : undefined,
    filepath: urlParams.get("filepath")
      ? decodeURIComponent(urlParams.get("filepath")!)
      : undefined,
  };
};

/**
 * URLパラメータを更新（履歴に追加せず）
 */
export const updateUrlFileParams = (params: UrlFileParams): void => {
  if (typeof window === "undefined") {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);

  // パラメータの更新（日本語文字のエンコーディング対応）
  if (params.folder !== undefined) {
    if (params.folder) {
      urlParams.set("folder", encodeURIComponent(params.folder));
    } else {
      urlParams.delete("folder");
    }
  }

  if (params.file !== undefined) {
    if (params.file) {
      urlParams.set("file", encodeURIComponent(params.file));
    } else {
      urlParams.delete("file");
    }
  }

  if (params.baseFolder !== undefined) {
    if (params.baseFolder) {
      urlParams.set("baseFolder", encodeURIComponent(params.baseFolder));
    } else {
      urlParams.delete("baseFolder");
    }
  }

  if (params.filepath !== undefined) {
    if (params.filepath) {
      urlParams.set("filepath", encodeURIComponent(params.filepath));
    } else {
      urlParams.delete("filepath");
    }
  }

  // URLを更新（履歴に追加しない）
  const newUrl = `${window.location.pathname}${
    urlParams.toString() ? `?${urlParams.toString()}` : ""
  }`;
  window.history.replaceState(null, "", newUrl);
};

/**
 * 完全なファイルパスを生成（クロスプラットフォーム対応）
 */
export const getFullFilePath = (
  folder?: string,
  file?: string,
): string | null => {
  if (!file) {
    return null;
  }

  if (!folder) {
    return file;
  }

  // フォルダパスを正規化（WindowsとUnix両対応）
  const normalizedFolder = normalizePath(folder).replace(/\/+$/, ""); // 末尾のスラッシュを削除

  return `${normalizedFolder}/${file}`;
};

/**
 * クロスプラットフォーム対応のパスセパレータを正規化（日本語対応）
 */
export const normalizePath = (path: string): string => {
  // Windowsのバックスラッシュと全角スラッシュをフォワードスラッシュに変換
  return path.replace(/[\\/／]/g, "/");
};

/**
 * ファイルパスをフォルダとファイル名に分解（クロスプラットフォーム対応）
 */
export const splitFilePath = (
  fullPath: string,
): { folder: string; file: string } => {
  // パスを正規化（WindowsとUnix両対応）
  const normalizedPath = normalizePath(fullPath);
  const lastSlashIndex = normalizedPath.lastIndexOf("/");

  if (lastSlashIndex === -1) {
    return {
      folder: "",
      file: normalizedPath,
    };
  }

  return {
    folder: normalizedPath.substring(0, lastSlashIndex),
    file: normalizedPath.substring(lastSlashIndex + 1),
  };
};

/**
 * URLパラメータの変更を監視
 */
export const watchUrlParams = (
  callback: (params: UrlFileParams) => void,
): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handlePopState = () => {
    callback(getUrlFileParams());
  };

  window.addEventListener("popstate", handlePopState);

  // 初回実行
  callback(getUrlFileParams());

  // クリーンアップ関数を返す
  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
};

/**
 * 安全なファイル名の生成（日本語対応）
 */
export const generateSafeFileName = (name: string): string => {
  if (!name) {
    return "untitled.excalidraw";
  }

  // 危険な文字のみを除去（日本語文字は保持）
  let safeName = name
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, "_") // 制御文字と危険文字のみ除去
    .replace(/\s+/g, "_") // 連続する空白をアンダースコアに
    .replace(/^\./, "_") // 先頭のドットを除去
    .replace(/\.+$/, ""); // 末尾のドットを除去

  // 空になった場合のフォールバック
  if (!safeName || safeName === "_") {
    safeName = "untitled";
  }

  // 拡張子の確認
  if (!safeName.endsWith(".excalidraw")) {
    safeName += ".excalidraw";
  }

  return safeName;
};
