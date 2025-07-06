/**
 * SaveToFolderDialog - フォルダ保存ダイアログ
 * フォルダ選択とファイル名入力を統合したダイアログ
 */

import React, { useState, useEffect } from "react";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { FileSystemManager } from "../data/fileSystemManager";

import { performSaveToFolder } from "../actions/actionFolderSave";

// import { t } from "../i18n";

import { FolderSelector } from "./FolderSelector";
// import { FileBrowser } from "./FileBrowser";
import { FilledButton } from "./FilledButton";
import { Modal } from "./Modal";

import "./SaveToFolderDialog.scss";

import type { AppState, BinaryFiles } from "../types";

interface SaveToFolderDialogProps {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  onClose: () => void;
  onSave?: (folderPath: string, fileName: string) => void;
}

export const SaveToFolderDialog: React.FC<SaveToFolderDialogProps> = ({
  elements,
  appState,
  files,
  onClose,
  onSave,
}) => {
  const [fileManager] = useState(() => new FileSystemManager());
  const [currentFolder, setCurrentFolder] = useState("");
  const [fileName, setFileName] = useState(appState.name || "untitled");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ファイル名を正規化
  useEffect(() => {
    if (fileName && !fileName.endsWith(".excalidraw")) {
      const safeName = fileManager.generateSafeFileName(fileName);
      setFileName(safeName);
    }
  }, [fileName, fileManager]);

  // フォルダ選択処理
  const handleFolderSelect = (folderPath: string) => {
    setCurrentFolder(folderPath);
    setError(null);
  };

  // 保存処理
  const handleSave = async () => {
    if (!fileName.trim()) {
      setError("無効なファイル名です");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await performSaveToFolder(
        elements,
        appState,
        files,
        currentFolder,
        fileName,
      );

      if (result.success) {
        if (onSave) {
          onSave(currentFolder, fileName);
        }
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(fileManager.getErrorMessage(err as Error));
    } finally {
      setSaving(false);
    }
  };

  // キーボードショートカット
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !saving) {
      event.preventDefault();
      handleSave();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Modal
      onCloseRequest={onClose}
      labelledBy="save-to-folder-dialog"
      className="save-to-folder-dialog"
    >
      <div data-testid="save-to-folder-dialog" onKeyDown={handleKeyDown}>
        <header className="dialog-header">
          <h2>フォルダに保存</h2>
          <p>保存先のフォルダを選択してファイル名を入力してください</p>
        </header>

        <div className="dialog-content">
          {/* フォルダ選択 */}
          <div className="folder-section">
            <label htmlFor="folder-selector">保存先フォルダ</label>
            <FolderSelector
              fileManager={fileManager}
              onFolderSelect={handleFolderSelect}
              currentFolder={currentFolder}
              showCreateButton={true}
              showBreadcrumb={true}
            />
          </div>

          {/* ファイル名入力 */}
          <div className="filename-section">
            <label htmlFor="filename-input">ファイル名</label>
            <input
              id="filename-input"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="untitled.excalidraw"
              autoFocus
            />
            <small className="filename-hint">
              .excalidraw拡張子は自動で追加されます
            </small>
          </div>

          {/* 現在のフォルダパス表示 */}
          {currentFolder && (
            <div className="current-path">
              <strong>保存先:</strong> {currentFolder}/{fileName}
            </div>
          )}

          {/* エラーメッセージ */}
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </div>

        <footer className="dialog-footer">
          <FilledButton label="キャンセル" onClick={onClose}>
            キャンセル
          </FilledButton>
          <FilledButton
            label={saving ? "保存中..." : "保存"}
            color="primary"
            onClick={handleSave}
          >
            {saving ? "保存中..." : "保存"}
          </FilledButton>
        </footer>
      </div>
    </Modal>
  );
};
