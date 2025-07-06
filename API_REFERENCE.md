# Excalidraw フォルダ管理システム API リファレンス

## 📝 概要

このドキュメントは、Excalidraw フォルダ管理システムの API 仕様とフロントエンド統合方法を説明します。

## 🏗️ アーキテクチャ

```
┌─────────────────────┐    HTTP/JSON    ┌─────────────────────┐
│   Frontend          │────────────────→│   Backend API       │
│   (React/TypeScript)│←────────────────│   (FastAPI/Python)  │
│                     │                 │                     │
│ ├─ AutoSaveWrapper  │                 │ ├─ File Operations  │
│ ├─ FileSystemMgr    │                 │ ├─ Security Layer   │
│ ├─ FolderSelector   │                 │ ├─ Path Validation  │
│ ├─ URLParams        │                 │ ├─ Backup Manager   │
│ └─ BackupManager    │                 │ └─ Error Handling   │
└─────────────────────┘                 └─────────────────────┘
```

## 🌐 クロスプラットフォーム対応

### サポート環境

- **Windows**: `C:\Users\ユーザー\Documents\図面.excalidraw`
- **macOS/Linux**: `/Users/ユーザー/Desktop/図面.excalidraw`
- **日本語パス**: 完全対応（ひらがな・カタカナ・漢字・全角記号）
- **ネットワークパス**: `\\server\share\folder\file.excalidraw`

### パス正規化

すべてのパスは内部的に Unix 形式（`/`）に正規化されます：

```typescript
// 入力例
"C:\\Users\\田中太郎\\Documents\\図面.excalidraw"
"プロジェクト（２０２４年）／図面／設計書.excalidraw"

// 正規化後
"C:/Users/田中太郎/Documents/図面.excalidraw"
"プロジェクト（２０２４年）/図面/設計書.excalidraw"
```

## 🔧 バックエンド API 仕様

### ベース URL

```
http://localhost:8000
```

### 認証

現在は認証不要（開発環境）

### 共通レスポンス形式

#### 成功レスポンス

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

#### エラーレスポンス

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  detail?: string;
  status_code: number;
}
```

### エンドポイント詳細

#### 1. ヘルスチェック

**エンドポイント**: `GET /health`

**説明**: サーバーの稼働状況を確認

**レスポンス**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2. ファイル保存

**エンドポイント**: `POST /api/v1/files/save/`

**説明**: Excalidraw ファイルを指定パスに保存

**リクエスト**:

```typescript
interface FileSaveRequest {
  file_path: string; // 相対パス
  content: string; // JSON文字列
  create_directories: boolean; // ディレクトリ自動作成
}
```

**レスポンス**:

```typescript
interface FileSaveResponse {
  file_info: FileInfo;
  success: boolean;
  message: string;
}
```

**例**:

```javascript
const response = await fetch("/api/v1/files/save/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    file_path: "projects/my-project/design.excalidraw",
    content: JSON.stringify(excalidrawData),
    create_directories: true,
  }),
});
```

#### 3. ファイル読み込み

**エンドポイント**: `GET /api/v1/files/load/`

**説明**: 指定パスから Excalidraw ファイルを読み込み

**パラメータ**:

```typescript
interface FileLoadParams {
  file_path: string; // 相対パス
}
```

**レスポンス**:

```typescript
interface FileLoadResponse {
  content: string; // JSON文字列
  file_info: FileInfo;
  success: boolean;
}
```

**例**:

```javascript
const filePath = "projects/my-project/design.excalidraw";
const response = await fetch(
  `/api/v1/files/load/?file_path=${encodeURIComponent(filePath)}`,
);
const data = await response.json();
const excalidrawData = JSON.parse(data.content);
```

#### 4. ファイル一覧取得

**エンドポイント**: `GET /api/v1/files/`

**説明**: 指定ディレクトリのファイル一覧を取得

**パラメータ**:

```typescript
interface FileListParams {
  directory_path?: string; // 相対パス（省略時はルート）
}
```

**レスポンス**:

```typescript
interface DirectoryListing {
  current_path: string;
  files: FileInfo[];
  total_count: number;
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string; // ISO 8601形式
  is_directory: boolean;
  extension: string;
}
```

**例**:

```javascript
// ルートディレクトリ
const rootFiles = await fetch("/api/v1/files/").then((r) => r.json());

// サブディレクトリ
const projectFiles = await fetch("/api/v1/files/?directory_path=projects").then(
  (r) => r.json(),
);
```

#### 5. ファイル削除

**エンドポイント**: `DELETE /api/v1/files/`

**説明**: 指定ファイルを削除

**パラメータ**:

```typescript
interface FileDeleteParams {
  file_path: string; // 相対パス
}
```

**レスポンス**:

```typescript
interface FileDeleteResponse {
  success: boolean;
  message: string;
}
```

**例**:

```javascript
const filePath = "projects/old-design.excalidraw";
const response = await fetch(
  `/api/v1/files/?file_path=${encodeURIComponent(filePath)}`,
  { method: "DELETE" },
);
```

#### 6. ディレクトリ作成

**エンドポイント**: `POST /api/v1/files/directory/`

**説明**: 新しいディレクトリを作成

**リクエスト**:

```typescript
interface DirectoryCreateRequest {
  directory_path: string; // 相対パス
}
```

**レスポンス**:

```typescript
interface DirectoryCreateResponse {
  success: boolean;
  message: string;
  path: string; // 作成されたパス
}
```

#### 7. ファイル情報取得

**エンドポイント**: `GET /api/v1/files/info/`

**説明**: ファイルの詳細情報を取得

**パラメータ**:

```typescript
interface FileInfoParams {
  file_path: string; // 相対パス
}
```

**レスポンス**:

```typescript
interface FileInfoResponse {
  file_info: FileInfo;
  success: boolean;
}
```

### 共通パラメータ

#### base_folder

すべてのAPIエンドポイントで使用可能なクエリパラメータです。ファイル操作の基準ディレクトリを指定します。

**例**:

```bash
# デフォルト（現在のディレクトリ）
GET /api/v1/files/

# カスタムベースフォルダ
GET /api/v1/files/?base_folder=/Users/user/Documents

# Windows パス
GET /api/v1/files/?base_folder=C:\Users\user\Documents

# 日本語パス
GET /api/v1/files/?base_folder=/Users/田中太郎/ドキュメント
```

**注意**: パスに特殊文字や日本語が含まれる場合は、URLエンコードが必要です。

## 🔄 バックアップ機能

### 概要

ファイル保存時に自動的にバックアップファイルを作成し、設定可能な数のバックアップを保持します。バックアップファイルは専用の `backup/` フォルダに保存されます。

### バックアップ設定

```typescript
interface BackupConfig {
  maxBackups: number; // 保持するバックアップ数（デフォルト: 3）
  enabled: boolean; // バックアップ機能の有効/無効（デフォルト: true）
  backupOnSave: boolean; // 手動保存時のバックアップ作成（デフォルト: true）
  backupOnAutoSave: boolean; // 自動保存時のバックアップ作成（デフォルト: true）
}
```

### バックアップファイルの命名規則とフォルダ構造

**フォルダ構造**:

```
project-folder/
├── design.excalidraw          # メインファイル
├── diagram.excalidraw         # メインファイル
└── backup/                    # バックアップ専用フォルダ
    ├── design.backup.2024-01-15-14-30-25.excalidraw
    ├── design.backup.2024-01-15-14-25-10.excalidraw
    ├── diagram.backup.2024-01-15-14-20-45.excalidraw
    └── diagram.backup.2024-01-15-14-15-30.excalidraw
```

**命名規則**:

```
元ファイル名: design.excalidraw
バックアップ: backup/design.backup.2024-01-15-14-30-25.excalidraw
```

### フロントエンド API

#### FileSystemManager でのバックアップ利用

```typescript
import { FileSystemManager } from "@excalidraw/excalidraw/data/fileSystemManager";

// バックアップ設定付きで初期化
const fileManager = new FileSystemManager("http://localhost:8000", {
  maxBackups: 5,
  enabled: true,
  backupOnSave: true,
  backupOnAutoSave: true,
});

// バックアップ設定の更新
fileManager.updateBackupConfig({
  maxBackups: 10,
  enabled: true,
});

// バックアップ情報の取得
const backupInfo = await fileManager.getBackupInfo(
  "projects",
  "design.excalidraw",
);
console.log(
  `バックアップ数: ${backupInfo.backup_count}/${backupInfo.max_backups}`,
);
```

#### BackupManager の直接利用

```typescript
import { BackupManager } from "@excalidraw/excalidraw/data/backupManager";

const backupManager = new BackupManager(apiClient, {
  maxBackups: 5,
  enabled: true,
});

// 手動バックアップ作成
const backupFile = await backupManager.createBackup(
  "projects",
  "design.excalidraw",
);

// バックアップファイル一覧取得
const backups = await backupManager.getBackupFiles(
  "projects",
  "design.excalidraw",
);

// バックアップ付き保存
await backupManager.saveWithBackup(
  "projects",
  "design.excalidraw",
  jsonContent,
);

// バックアップ情報取得
const info = await backupManager.getBackupInfo("projects", "design.excalidraw");
```

### バックエンド API

#### バックアップ情報取得

**エンドポイント**: `GET /api/v1/files/backup/info/`

**パラメータ**:

```typescript
interface BackupInfoParams {
  file_path: string; // 相対パス
}
```

**レスポンス**:

```typescript
interface BackupInfoResponse {
  filename: string;
  backup_count: number;
  max_backups: number;
  backups: Array<{
    filename: string;
    timestamp: string;
    size: number;
  }>;
}
```

#### バックアップからの復元

**エンドポイント**: `POST /api/v1/files/backup/restore/`

**リクエスト**:

```typescript
interface BackupRestoreRequest {
  file_path: string; // 復元先ファイルパス
  backup_filename: string; // バックアップファイル名
}
```

#### バックアップ削除

**エンドポイント**: `DELETE /api/v1/files/backup/`

**パラメータ**:

```typescript
interface BackupDeleteParams {
  backup_filename: string; // バックアップファイル名
}
```

### 自動バックアップの動作

#### 保存時のバックアップフロー

1. **既存ファイル確認**: 保存先にファイルが存在するかチェック
2. **バックアップ作成**: 既存ファイルをタイムスタンプ付きファイル名でバックアップ
3. **メインファイル保存**: 新しい内容でメインファイルを更新
4. **古いバックアップ削除**: 設定数を超えた古いバックアップを削除

#### 自動保存との連携

```typescript
// AutoSaveWrapper での使用例
<AutoSaveWrapper
  elements={elements}
  appState={appState}
  files={files}
  backupConfig={{
    maxBackups: 5,
    enabled: true,
    backupOnAutoSave: true,
  }}
>
  <Excalidraw {...props} />
</AutoSaveWrapper>
```

### エラーハンドリング

```typescript
const saveWithBackupHandling = async (data: ExcalidrawData) => {
  try {
    await fileManager.saveToFolder("projects", "design.excalidraw", data);
    console.log("保存完了（バックアップ付き）");
  } catch (error) {
    if (error.message.includes("backup")) {
      console.warn(
        "バックアップ作成に失敗しましたが、メインファイルは保存されました",
      );
    } else {
      console.error("保存に失敗しました:", error.message);
    }
  }
};
```

### バックアップの監視とメンテナンス

```typescript
// バックアップ状況の監視
const monitorBackups = async () => {
  const files = await fileManager.listFolderContents("projects");

  for (const file of files.files) {
    if (file.name.endsWith(".excalidraw") && !file.name.includes(".backup.")) {
      const backupInfo = await fileManager.getBackupInfo("projects", file.name);
      console.log(`${file.name}: ${backupInfo.backup_count} バックアップ`);
    }
  }
};

// 定期的なバックアップクリーンアップ
setInterval(async () => {
  // 設定を超えた古いバックアップの削除は自動実行されます
  console.log("バックアップメンテナンス完了");
}, 3600000); // 1時間ごと
```

## 💻 フロントエンド統合

### TypeScript 型定義

#### インポート

```typescript
import { FileSystemManager } from "@excalidraw/excalidraw/data/fileSystemManager";
import {
  getUrlFileParams,
  updateUrlFileParams,
} from "@excalidraw/excalidraw/utils/urlParams";
import { AutoSaveWrapper } from "@excalidraw/excalidraw/components/AutoSaveWrapper";
```

#### 基本的なファイル操作

```typescript
// FileSystemManagerの初期化
const fileManager = new FileSystemManager("http://localhost:8000");

// ファイル保存
const saveFile = async (
  folderPath: string,
  fileName: string,
  data: ExcalidrawData,
) => {
  try {
    const result = await fileManager.saveToFolder(folderPath, fileName, data);
    console.log("保存成功:", result.file_info.path);
  } catch (error) {
    console.error("保存エラー:", error.message);
  }
};

// ファイル読み込み
const loadFile = async (folderPath: string, fileName: string) => {
  try {
    const data = await fileManager.loadFromFolder(folderPath, fileName);
    return data;
  } catch (error) {
    console.error("読み込みエラー:", error.message);
    return null;
  }
};
```

### AutoSaveWrapper 統合

```typescript
import { AutoSaveWrapper } from "@excalidraw/excalidraw";

const App = () => {
  const [elements, setElements] = useState([]);
  const [appState, setAppState] = useState({});
  const [files, setFiles] = useState({});

  return (
    <AutoSaveWrapper
      elements={elements}
      appState={appState}
      files={files}
      onAutoSaveStatusChange={(isEnabled, currentPath) => {
        console.log("自動保存状態:", isEnabled, currentPath);
      }}
    >
      <Excalidraw
        onChange={(elements, appState, files) => {
          setElements(elements);
          setAppState(appState);
          setFiles(files);
        }}
      />
    </AutoSaveWrapper>
  );
};
```

### URL パラメータ管理

URL パラメータを使用してファイルパスを指定し、直接アクセスできます。

#### パラメータ一覧

```typescript
interface UrlFileParams {
  folder?: string;       // フォルダパス
  file?: string;         // ファイル名
  baseFolder?: string;   // ベースフォルダ（作業ディレクトリ）
  filepath?: string;     // 完全ファイルパス
}
```

#### 基本的な使用方法

```typescript
import { getUrlFileParams, updateUrlFileParams } from "@excalidraw/excalidraw";

// 現在のURLパラメータ取得
const params = getUrlFileParams();
console.log("Current folder:", params.folder);
console.log("Current file:", params.file);
console.log("Base folder:", params.baseFolder);
console.log("Full filepath:", params.filepath);

// URLパラメータ更新
updateUrlFileParams({
  folder: "projects/web-app",
  file: "wireframes.excalidraw",
});
```

#### URL例

**1. フォルダ + ファイル指定**
```
http://localhost:3000?folder=projects&file=design.excalidraw
```

**2. ベースフォルダ指定**
```
http://localhost:3000?baseFolder=/Users/user/Documents&folder=projects&file=design.excalidraw
```

**3. 完全パス指定（クロスプラットフォーム対応）**

Windows:
```
http://localhost:3000?filepath=C:\Users\田中太郎\Documents\図面.excalidraw
```

macOS/Linux:
```
http://localhost:3000?filepath=/Users/田中太郎/Desktop/図面.excalidraw
```

日本語・全角文字:
```
http://localhost:3000?filepath=プロジェクト（２０２４年）／図面／設計書.excalidraw
```

#### 自動エンコーディング

日本語や特殊文字は自動的にURLエンコード/デコードされます：

```typescript
// 日本語パスの設定
updateUrlFileParams({
  filepath: "/Users/田中太郎/デスクトップ/図面.excalidraw"
});

// URL: ?filepath=%2FUsers%2F%E7%94%B0%E4%B8%AD%E5%A4%AA%E9%83%8E%2F...

// 取得時は自動デコード
const params = getUrlFileParams();
console.log(params.filepath); // "/Users/田中太郎/デスクトップ/図面.excalidraw"
```

## 🔄 自動保存機能

### 概要

URLパラメータでファイルが指定されている場合、自動的に保存機能が有効になります。変更内容は設定した間隔で自動保存されます。

### 自動保存の有効化条件

以下のいずれかのURLパラメータが設定されている場合に自動保存が有効になります：

- `file` パラメータが設定されている
- `filepath` パラメータが設定されている

### 使用方法

```typescript
import { AutoSaveWrapper } from "@excalidraw/excalidraw";

// Excalidrawコンポーネントをラップ
<AutoSaveWrapper
  elements={elements}
  appState={appState}
  files={files}
  onAutoSaveStatusChange={(isEnabled, currentPath) => {
    console.log(`自動保存: ${isEnabled ? '有効' : '無効'}`);
    if (currentPath) {
      console.log(`保存先: ${currentPath}`);
    }
  }}
>
  <Excalidraw />
</AutoSaveWrapper>
```

### 設定オプション

```typescript
interface AutoSaveOptions {
  saveInterval: number;    // 保存間隔（ミリ秒、デフォルト: 30000）
  debounceDelay: number;   // デバウンス遅延（ミリ秒、デフォルト: 2000）
}
```

### 手動保存

自動保存が有効な場合、`Ctrl+Shift+S`（macOSでは`Cmd+Shift+S`）で手動保存できます。

### ステータス表示

開発環境では、右上に自動保存のステータスが表示されます：

- 🔄 自動保存: 有効/無効
- 📁 フォルダ: 現在のフォルダパス
- 📄 ファイル: 現在のファイル名
- ✅ 最終保存: 最後に保存した時刻

### API呼び出しの流れ

1. **ファイル変更検出**: エレメントまたはアプリ状態の変更
2. **デバウンス処理**: 設定した遅延時間後に保存実行
3. **バックアップ作成**: 設定に応じてバックアップファイル作成
4. **ファイル保存**: `POST /api/v1/files/save/` でファイル保存
5. **ステータス更新**: 保存時刻とステータスを更新

### エラーハンドリング機能

```typescript
const apiCall = async () => {
  try {
    const response = await fetch("/api/v1/files/save/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error instanceof TypeError) {
      // ネットワークエラー
      console.error("ネットワークエラー:", error.message);
    } else {
      // APIエラー
      console.error("APIエラー:", error.message);
    }
    throw error;
  }
};
```

## 🔒 セキュリティ考慮事項

### 1. パス検証

```python
# バックエンドでの検証例
def validate_path(file_path: str) -> bool:
    # パストラバーサル攻撃防止
    if '..' in file_path:
        return False

    # 危険文字検出
    dangerous_chars = ['$', '`', '|', '&', ';', '<', '>', '"', "'"]
    if any(char in file_path for char in dangerous_chars):
        return False

    return True
```

### 2. ファイル形式制限

```python
# .excalidrawファイルのみ許可
ALLOWED_EXTENSIONS = ['.excalidraw']

def is_allowed_file(filename: str) -> bool:
    return any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS)
```

### 3. JSON 検証

```python
def validate_excalidraw_content(content: str) -> bool:
    try:
        data = json.loads(content)
        # Excalidraw形式の基本構造を確認
        required_fields = ['type', 'version', 'source', 'elements']
        return all(field in data for field in required_fields)
    except json.JSONDecodeError:
        return False
```

## 🧪 テスト方法

### 1. ユニットテスト（TypeScript）

```typescript
// urlParams.test.ts
import { getUrlFileParams, updateUrlFileParams } from "../utils/urlParams";

describe("URLパラメータ機能", () => {
  test("URLパラメータの取得", () => {
    // URL設定
    window.history.pushState({}, "", "?folder=test&file=example.excalidraw");

    const params = getUrlFileParams();
    expect(params.folder).toBe("test");
    expect(params.file).toBe("example.excalidraw");
  });
});
```

### 2. 統合テスト（API）

```typescript
// fileSystemManager.test.ts
import { FileSystemManager } from "../data/fileSystemManager";

describe("FileSystemManager", () => {
  const fileManager = new FileSystemManager("http://localhost:8000");

  test("ファイル保存・読み込み", async () => {
    const testData = { type: "excalidraw", elements: [] };

    // 保存
    await fileManager.saveToFolder("test", "sample.excalidraw", testData);

    // 読み込み
    const loadedData = await fileManager.loadFromFolder(
      "test",
      "sample.excalidraw",
    );

    expect(loadedData).toEqual(testData);
  });
});
```

### 3. E2E テスト

```javascript
// cypress/integration/folder-management.spec.js
describe("フォルダ管理機能", () => {
  it("URLパラメータでファイルを開く", () => {
    cy.visit("/?folder=test&file=sample.excalidraw");
    cy.get('[data-testid="excalidraw-canvas"]').should("be.visible");
  });

  it("自動保存が動作する", () => {
    cy.visit("/?folder=test&file=autosave-test.excalidraw");
    // 描画操作
    cy.get('[data-testid="excalidraw-canvas"]').click();
    // 自動保存の確認
    cy.get('[data-testid="autosave-status"]').should("contain", "有効");
  });
});
```

## 📊 パフォーマンス最適化

### 1. API 呼び出しの最適化

```typescript
// デバウンス機能付き保存
import { debounce } from "lodash";

const debouncedSave = debounce(async (data) => {
  await fileManager.saveToFolder(folder, fileName, data);
}, 2000);
```

### 2. キャッシュ戦略

```typescript
// ファイル一覧のキャッシュ
const folderCache = new Map<string, DirectoryListing>();

const getCachedFolderContents = async (folderPath: string) => {
  if (folderCache.has(folderPath)) {
    return folderCache.get(folderPath);
  }

  const contents = await fileManager.listFolderContents(folderPath);
  folderCache.set(folderPath, contents);
  return contents;
};
```

### 3. レスポンシブ UI

```typescript
// ローディング状態の管理
const [isLoading, setIsLoading] = useState(false);

const saveWithLoading = async (data) => {
  setIsLoading(true);
  try {
    await fileManager.saveToFolder(folder, fileName, data);
  } finally {
    setIsLoading(false);
  }
};
```

## 🚀 デプロイメント

### 1. 本番環境設定

```bash
# 環境変数
export VITE_API_BASE_URL=https://api.your-domain.com
export CORS_ORIGINS=https://your-domain.com
```

### 2. Docker 設定

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. リバースプロキシ設定（Nginx）

```nginx
location /api/ {
    proxy_pass http://backend:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location / {
    proxy_pass http://frontend:3000/;
    proxy_set_header Host $host;
}
```

この API リファレンスにより、Excalidraw フォルダ管理システムの完全な統合と活用が可能になります。
