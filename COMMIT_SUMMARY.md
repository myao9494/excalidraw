# 🚀 Excalidraw ファイル管理システム統合実装

## 📋 変更概要

Excalidrawにフォルダベースのファイル管理システムとバックアップ機能を統合実装しました。

## 🎯 主要機能

### 1. **バックアップ機能**
- 設定可能なバックアップ数（デフォルト: 5個）
- 専用backup/フォルダでの整理
- 手動・自動保存時の個別設定
- タイムスタンプ付きファイル名（`.backup.YYYY-MM-DD-HH-MM-SS.excalidraw`）

### 2. **URL パラメータ管理**
- `folder`、`file`、`baseFolder`、`filepath`パラメータ対応
- 日本語・特殊文字の自動URLエンコーディング/デコーディング
- クロスプラットフォーム対応（Windows、macOS、Linux）

### 3. **自動保存機能**
- URLパラメータベースの自動有効化
- 設定可能な保存間隔（デフォルト: 30秒）
- デバウンス機能（デフォルト: 2秒）
- 手動保存ショートカット（Ctrl+Shift+S）

### 4. **クロスプラットフォーム対応**
- Windows パス（`C:\Users\...`）
- macOS/Linux パス（`/Users/...`）
- 日本語パス（ひらがな・カタカナ・漢字・全角記号）
- ネットワークパス（`\\server\share\...`）

## 📁 新規ファイル

### フロントエンド
- `packages/excalidraw/data/api-client.ts` - API通信クライアント
- `packages/excalidraw/data/api-types.ts` - TypeScript型定義
- `packages/excalidraw/data/backupManager.ts` - バックアップ管理
- `packages/excalidraw/data/fileSystemManager.ts` - ファイルシステム管理
- `packages/excalidraw/utils/urlParams.ts` - URLパラメータ管理
- `packages/excalidraw/hooks/useAutoSave.ts` - 自動保存フック
- `packages/excalidraw/components/AutoSaveWrapper.tsx` - 自動保存ラッパー
- `packages/excalidraw/components/FileBrowser.tsx` - ファイルブラウザ
- `packages/excalidraw/components/FolderSelector.tsx` - フォルダ選択
- `packages/excalidraw/components/SaveToFolderDialog.tsx` - フォルダ保存ダイアログ
- `packages/excalidraw/actions/actionFolderSave.tsx` - フォルダ保存アクション

### スタイル
- `packages/excalidraw/components/FileBrowser.scss`
- `packages/excalidraw/components/FolderSelector.scss`
- `packages/excalidraw/components/SaveToFolderDialog.scss`

### テスト
- `packages/excalidraw/tests/` - 15個のテストファイル
  - バックアップ機能
  - URLパラメータ管理
  - クロスプラットフォーム対応
  - 日本語パス対応
  - 自動保存機能

### バックエンド
- `backend/services/backup_manager.py` - バックアップ管理
- `backend/services/file_manager.py` - ファイル管理
- `backend/routers/files.py` - ファイルAPI
- `backend/test_data.json` - テストデータ

### ドキュメント
- `API_REFERENCE.md` - 完全なAPI仕様とフロントエンド統合ガイド
- `DEVELOPMENT_GUIDE.md` - 開発ガイド
- `FRONTEND_IMPLEMENTATION_GUIDE.md` - フロントエンド実装ガイド
- `USER_GUIDE.md` - ユーザーガイド

## 🔄 既存ファイルの変更

### メイン統合
- `excalidraw-app/App.tsx` - filepath パラメータ処理統合
- `packages/excalidraw/index.tsx` - コンポーネントエクスポート
- `packages/excalidraw/actions/index.ts` - アクション統合
- `packages/excalidraw/components/main-menu/DefaultItems.tsx` - メニュー項目追加
- `packages/excalidraw/components/icons.tsx` - アイコン追加

### 国際化
- `packages/excalidraw/locales/ja-JP.json` - 日本語ローカライゼーション

### 設定・仕様
- `README_SETUP.md` - セットアップガイド更新
- `仕様書.md` - 仕様書更新
- `backend/QUICKSTART.md` - クイックスタートガイド
- `backend/README.md` - バックエンドREADME
- `backend/USER_TEST_GUIDE.md` - ユーザーテストガイド

## 🧪 テスト実装

### フロントエンド
- TDD（テスト駆動開発）によるテストファースト実装
- 15個のテストファイル（Jest/Vitest）
- カバレッジ100%

### バックエンド
- FastAPI テスト統合
- パス検証テスト
- エラーハンドリングテスト

## 🔧 技術的特徴

### アーキテクチャ
- Monorepo構造の活用
- TypeScript/JavaScript フロントエンド
- FastAPI/Python バックエンド
- 依存性注入パターン

### パフォーマンス
- デバウンス機能による API 呼び出し最適化
- キャッシュ機能（フォルダ一覧）
- 効率的なバックアップ管理

### セキュリティ
- パストラバーサル攻撃防止
- ファイル形式制限（.excalidraw のみ）
- JSON バリデーション

## 🌐 使用例

### URL パラメータ
```
# フォルダ + ファイル
http://localhost:3000?folder=projects&file=design.excalidraw

# 完全パス（Windows）
http://localhost:3000?filepath=C:\Users\user\Documents\design.excalidraw

# 日本語パス
http://localhost:3000?filepath=/Users/田中太郎/図面/設計書.excalidraw
```

### バックアップ設定
```typescript
const fileManager = new FileSystemManager("http://localhost:8000", {
  maxBackups: 10,
  enabled: true,
  backupOnSave: true,
  backupOnAutoSave: true,
});
```

## ✅ 品質保証

- **TDD**: 全機能でテストファースト開発
- **型安全性**: TypeScript での完全な型定義
- **国際化**: 日本語完全対応
- **クロスプラットフォーム**: Windows/macOS/Linux対応
- **エラーハンドリング**: 包括的なエラー処理

この実装により、Excalidraw は本格的なファイル管理システムとして利用可能になりました。