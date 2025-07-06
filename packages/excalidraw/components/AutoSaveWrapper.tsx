/**
 * 自動保存機能付きExcalidrawラッパー
 * URL パラメータに基づく自動保存機能を提供
 */

import React, { useState, useEffect } from "react";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { useAutoSave } from "../hooks/useAutoSave";
import { getUrlFileParams, updateUrlFileParams } from "../utils/urlParams";

import type { AppState, BinaryFiles } from "../types";

interface AutoSaveWrapperProps {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  children: React.ReactNode;
  onAutoSaveStatusChange?: (isEnabled: boolean, currentPath?: string) => void;
}

export const AutoSaveWrapper: React.FC<AutoSaveWrapperProps> = ({
  elements,
  appState,
  files,
  children,
  onAutoSaveStatusChange,
}) => {
  const [saveStatus, setSaveStatus] = useState<{
    lastSaved?: string;
    error?: string;
    isEnabled: boolean;
  }>({ isEnabled: false });

  const { manualSave, currentParams, isAutoSaveEnabled } = useAutoSave({
    elements,
    appState,
    files,
    onSaveSuccess: (path) => {
      setSaveStatus((prev) => ({
        ...prev,
        lastSaved: new Date().toLocaleTimeString(),
        error: undefined,
      }));

      console.log(`✅ 自動保存成功: ${path}`);
    },
    onSaveError: (error) => {
      setSaveStatus((prev) => ({
        ...prev,
        error: error.message,
      }));

      console.error("❌ 自動保存エラー:", error);
    },
    saveInterval: 30000, // 30秒間隔
    debounceDelay: 2000, // 2秒のデバウンス
  });

  // 自動保存の状態変化を親コンポーネントに通知
  useEffect(() => {
    const currentPath =
      currentParams.filepath ||
      (currentParams.folder && currentParams.file
        ? `${currentParams.folder}/${currentParams.file}`
        : currentParams.file);

    setSaveStatus((prev) => ({ ...prev, isEnabled: isAutoSaveEnabled }));

    if (onAutoSaveStatusChange) {
      onAutoSaveStatusChange(isAutoSaveEnabled, currentPath);
    }
  }, [
    isAutoSaveEnabled,
    currentParams.folder,
    currentParams.file,
    currentParams.filepath,
    onAutoSaveStatusChange,
  ]);

  // グローバルショートカットで手動保存
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "s" &&
        event.shiftKey
      ) {
        event.preventDefault();
        if (isAutoSaveEnabled) {
          manualSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [manualSave, isAutoSaveEnabled]);

  return (
    <>
      {children}

      {/* 自動保存ステータス表示（デバッグ用） */}
      {import.meta.env.DEV && (
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            padding: "8px 12px",
            background: saveStatus.isEnabled ? "#e8f5e8" : "#f5f5f5",
            border: `1px solid ${saveStatus.isEnabled ? "#4caf50" : "#ccc"}`,
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "monospace",
            zIndex: 9999,
            maxWidth: 300,
          }}
        >
          <div>🔄 自動保存: {saveStatus.isEnabled ? "有効" : "無効"}</div>
          {currentParams.filepath ? (
            <div>📄 完全パス: {currentParams.filepath}</div>
          ) : (
            <>
              {currentParams.folder && (
                <div>📁 フォルダ: {currentParams.folder}</div>
              )}
              {currentParams.file && (
                <div>📄 ファイル: {currentParams.file}</div>
              )}
            </>
          )}
          {saveStatus.lastSaved && (
            <div>✅ 最終保存: {saveStatus.lastSaved}</div>
          )}
          {saveStatus.error && (
            <div style={{ color: "red" }}>❌ エラー: {saveStatus.error}</div>
          )}
          {saveStatus.isEnabled && (
            <div style={{ fontSize: 10, marginTop: 4 }}>
              Ctrl+Shift+S: 手動保存
            </div>
          )}
        </div>
      )}
    </>
  );
};
