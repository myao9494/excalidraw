/**
 * フォルダ保存アクション
 * フォルダ指定での保存・読み込み機能を提供
 */

import { KEYS } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { FileSystemManager } from "../data/fileSystemManager";
// import { serializeAsJSON } from "../data/json";
// import { t } from "../i18n";

import { folderIcon, LoadIcon, saveAs } from "../components/icons";

import { register } from "./register";

import type { AppState, BinaryFiles } from "../types";

// ファイルシステムマネージャーのインスタンス
let fileSystemManager: FileSystemManager | null = null;

const getFileSystemManager = (): FileSystemManager => {
  if (!fileSystemManager) {
    // 環境変数または設定からAPIベースURLを取得
    const apiBaseUrl = process.env.VITE_API_BASE_URL || "http://localhost:8000";
    fileSystemManager = new FileSystemManager(apiBaseUrl);
  }
  return fileSystemManager;
};

/**
 * フォルダに保存アクション
 */
export const actionSaveToFolder = register({
  name: "saveToActiveFile",
  label: "buttons.saveToFolder",
  icon: folderIcon,
  trackEvent: { category: "export", action: "saveToFolder" },
  predicate: (elements, appState, props, app) => {
    return (
      !!app.props.UIOptions.canvasActions.saveToActiveFile &&
      !appState.viewModeEnabled
    );
  },
  perform: async (elements, appState, value, app) => {
    try {
      // jsonExportダイアログを使用
      return {
        appState: {
          ...appState,
          openDialog: { name: "jsonExport" },
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    } catch (error: any) {
      console.error("フォルダ保存エラー:", error);
      return {
        appState: {
          ...appState,
          toast: { message: "フォルダ保存エラー" },
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    }
  },
});

/**
 * フォルダから読み込みアクション
 */
export const actionLoadFromFolder = register({
  name: "loadScene",
  label: "buttons.loadFromFolder",
  icon: LoadIcon,
  trackEvent: { category: "export", action: "loadFromFolder" },
  perform: async (elements, appState, value, app) => {
    try {
      // loadSceneアクションを実行してフォルダ読み込み機能を有効にする
      return {
        appState: {
          ...appState,
          toast: { message: "フォルダから読み込み機能を開始" },
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    } catch (error: any) {
      console.error("フォルダ読み込みエラー:", error);
      return {
        appState: {
          ...appState,
          toast: { message: "フォルダ読み込みエラー" },
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    }
  },
});

/**
 * 名前を付けて保存（フォルダ選択）アクション
 */
export const actionSaveAsWithFolder = register({
  name: "saveFileToDisk",
  label: "buttons.saveAsWithFolder",
  icon: saveAs,
  trackEvent: { category: "export", action: "saveAsWithFolder" },
  perform: async (elements, appState, value, app) => {
    try {
      // jsonExportダイアログを使用
      return {
        appState: {
          ...appState,
          openDialog: { name: "jsonExport" },
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    } catch (error: any) {
      console.error("名前を付けて保存エラー:", error);
      return {
        appState: {
          ...appState,
          toast: { message: "名前を付けて保存エラー" },
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    }
  },
  keyTest: (event) =>
    event.key === KEYS.S &&
    event.shiftKey &&
    event[KEYS.CTRL_OR_CMD] &&
    event.altKey,
});

/**
 * 実際のフォルダ保存処理
 * ダイアログから呼び出される
 */
export const performSaveToFolder = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  folderPath: string,
  fileName: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const fileManager = getFileSystemManager();

    // Excalidrawデータを作成（型互換性を考慮）
    const excalidrawData = {
      type: "excalidraw" as const,
      version: 2,
      source: "https://excalidraw.com",
      elements: elements.map((element) => ({
        ...element,
        groupIds: [...element.groupIds], // readonly配列をmutable配列に変換
      })),
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
      },
    };

    // フォルダに保存
    await fileManager.saveToFolder(folderPath, fileName, excalidrawData);

    return {
      success: true,
      message: `${folderPath}/${fileName} に保存しました`,
    };
  } catch (error: any) {
    console.error("フォルダ保存エラー:", error);
    return {
      success: false,
      message:
        fileSystemManager?.getErrorMessage(error) || "フォルダ保存エラー",
    };
  }
};

/**
 * 実際のフォルダ読み込み処理
 * ダイアログから呼び出される
 */
export const performLoadFromFolder = async (
  folderPath: string,
  fileName: string,
): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> => {
  try {
    const fileManager = getFileSystemManager();

    // フォルダから読み込み
    const excalidrawData = await fileManager.loadFromFolder(
      folderPath,
      fileName,
    );

    return {
      success: true,
      data: excalidrawData,
      message: `${folderPath}/${fileName} から読み込みました`,
    };
  } catch (error: any) {
    console.error("フォルダ読み込みエラー:", error);
    return {
      success: false,
      message:
        fileSystemManager?.getErrorMessage(error) || "フォルダ読み込みエラー",
    };
  }
};
