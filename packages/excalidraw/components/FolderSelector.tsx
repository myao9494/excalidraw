/**
 * FolderSelector - フォルダ選択コンポーネント
 * ディレクトリ階層の表示とナビゲーションを提供
 */

import React, { useState, useEffect } from "react";

import type { FileSystemManager } from "../data/fileSystemManager";
import type { DirectoryListing, FileInfo } from "../data/api-types";

import Spinner from "./Spinner";
import { FilledButton } from "./FilledButton";
import { Modal } from "./Modal";
import "./FolderSelector.scss";

interface FolderSelectorProps {
  onFolderSelect: (folderPath: string) => void;
  fileManager: FileSystemManager;
  currentFolder?: string;
  showCreateButton?: boolean;
  showBreadcrumb?: boolean;
  maxHeight?: string;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  onFolderSelect,
  fileManager,
  currentFolder = "",
  showCreateButton = false,
  showBreadcrumb = true,
  maxHeight = "400px",
}) => {
  const [folders, setFolders] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  // フォルダ一覧を読み込み
  const loadFolders = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const listing = await fileManager.listFolderContents(path);
      setFolders(listing);
    } catch (err) {
      setError(fileManager.getErrorMessage(err as Error));
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    loadFolders(currentFolder);
  }, [currentFolder]);

  // フォルダクリック処理
  const handleFolderClick = (folderPath: string) => {
    onFolderSelect(folderPath);
  };

  // キーボードナビゲーション
  const handleKeyDown = (event: React.KeyboardEvent, folderPath: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleFolderClick(folderPath);
    }
  };

  // 新しいフォルダ作成
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      return;
    }

    setCreating(true);
    try {
      const folderPath = currentFolder
        ? `${currentFolder}/${newFolderName}`
        : newFolderName;

      await fileManager.createFolder(folderPath);
      setShowCreateDialog(false);
      setNewFolderName("");

      // フォルダ一覧を再読み込み
      await loadFolders(currentFolder);
    } catch (err) {
      setError(fileManager.getErrorMessage(err as Error));
    } finally {
      setCreating(false);
    }
  };

  // パンくずナビゲーション
  const renderBreadcrumb = () => {
    if (!showBreadcrumb || !currentFolder) {
      return null;
    }

    const segments = currentFolder.split("/").filter(Boolean);

    return (
      <nav className="breadcrumb-nav" data-testid="breadcrumb-nav">
        <button className="breadcrumb-item" onClick={() => onFolderSelect("")}>
          ホーム
        </button>
        {segments.map((segment, index) => {
          const path = segments.slice(0, index + 1).join("/");
          return (
            <React.Fragment key={path}>
              <span className="breadcrumb-separator">/</span>
              <button
                className="breadcrumb-item"
                onClick={() => onFolderSelect(path)}
              >
                {segment}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    );
  };

  // フォルダアイテム
  const renderFolderItem = (file: FileInfo) => {
    if (!file.is_directory) {
      return null;
    }

    const isSelected = file.path === currentFolder;

    return (
      <div
        key={file.path}
        className={`folder-item ${isSelected ? "selected" : ""}`}
        onClick={() => handleFolderClick(file.path)}
        onKeyDown={(e) => handleKeyDown(e, file.path)}
        tabIndex={0}
        role="option"
        aria-selected={isSelected}
      >
        <span className="folder-icon">📁</span>
        <span className="folder-name">{file.name}</span>
        <span className="folder-date">
          {new Date(file.modified).toLocaleDateString("ja-JP")}
        </span>
      </div>
    );
  };

  return (
    <div className="folder-selector" data-testid="folder-selector">
      <div className="folder-selector-header">
        <h3>フォルダを選択</h3>
        {showCreateButton && (
          <FilledButton
            label="新しいフォルダ"
            onClick={() => setShowCreateDialog(true)}
          >
            新しいフォルダ
          </FilledButton>
        )}
      </div>

      {renderBreadcrumb()}

      <div
        className="folder-list"
        style={{ maxHeight }}
        role="listbox"
        aria-label="フォルダ一覧"
      >
        {loading && (
          <div className="loading-container" data-testid="loading-spinner">
            <Spinner />
            <span>読み込み中...</span>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
            <FilledButton
              label="再試行"
              onClick={() => loadFolders(currentFolder)}
            >
              再試行
            </FilledButton>
          </div>
        )}

        {folders && !loading && (
          <>
            {folders.files.filter((file) => file.is_directory).length === 0 ? (
              <div className="empty-state">
                <span>フォルダがありません</span>
              </div>
            ) : (
              folders.files.map(renderFolderItem)
            )}
          </>
        )}
      </div>

      {/* フォルダ作成ダイアログ */}
      {showCreateDialog && (
        <Modal
          onCloseRequest={() => {
            setShowCreateDialog(false);
            setNewFolderName("");
          }}
          labelledBy="create-folder-dialog"
        >
          <div data-testid="create-folder-dialog">
            <h3>新しいフォルダを作成</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="フォルダ名を入力"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
            <div className="dialog-actions">
              <FilledButton
                label="キャンセル"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewFolderName("");
                }}
              >
                キャンセル
              </FilledButton>
              <FilledButton
                label={creating ? "作成中..." : "作成"}
                onClick={handleCreateFolder}
              >
                {creating ? "作成中..." : "作成"}
              </FilledButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
