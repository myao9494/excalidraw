/**
 * FileBrowser - ファイルブラウザーコンポーネント
 * ファイル一覧の表示、選択、操作を提供
 */

import React, { useState, useMemo } from "react";

import type { FileInfo } from "../data/api-types";

import { FilledButton } from "./FilledButton";
import { Modal } from "./Modal";
import "./FileBrowser.scss";

type SortBy = "name" | "size" | "modified";
type SortOrder = "asc" | "desc";

interface FileBrowserProps {
  files: FileInfo[];
  onFileSelect: (file: FileInfo) => void;
  onFolderNavigate: (folderPath: string) => void;
  onFileDelete?: (file: FileInfo) => void;
  showDeleteButton?: boolean;
  showExcalidrawOnly?: boolean;
  searchQuery?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  maxHeight?: string;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  onFileSelect,
  onFolderNavigate,
  onFileDelete,
  showDeleteButton = false,
  showExcalidrawOnly = false,
  searchQuery = "",
  sortBy = "name",
  sortOrder = "asc",
  maxHeight = "500px",
}) => {
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<FileInfo | null>(
    null,
  );

  // ファイルのフィルタリングとソート
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    // Excalidrawファイルのみ表示するフィルター
    if (showExcalidrawOnly) {
      filtered = files.filter(
        (file) => file.is_directory || file.extension === ".excalidraw",
      );
    }

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      // フォルダを最初に表示
      if (a.is_directory && !b.is_directory) {
        return -1;
      }
      if (!a.is_directory && b.is_directory) {
        return 1;
      }

      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ja");
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "modified":
          comparison =
            new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [files, showExcalidrawOnly, searchQuery, sortBy, sortOrder]);

  // ファイル/フォルダクリック処理
  const handleItemClick = (file: FileInfo) => {
    if (file.is_directory) {
      onFolderNavigate(file.path);
    } else {
      onFileSelect(file);
    }
  };

  // キーボードナビゲーション
  const handleKeyDown = (event: React.KeyboardEvent, file: FileInfo) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleItemClick(file);
    }
  };

  // 削除ボタンクリック処理
  const handleDeleteClick = (event: React.MouseEvent, file: FileInfo) => {
    event.stopPropagation();
    setDeleteConfirmFile(file);
  };

  // 削除確認処理
  const handleDeleteConfirm = () => {
    if (deleteConfirmFile && onFileDelete) {
      onFileDelete(deleteConfirmFile);
      setDeleteConfirmFile(null);
    }
  };

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // 日付をフォーマット
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  // ファイルアイコンを取得
  const getFileIcon = (file: FileInfo): string => {
    if (file.is_directory) {
      return "📁";
    }

    switch (file.extension) {
      case ".excalidraw":
        return "📊";
      case ".json":
        return "📄";
      case ".png":
      case ".jpg":
      case ".jpeg":
      case ".gif":
        return "🖼️";
      default:
        return "📄";
    }
  };

  // ファイルアイテムのレンダリング
  const renderFileItem = (file: FileInfo, index: number) => {
    return (
      <div
        key={file.path}
        className={`file-item ${file.is_directory ? "folder" : "file"}`}
        onClick={() => handleItemClick(file)}
        onDoubleClick={() => handleItemClick(file)}
        onKeyDown={(e) => handleKeyDown(e, file)}
        tabIndex={0}
        role="gridcell"
        data-testid={`file-item-${index}`}
      >
        <span className="file-icon">{getFileIcon(file)}</span>

        <div className="file-info">
          <span className="file-name" title={file.name}>
            {file.name}
          </span>

          <div className="file-meta">
            {!file.is_directory && (
              <span className="file-size">{formatFileSize(file.size)}</span>
            )}
            <span className="file-date">{formatDate(file.modified)}</span>
          </div>
        </div>

        {showDeleteButton && onFileDelete && (
          <button
            className="delete-button"
            onClick={(e) => handleDeleteClick(e, file)}
            aria-label="削除"
            title={`${file.name}を削除`}
          >
            🗑️
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="file-browser" data-testid="file-browser">
      <div
        className="file-list"
        style={{ maxHeight }}
        role="grid"
        aria-label="ファイル一覧"
      >
        {filteredAndSortedFiles.length === 0 ? (
          <div className="empty-state">
            <span>ファイルがありません</span>
            {searchQuery && (
              <span className="search-hint">検索条件: "{searchQuery}"</span>
            )}
          </div>
        ) : (
          filteredAndSortedFiles.map(renderFileItem)
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {deleteConfirmFile && (
        <Modal
          onCloseRequest={() => setDeleteConfirmFile(null)}
          labelledBy="delete-confirm-dialog"
        >
          <div data-testid="delete-confirm-dialog">
            <h3>ファイル削除の確認</h3>
            <p>
              <strong>{deleteConfirmFile.name}</strong> を削除しますか？
            </p>
            <p className="warning-text">この操作は取り消すことができません。</p>
            <div className="dialog-actions">
              <FilledButton
                label="キャンセル"
                onClick={() => setDeleteConfirmFile(null)}
              >
                キャンセル
              </FilledButton>
              <FilledButton
                label="削除"
                color="danger"
                onClick={handleDeleteConfirm}
              >
                削除
              </FilledButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
