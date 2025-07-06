# Excalidraw フォルダ管理システム 開発ガイド

## 📝 概要

このガイドでは、Excalidraw フォルダ管理システムの開発、拡張、メンテナンス方法について詳しく説明します。

## 🏗️ 開発環境セットアップ

### 前提条件

- Node.js 18 以上
- Python 3.8 以上
- Git
- yarn

### 1. プロジェクトのクローン

```bash
git clone https://github.com/your-username/excalidraw.git
cd excalidraw
```

### 2. フロントエンド環境構築

```bash
# 依存関係のインストール
yarn install

# 開発サーバー起動
cd excalidraw-app
yarn start
# → http://localhost:3001 で起動
```

### 3. バックエンド環境構築

```bash
# バックエンドディレクトリに移動
cd backend

# 仮想環境作成（オプション）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# サーバー起動
python main.py
# → http://localhost:8000 で起動
```

### 4. 環境変数設定

```bash
# .env ファイル作成
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3001
EOF
```

## 📁 プロジェクト構造

```
excalidraw/
├── packages/excalidraw/               # コアライブラリ
│   ├── components/
│   │   ├── AutoSaveWrapper.tsx       # 自動保存機能
│   │   ├── FolderSelector.tsx        # フォルダ選択UI
│   │   └── SaveToFolderDialog.tsx    # 保存ダイアログ
│   ├── data/
│   │   ├── api-client.ts             # APIクライアント
│   │   ├── api-types.ts              # 型定義
│   │   └── fileSystemManager.ts      # ファイル管理
│   ├── hooks/
│   │   └── useAutoSave.ts            # 自動保存フック
│   ├── utils/
│   │   └── urlParams.ts              # URLパラメータ管理
│   └── actions/
│       └── actionFolderSave.tsx      # フォルダ保存アクション
├── excalidraw-app/                    # Webアプリケーション
│   └── App.tsx                       # メインアプリ（起動時読み込み実装）
├── backend/                          # FastAPIバックエンド
│   ├── main.py                       # メインサーバー
│   ├── routers/
│   │   └── files.py                  # ファイル操作API
│   └── services/
│       └── file_manager.py           # ファイル管理サービス
├── docs/                             # ドキュメント
│   ├── USER_GUIDE.md
│   ├── API_REFERENCE.md
│   └── DEVELOPMENT_GUIDE.md
└── tests/                            # テストファイル
```

## 🔧 開発ワークフロー

### 1. 新機能の開発

#### ブランチ戦略

```bash
# 機能ブランチ作成
git checkout -b feature/new-feature-name
git push -u origin feature/new-feature-name

# 開発完了後
git checkout dev
git merge feature/new-feature-name
```

#### コードレビューフロー

1. 機能実装完了
2. テスト作成・実行
3. ESLint/Prettier チェック
4. プルリクエスト作成
5. コードレビュー
6. マージ

### 2. テスト駆動開発（TDD）

#### テスト作成例

```typescript
// useAutoSave.test.ts
import { renderHook } from "@testing-library/react";
import { useAutoSave } from "../hooks/useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => {
    // URLパラメータをクリア
    window.history.pushState({}, "", "/");
  });

  test("URLパラメータがない場合は自動保存無効", () => {
    const { result } = renderHook(() =>
      useAutoSave({
        elements: [],
        appState: {},
        files: {},
      }),
    );

    expect(result.current.isAutoSaveEnabled).toBe(false);
  });

  test("有効なURLパラメータで自動保存有効", () => {
    window.history.pushState({}, "", "?file=test.excalidraw");

    const { result } = renderHook(() =>
      useAutoSave({
        elements: [],
        appState: {},
        files: {},
      }),
    );

    expect(result.current.isAutoSaveEnabled).toBe(true);
  });
});
```

#### 実装フロー

1. **テスト作成**: 期待される動作をテストで定義
2. **テスト実行**: 失敗することを確認
3. **実装**: テストを通すための最小実装
4. **リファクタリング**: コード品質向上
5. **テスト再実行**: すべてのテストが通過することを確認

### 3. コード品質管理

#### ESLint 設定

```bash
# ESLintチェック
yarn eslint packages/excalidraw --ext .ts,.tsx

# 自動修正
yarn eslint packages/excalidraw --ext .ts,.tsx --fix
```

#### TypeScript チェック

```bash
# 型チェック
yarn test:typecheck

# ビルドテスト
yarn build
```

#### テスト実行

```bash
# 全テスト実行
yarn test

# 特定ファイルのテスト
yarn test useAutoSave.test.ts

# カバレッジ付きテスト
yarn test --coverage
```

## 🎯 主要コンポーネントの開発

### 1. AutoSaveWrapper 拡張

#### 新機能追加例

```typescript
// packages/excalidraw/components/AutoSaveWrapper.tsx

interface AutoSaveWrapperProps {
  // 既存のプロパティ
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  children: React.ReactNode;

  // 新しいプロパティ例
  saveInterval?: number; // 保存間隔のカスタマイズ
  onSaveStart?: () => void; // 保存開始コールバック
  onSaveComplete?: () => void; // 保存完了コールバック
  enableManualSave?: boolean; // 手動保存の有効/無効
}

export const AutoSaveWrapper: React.FC<AutoSaveWrapperProps> = ({
  saveInterval = 30000,
  onSaveStart,
  onSaveComplete,
  enableManualSave = true,
  // ... 他のプロパティ
}) => {
  // 機能実装
};
```

#### テスト追加

```typescript
// packages/excalidraw/tests/AutoSaveWrapper.test.tsx

describe("AutoSaveWrapper 新機能", () => {
  test("カスタム保存間隔が適用される", async () => {
    const customInterval = 5000;
    render(
      <AutoSaveWrapper
        saveInterval={customInterval}
        elements={[]}
        appState={{}}
        files={{}}
      >
        <div>Test</div>
      </AutoSaveWrapper>,
    );

    // カスタム間隔でのテスト実装
  });
});
```

### 2. FileSystemManager 拡張

#### 新機能追加例

```typescript
// packages/excalidraw/data/fileSystemManager.ts

export class FileSystemManager {
  // 既存メソッド...

  /**
   * ファイルのバージョン履歴を管理
   */
  async saveWithVersion(
    folderPath: string,
    fileName: string,
    data: ExcalidrawData,
    createBackup: boolean = true,
  ): Promise<FileSaveResponse> {
    if (createBackup) {
      // 既存ファイルをバックアップ
      const exists = await this.fileExists(folderPath, fileName);
      if (exists) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupName = `${fileName}.backup.${timestamp}`;
        // バックアップ作成ロジック
      }
    }

    return this.saveToFolder(folderPath, fileName, data);
  }

  /**
   * ファイル検索機能
   */
  async searchFiles(
    searchTerm: string,
    folderPath: string = "",
  ): Promise<FileInfo[]> {
    const allFiles = await this.getFolderStructure(folderPath);
    return allFiles.files.filter((file) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
}
```

### 3. URL 管理機能拡張

#### 高度な URL パラメータ管理

```typescript
// packages/excalidraw/utils/urlParams.ts

export interface ExtendedUrlParams extends UrlFileParams {
  mode?: "view" | "edit"; // 表示モード
  theme?: "light" | "dark"; // テーマ
  readonly?: boolean; // 読み取り専用
  share?: string; // 共有トークン
}

export const getExtendedUrlParams = (): ExtendedUrlParams => {
  const urlParams = new URLSearchParams(window.location.search);

  return {
    ...getUrlFileParams(),
    mode: (urlParams.get("mode") as "view" | "edit") || "edit",
    theme: (urlParams.get("theme") as "light" | "dark") || "light",
    readonly: urlParams.get("readonly") === "true",
    share: urlParams.get("share") || undefined,
  };
};
```

## 🔌 API 開発

### 1. 新しいエンドポイント追加

#### バックエンド実装

```python
# backend/routers/files.py

@router.post("/api/v1/files/duplicate/")
async def duplicate_file(request: FileDuplicateRequest):
    """ファイル複製API"""
    try:
        # ファイル複製ロジック
        original_path = resolve_file_path(request.source_file_path)
        duplicate_path = resolve_file_path(request.destination_file_path)

        # ファイル読み込み
        with open(original_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 新しいパスに保存
        os.makedirs(os.path.dirname(duplicate_path), exist_ok=True)
        with open(duplicate_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return {
            "success": True,
            "message": "ファイルが正常に複製されました",
            "file_info": get_file_info(duplicate_path)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### フロントエンド統合

```typescript
// packages/excalidraw/data/api-client.ts

export class ApiClient {
  // 既存メソッド...

  async duplicateFile(
    sourceFilePath: string,
    destinationFilePath: string,
  ): Promise<FileDuplicateResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/files/duplicate/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_file_path: sourceFilePath,
        destination_file_path: destinationFilePath,
      }),
    });

    if (!response.ok) {
      throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 2. エラーハンドリング強化

#### カスタムエラークラス

```typescript
// packages/excalidraw/data/errors.ts

export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "FileSystemError";
  }
}

export class ValidationError extends FileSystemError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class NotFoundError extends FileSystemError {
  constructor(resource: string) {
    super(`${resource}が見つかりません`, "NOT_FOUND", 404);
  }
}
```

#### エラーハンドリング統合

```typescript
// packages/excalidraw/data/fileSystemManager.ts

export class FileSystemManager {
  private handleApiError(error: any): never {
    if (error.status === 404) {
      throw new NotFoundError("ファイル");
    } else if (error.status === 400) {
      throw new ValidationError(error.message);
    } else {
      throw new FileSystemError(
        error.message || "不明なエラーが発生しました",
        "UNKNOWN_ERROR",
        error.status,
      );
    }
  }
}
```

## 🧪 テスト戦略

### 1. ユニットテスト

#### コンポーネントテスト

```typescript
// packages/excalidraw/tests/FolderSelector.test.tsx

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FolderSelector } from "../components/FolderSelector";

describe("FolderSelector", () => {
  const mockProps = {
    currentFolder: "projects",
    onFolderSelect: jest.fn(),
    onFolderCreate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("現在のフォルダが表示される", () => {
    render(<FolderSelector {...mockProps} />);
    expect(screen.getByText("projects")).toBeInTheDocument();
  });

  test("フォルダクリックでonFolderSelectが呼ばれる", async () => {
    render(<FolderSelector {...mockProps} />);

    const folderItem = screen.getByText("subfolder");
    fireEvent.click(folderItem);

    await waitFor(() => {
      expect(mockProps.onFolderSelect).toHaveBeenCalledWith(
        "projects/subfolder",
      );
    });
  });
});
```

#### フックテスト

```typescript
// packages/excalidraw/tests/useAutoSave.test.ts

import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "../hooks/useAutoSave";

describe("useAutoSave", () => {
  test("手動保存が正常に動作する", async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        elements: [],
        appState: {},
        files: {},
        onSaveSuccess: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.manualSave();
    });

    // 保存成功の確認
  });
});
```

### 2. 統合テスト

#### API 統合テスト

```typescript
// packages/excalidraw/tests/integration/fileSystemManager.test.ts

describe("FileSystemManager 統合テスト", () => {
  let fileManager: FileSystemManager;
  const testServerUrl = "http://localhost:8001"; // テスト用サーバー

  beforeAll(async () => {
    // テストサーバー起動
    fileManager = new FileSystemManager(testServerUrl);
  });

  test("ファイル保存→読み込みの完全フロー", async () => {
    const testData = {
      type: "excalidraw",
      version: 2,
      source: "test",
      elements: [],
      appState: {},
      files: {},
    };

    // 保存
    const saveResult = await fileManager.saveToFolder(
      "test-folder",
      "integration-test.excalidraw",
      testData,
    );
    expect(saveResult.success).toBe(true);

    // 読み込み
    const loadedData = await fileManager.loadFromFolder(
      "test-folder",
      "integration-test.excalidraw",
    );
    expect(loadedData).toEqual(testData);

    // クリーンアップ
    await fileManager.deleteFile("test-folder", "integration-test.excalidraw");
  });
});
```

### 3. E2E テスト

#### Cypress 設定

```javascript
// cypress/integration/folder-management.spec.js

describe("フォルダ管理システム E2E", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("完全なファイル操作フロー", () => {
    // URLパラメータでファイルアクセス
    cy.visit("/?folder=e2e-test&file=test-drawing.excalidraw");

    // 描画操作
    cy.get('[data-testid="canvas"]').click(100, 100);
    cy.get('[data-testid="canvas"]').click(200, 200);

    // 自動保存の確認
    cy.get('[data-testid="autosave-indicator"]').should("contain", "保存済み");

    // フォルダ変更
    cy.get('[data-testid="folder-selector"]').click();
    cy.get('[data-testid="folder-new"]').click();
    cy.get('[data-testid="folder-name-input"]').type("new-folder");
    cy.get('[data-testid="folder-create-btn"]').click();

    // 新しいフォルダでの保存確認
    cy.get('[data-testid="current-folder"]').should("contain", "new-folder");
  });
});
```

## 🚀 デプロイメント

### 1. ビルド設定

#### フロントエンドビルド

```bash
# プロダクションビルド
yarn build

# ビルド成果物の確認
ls -la excalidraw-app/dist/
```

#### 環境別設定

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development",
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

### 2. Docker 化

#### Dockerfile（フロントエンド）

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Dockerfile（バックエンド）

```dockerfile
# Dockerfile.backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - CORS_ORIGINS=http://localhost:3000
```

### 3. CI/CD 設定

#### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: yarn install
      - run: yarn test
      - run: yarn test:typecheck

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Deploy
        run: |
          yarn build
          # デプロイスクリプト実行
```

## 📊 監視とログ

### 1. フロントエンド監視

#### エラー追跡

```typescript
// packages/excalidraw/utils/errorTracking.ts

export class ErrorTracker {
  static logError(error: Error, context?: Record<string, any>) {
    console.error("Excalidraw Error:", {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // プロダクション環境では外部サービスに送信
    if (process.env.NODE_ENV === "production") {
      // Sentry, LogRocket等の統合
    }
  }
}
```

#### パフォーマンス監視

```typescript
// packages/excalidraw/utils/performance.ts

export class PerformanceMonitor {
  static measureOperation<T>(
    name: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now();

    return operation().finally(() => {
      const duration = performance.now() - start;
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    });
  }
}
```

### 2. バックエンド監視

#### ログ設定

```python
# backend/utils/logging.py

import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        return json.dumps(log_data)

# ロガー設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
```

このガイドにより、Excalidraw フォルダ管理システムの効率的な開発、拡張、保守が可能になります。
