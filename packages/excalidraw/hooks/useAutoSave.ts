/**
 * 自動保存フック
 * URL パラメータに基づいてファイルを自動保存
 */

import { useEffect, useRef, useCallback, useState } from "react";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { FileSystemManager } from "../data/fileSystemManager";
import {
  getUrlFileParams,
  watchUrlParams,
  getFullFilePath,
  generateSafeFileName,
  splitFilePath,
} from "../utils/urlParams";

import type { AppState, BinaryFiles } from "../types";

interface UseAutoSaveOptions {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  onSaveSuccess?: (path: string) => void;
  onSaveError?: (error: Error) => void;
  saveInterval?: number; // 保存間隔（ミリ秒）
  debounceDelay?: number; // デバウンス遅延（ミリ秒）
}

export const useAutoSave = ({
  elements,
  appState,
  files,
  onSaveSuccess,
  onSaveError,
  saveInterval = 30000, // 30秒間隔
  debounceDelay = 2000, // 2秒のデバウンス
}: UseAutoSaveOptions) => {
  const fileManagerRef = useRef<FileSystemManager | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const performSaveRef = useRef<
    (folder?: string, file?: string, filepath?: string) => Promise<void>
  >(async () => {});

  // 現在のパラメータを状態として管理
  const [currentParams, setCurrentParams] = useState<{
    folder?: string;
    file?: string;
    filepath?: string;
  }>({});

  // FileSystemManager の初期化
  const getFileManager = useCallback(
    (baseFolder?: string): FileSystemManager => {
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

      // filepath使用時は毎回新しいインスタンスを作成
      if (baseFolder !== undefined) {
        return new FileSystemManager(apiBaseUrl, undefined, baseFolder);
      }

      if (!fileManagerRef.current) {
        const urlParams = getUrlFileParams();
        fileManagerRef.current = new FileSystemManager(
          apiBaseUrl,
          undefined,
          urlParams.baseFolder,
        );
      }
      return fileManagerRef.current;
    },
    [],
  );

  // 実際の保存処理
  const performSave = useCallback(
    async (folder?: string, file?: string, filepath?: string) => {
      let fileManager: FileSystemManager;
      let targetFolder: string;
      let fileName: string;

      // filepathが指定されている場合は特別な処理
      if (filepath) {
        // クロスプラットフォーム対応のパス分割
        const { folder: parentDir, file: extractedFileName } =
          splitFilePath(filepath);
        fileName = extractedFileName;

        // 親ディレクトリをベースフォルダとして設定
        fileManager = getFileManager(parentDir);

        // ファイル名のみをターゲットとして設定（相対パス）
        targetFolder = "";

        // filepath処理 (クロスプラットフォーム): baseFolder=${parentDir}, file=${fileName}
      } else {
        if (!file) {
          return;
        }
        fileManager = getFileManager();
        fileName = file;
        targetFolder = folder || "";
      }

      try {
        // ファイル名の処理：filepathの場合は元の名前を保持、通常の場合は安全化
        const safeFileName = filepath
          ? fileName
          : generateSafeFileName(fileName);

        // .excalidraw拡張子がない場合は追加
        const finalFileName = safeFileName.endsWith(".excalidraw")
          ? safeFileName
          : `${safeFileName}.excalidraw`;

        // Excalidraw データの作成
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
          files, // 画像データを含める
        };

        // 保存開始: folder="${targetFolder}", file="${finalFileName}"

        // フォルダに保存
        await fileManager.saveToFolder(
          targetFolder,
          finalFileName,
          excalidrawData,
        );

        const fullPath =
          filepath || getFullFilePath(targetFolder, finalFileName);
        lastSaveTimeRef.current = Date.now();

        if (onSaveSuccess && fullPath) {
          onSaveSuccess(fullPath);
        }

        // 自動保存完了: ${fullPath}
      } catch (error) {
        // 自動保存エラー: ${error}
        if (onSaveError) {
          onSaveError(error as Error);
        }
      }
    },
    [elements, appState, files, getFileManager, onSaveSuccess, onSaveError],
  );

  // performSaveをrefに保存
  performSaveRef.current = performSave;

  // デバウンス付き保存
  const debouncedSave = useCallback(
    (folder?: string, file?: string, filepath?: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        performSaveRef.current?.(folder, file, filepath);
      }, debounceDelay);
    },
    [debounceDelay],
  );

  // URLパラメータの変更を監視
  useEffect(() => {
    const cleanup = watchUrlParams((params) => {
      setCurrentParams(params);

      // URLパラメータに基づいて即座に保存
      if (params.filepath) {
        debouncedSave(undefined, undefined, params.filepath);
      } else if (params.file) {
        debouncedSave(params.folder, params.file);
      }
    });

    return cleanup;
  }, [debouncedSave]);

  // 要素やアプリ状態の変更時の保存（デバウンス付き）
  useEffect(() => {
    const { folder, file, filepath } = currentParams;
    if (elements.length > 0) {
      if (filepath) {
        debouncedSave(undefined, undefined, filepath);
      } else if (file) {
        debouncedSave(folder, file);
      }
    }
  }, [elements, appState.viewBackgroundColor, currentParams, debouncedSave]);

  // 定期的な自動保存
  useEffect(() => {
    if (saveInterval > 0) {
      intervalTimerRef.current = setInterval(() => {
        const { folder, file, filepath } = currentParams;
        const now = Date.now();

        // 最後の保存から指定時間が経過している場合のみ保存
        if (
          (file || filepath) &&
          now - lastSaveTimeRef.current >= saveInterval
        ) {
          if (filepath) {
            performSaveRef.current?.(undefined, undefined, filepath);
          } else if (file) {
            performSaveRef.current?.(folder, file);
          }
        }
      }, saveInterval);

      return () => {
        if (intervalTimerRef.current) {
          clearInterval(intervalTimerRef.current);
        }
      };
    }
  }, [saveInterval, currentParams]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, []);

  // 手動保存関数を返す
  const manualSave = useCallback(() => {
    const { folder, file, filepath } = currentParams;
    if (filepath) {
      performSaveRef.current?.(undefined, undefined, filepath);
    } else if (file) {
      performSaveRef.current?.(folder, file);
    }
  }, [currentParams]);

  return {
    manualSave,
    currentParams,
    isAutoSaveEnabled: !!(currentParams.file || currentParams.filepath),
  };
};
