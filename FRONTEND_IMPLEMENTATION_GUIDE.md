# 🎨 フロントエンド実装ガイド

## 📋 概要

Excalidraw にフォルダ指定機能を追加するためのフロントエンド実装ガイドです。バックエンド API（FastAPI）との連携を含めた実装手順を説明します。

## ✅ 前提条件

- **バックエンド**: 実装完了 ✅
- **API 仕様**: 確定済み ✅
- **型定義**: 作成済み ✅
- **API クライアント**: 作成済み ✅

## 🎯 実装ターゲット

### 主要機能

1. **フォルダ指定保存**: 任意のフォルダに Excalidraw ファイルを保存
2. **フォルダ階層表示**: ディレクトリ構造の表示・ナビゲーション
3. **ファイル管理**: 保存・読み込み・削除・一覧表示
4. **URL 同期**: URL にフォルダパスを含める
5. **File System API 連携**: ローカルファイルシステムとの統合

### UI 要素

- フォルダ選択ダイアログ
- ファイルブラウザー
- パンくずナビゲーション
- 保存先指定 UI

## 🏗️ アーキテクチャ

### ファイル配置（推奨）

```
src/
├── data/
│   └── filesystem.ts          # 新規作成：ファイルシステム管理
├── components/
│   ├── FileBrowser.tsx         # 新規作成：ファイルブラウザー
│   ├── FolderSelector.tsx      # 新規作成：フォルダ選択
│   └── SaveDialog.tsx          # 新規作成：保存ダイアログ
├── actions/
│   └── actionExport.ts         # 修正：保存機能強化
├── types.ts                    # 修正：型定義追加
└── api/
    ├── types.ts               # APIクライアント型定義
    └── client.ts              # APIクライアント
```

## 📁 ファイル実装

### 1️⃣ API 関連ファイル

#### `src/api/types.ts`

```typescript
// frontend-api-types.ts の内容をコピー
export * from "../../frontend-api-types";
```

#### `src/api/client.ts`

```typescript
// frontend-api-client.ts の内容をコピー
export * from "../../frontend-api-client";
```

### 2️⃣ ファイルシステム管理

#### `src/data/filesystem.ts`

```typescript
import { ExcalidrawApiClient, createApiClient } from "../api/client";
import { ExcalidrawData } from "../api/types";

export class FileSystemManager {
  private apiClient: ExcalidrawApiClient;
  private currentFolder: string = "";

  constructor(apiBaseUrl: string = "http://localhost:8000") {
    this.apiClient = createApiClient(apiBaseUrl);
  }

  async saveToFolder(
    folderPath: string,
    fileName: string,
    data: ExcalidrawData,
  ): Promise<void> {
    const filePath = this.apiClient.buildFilePath(folderPath, fileName);
    await this.apiClient.saveFile(filePath, data);
  }

  async loadFromFolder(
    folderPath: string,
    fileName: string,
  ): Promise<ExcalidrawData> {
    const filePath = this.apiClient.buildFilePath(folderPath, fileName);
    const result = await this.apiClient.loadFile(filePath);
    return result.data;
  }

  // その他のメソッド...
}
```

### 3️⃣ UI コンポーネント

#### `src/components/FolderSelector.tsx`

```typescript
import React, { useState, useEffect } from "react";
import { DirectoryListing } from "../api/types";
import { createApiClient } from "../api/client";

interface FolderSelectorProps {
  onFolderSelect: (folderPath: string) => void;
  currentFolder?: string;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  onFolderSelect,
  currentFolder = "",
}) => {
  const [folders, setFolders] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(false);
  const apiClient = createApiClient();

  useEffect(() => {
    loadFolders(currentFolder);
  }, [currentFolder]);

  const loadFolders = async (path: string) => {
    setLoading(true);
    try {
      const listing = await apiClient.listFiles(path);
      setFolders(listing);
    } catch (error) {
      console.error("フォルダ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  return <div className="folder-selector">{/* フォルダ選択UI */}</div>;
};
```

#### `src/components/FileBrowser.tsx`

```typescript
import React from "react";
import { FileInfo } from "../api/types";

interface FileBrowserProps {
  files: FileInfo[];
  onFileSelect: (file: FileInfo) => void;
  onFolderNavigate: (folderPath: string) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  onFileSelect,
  onFolderNavigate,
}) => {
  return (
    <div className="file-browser">
      {files.map((file) => (
        <div
          key={file.path}
          className={`file-item ${file.is_directory ? "folder" : "file"}`}
          onClick={() => {
            if (file.is_directory) {
              onFolderNavigate(file.path);
            } else {
              onFileSelect(file);
            }
          }}
        >
          <span className="file-icon">{file.is_directory ? "📁" : "📄"}</span>
          <span className="file-name">{file.name}</span>
          {!file.is_directory && (
            <span className="file-size">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 4️⃣ 保存機能の拡張

#### `src/actions/actionExport.ts` の修正

```typescript
// 既存のexport機能を拡張
import { FileSystemManager } from "../data/filesystem";

export const saveToFolder = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  folderPath: string,
  fileName: string,
) => {
  const fileManager = new FileSystemManager();

  const excalidrawData = {
    type: "excalidraw" as const,
    version: 2,
    source: "https://excalidraw.com",
    elements,
    appState: exportToFileIcon(appState),
  };

  try {
    await fileManager.saveToFolder(folderPath, fileName, excalidrawData);
    // 成功通知
  } catch (error) {
    // エラーハンドリング
    console.error("保存エラー:", error);
  }
};
```

## 🔧 実装手順

### フェーズ 1: 基盤準備

1. **API クライアント統合**

   ```bash
   # ファイルをコピー
   cp frontend-api-types.ts src/api/types.ts
   cp frontend-api-client.ts src/api/client.ts
   ```

2. **依存関係確認**
   ```bash
   # 必要に応じてパッケージ追加
   yarn add @types/node  # Path操作用
   ```

### フェーズ 2: 基本機能実装

1. **FileSystemManager 作成**
2. **FolderSelector 基本 UI 実装**
3. **FileBrowser 基本 UI 実装**
4. **保存機能統合**

### フェーズ 3: UI 統合

1. **メインメニューに統合**
2. **保存ダイアログ拡張**
3. **読み込み機能統合**
4. **エラーハンドリング強化**

### フェーズ 4: 高度な機能

1. **URL 同期機能**
2. **File System API 連携**
3. **パフォーマンス最適化**
4. **UX 改善**

## 🎨 UI/UX 設計

### 保存ダイアログの拡張

```
┌─────────────────────────────────┐
│ Save Excalidraw File            │
├─────────────────────────────────┤
│ Folder: [📁 Dropdown ▼]        │
│ ┌─────────────────────────────┐ │
│ │ 📁 project-a                │ │
│ │ 📁 project-b                │ │
│ │ 📁 drawings                 │ │
│ │ ➕ Create New Folder        │ │
│ └─────────────────────────────┘ │
│                                 │
│ File name: [my-diagram.excal...] │
│                                 │
│ ☑ Create folders if needed     │
│                                 │
│ [Cancel]  [Save]                │
└─────────────────────────────────┘
```

### フォルダナビゲーション

```
Home > projects > diagrams > architecture
                               ↑
                         Current folder
```

## 🔗 URL 設計

### URL パラメータ

```typescript
// URL例
// https://excalidraw.com/?folder=projects/diagrams&file=architecture.excalidraw

interface UrlParams {
  folder?: string; // フォルダパス
  file?: string; // ファイル名
}

// URLから状態を復元
export const parseUrlParams = (): UrlParams => {
  const params = new URLSearchParams(window.location.search);
  return {
    folder: params.get("folder") || "",
    file: params.get("file") || "",
  };
};

// 状態をURLに反映
export const updateUrl = (folder: string, file?: string) => {
  const params = new URLSearchParams();
  if (folder) params.set("folder", folder);
  if (file) params.set("file", file);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, "", newUrl);
};
```

## 🧪 テスト戦略

### ユニットテスト

```typescript
// FileSystemManager のテスト
describe("FileSystemManager", () => {
  test("should save file to specified folder", async () => {
    const manager = new FileSystemManager();
    await expect(
      manager.saveToFolder("test-folder", "test.excalidraw", mockData),
    ).resolves.not.toThrow();
  });
});
```

### 統合テスト

1. **API 連携テスト**: バックエンドとの連携確認
2. **UI 操作テスト**: フォルダ選択・ファイル保存フロー
3. **エラーケーステスト**: ネットワークエラー・権限エラー等

## 🚀 デプロイ・設定

### 開発環境

```bash
# バックエンド起動
cd backend && python main.py

# フロントエンド起動
yarn dev

# APIベースURL設定
export VITE_API_BASE_URL=http://localhost:8000
```

### 本番環境

```typescript
// 環境別設定
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.your-domain.com"
    : "http://localhost:8000";
```

## 📋 チェックリスト

### 基本機能

- [ ] ファイル保存（フォルダ指定）
- [ ] ファイル読み込み（フォルダ指定）
- [ ] フォルダ一覧表示
- [ ] フォルダ作成
- [ ] ファイル削除

### UI/UX

- [ ] フォルダ選択ダイアログ
- [ ] ファイルブラウザー
- [ ] パンくずナビゲーション
- [ ] エラーメッセージ表示

### 統合

- [ ] 既存保存機能との統合
- [ ] メインメニュー統合
- [ ] URL 同期機能
- [ ] File System API 連携

### テスト・品質

- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] エラーハンドリング
- [ ] パフォーマンス最適化

このガイドに従って実装することで、Excalidraw にフォルダ指定機能を安全かつ効率的に追加できます。
