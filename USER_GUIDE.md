# Excalidraw フォルダ管理システム ユーザーガイド

## 📝 概要

このガイドでは、拡張された Excalidraw のフォルダ管理機能の使用方法を説明します。この機能により、Excalidraw ファイルを組織的に管理し、URL を通じて直接アクセスできるようになります。

## 🚀 主な機能

### 1. 自動保存機能

- **30 秒間隔**での自動保存
- **URL パラメータ**に基づくファイル保存
- **リアルタイム状態表示**（開発モード）
- **手動保存**（Ctrl+Shift+S）

### 2. URL ベースファイルアクセス

- URL パラメータによる直接ファイルアクセス
- ブラウザ起動時の自動ファイル読み込み
- フォルダ階層の指定

### 3. フォルダ管理

- 階層構造でのファイル組織化
- フォルダの作成・選択
- パンくずナビゲーション

### 4. 画像データの保存

- 図表に含まれる画像の自動保存
- エクスポート時の画像データ保持

## 🎯 基本的な使用方法

### ファイルへの直接アクセス

#### 特定のファイルを開く

```
http://localhost:3001/?file=my-drawing.excalidraw
```

#### フォルダ内のファイルを開く

```
http://localhost:3001/?folder=projects/diagrams&file=architecture.excalidraw
```

#### パラメータの組み合わせ

```
# プロジェクトフォルダ内の設計図を開く
http://localhost:3001/?folder=projects&file=system-design.excalidraw

# 複数階層のフォルダ
http://localhost:3001/?folder=teams/engineering/docs&file=workflow.excalidraw
```

### 自動保存機能の使用

1. **URL パラメータで保存先を指定**

   ```
   http://localhost:3001/?folder=my-project&file=sketch.excalidraw
   ```

2. **描画開始**

   - 描画を開始すると、30 秒間隔で自動保存が開始されます
   - 変更があった場合のみ保存されます（デバウンス機能）

3. **保存状態の確認**

   - 開発モード時は画面右上に保存状態が表示されます
   - "自動保存: 有効" と表示されれば正常に動作中です

4. **手動保存**
   - `Ctrl+Shift+S` (Windows/Linux) または `Cmd+Shift+S` (Mac)
   - 任意のタイミングで手動保存できます

### フォルダ管理の使用

#### 新しいフォルダの作成

1. メニューから「フォルダに保存」を選択
2. フォルダ選択ダイアログで「新しいフォルダ」ボタンをクリック
3. フォルダ名を入力
4. 作成されたフォルダを選択してファイルを保存

#### フォルダの移動

- パンくずナビゲーションをクリックして上位フォルダに移動
- フォルダ一覧から目的のフォルダをクリック
- キーボードナビゲーション（Enter/Space）も利用可能

## 🛠️ 高度な使用方法

### ワークフローの統合

#### プロジェクト管理での使用

```
# プロジェクト構造例
projects/
├── web-app/
│   ├── wireframes.excalidraw
│   ├── database-design.excalidraw
│   └── api-flow.excalidraw
├── mobile-app/
│   ├── user-journey.excalidraw
│   └── screen-mockups.excalidraw
└── shared/
    ├── brand-guidelines.excalidraw
    └── icons.excalidraw
```

#### URL 設計パターン

```
# 機能別URL構成
http://your-domain.com/?folder=projects/web-app&file=wireframes.excalidraw
http://your-domain.com/?folder=projects/mobile-app&file=user-journey.excalidraw

# チーム別URL構成
http://your-domain.com/?folder=teams/design&file=style-guide.excalidraw
http://your-domain.com/?folder=teams/engineering&file=architecture.excalidraw
```

### バックアップとエクスポート

#### ファイルの手動エクスポート

1. メニューから「エクスポート」を選択
2. 希望の形式（PNG、SVG、PDF）を選択
3. 画像データも含めて適切にエクスポートされます

#### プロジェクト全体のバックアップ

- バックエンドの`backend/`フォルダに全ファイルが保存されます
- 定期的にこのフォルダをバックアップすることを推奨

## 🔧 設定とカスタマイズ

### 環境変数の設定

#### バックエンド URL

```bash
# .env ファイル
VITE_API_BASE_URL=http://localhost:8000
```

#### 自動保存間隔の調整

`packages/excalidraw/components/AutoSaveWrapper.tsx`で設定可能：

```typescript
saveInterval: 30000, // 30秒間隔
debounceDelay: 2000, // 2秒のデバウンス
```

### ファイル命名規則

#### 自動的なファイル名の安全化

- スペースは`_`に変換
- 日本語文字は保持
- 特殊文字は削除または変換
- `.excalidraw`拡張子の自動付与

例：

```
"My Design" → "My_Design.excalidraw"
"設計図 v2" → "設計図_v2.excalidraw"
"diagram (final)" → "diagram_final.excalidraw"
```

## 🔒 セキュリティ機能

### パス制限

- `../`等のパストラバーサル攻撃を防止
- 指定されたベースディレクトリ外へのアクセスを禁止

### ファイル形式制限

- `.excalidraw`ファイルのみ許可
- JSON 形式の検証

### 危険文字の検出

以下の文字を含むファイル名は自動的に安全化：

- `$`, `` ` ``, `|`, `&`, `;`
- `<`, `>`, `"`, `'`

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. 自動保存が動作しない

**症状**: 描画しても自動保存されない **解決方法**:

- URL に`file`パラメータが含まれているか確認
- バックエンドサーバーが起動しているか確認（http://localhost:8000）
- ブラウザの開発者ツールでエラーがないか確認

#### 2. ファイルが読み込まれない

**症状**: URL でアクセスしても空の画面が表示される **解決方法**:

- ファイルパスが正しいか確認
- ファイルが実際に存在するか確認（`backend/`フォルダ内）
- ブラウザのコンソールでエラーメッセージを確認

#### 3. 画像が保存されない

**症状**: 図表に含まれる画像が保存されない **解決方法**:

- 最新バージョンを使用しているか確認
- ブラウザの対応状況を確認
- 画像サイズが制限を超えていないか確認

#### 4. フォルダが作成できない

**症状**: 新しいフォルダ作成でエラーが発生 **解決方法**:

- フォルダ名に無効な文字が含まれていないか確認
- バックエンドのディスク容量を確認
- ファイルシステムの権限を確認

### エラーメッセージの対処

#### "ファイル読み込みエラー"

- ファイルパスを再確認
- バックエンドの状態を確認
- ファイルの破損の可能性を検討

#### "保存に失敗しました"

- ディスク容量を確認
- ファイル名の妥当性を確認
- バックエンドのログを確認

#### "フォルダの作成に失敗しました"

- フォルダ名の妥当性を確認
- 既存フォルダとの重複を確認
- 権限の問題を確認

## 📈 ベストプラクティス

### 1. ファイル組織化

```
推奨フォルダ構造:
root/
├── projects/
│   ├── project-a/
│   ├── project-b/
│   └── archive/
├── templates/
├── shared/
└── personal/
```

### 2. 命名規則

- **日付を含める**: `2024-01-15_meeting-notes.excalidraw`
- **バージョン管理**: `design-v1.excalidraw`, `design-v2.excalidraw`
- **用途を明確に**: `wireframe_login-page.excalidraw`

### 3. URL の管理

- **チーム共有**: 一貫した URL 構造を使用
- **ブックマーク**: 頻繁に使用するファイルをブックマーク
- **リンク共有**: 他の文書で Excalidraw ファイルへのリンクを作成

### 4. パフォーマンス最適化

- **大きなファイル**: 複雑な図表は分割を検討
- **画像の最適化**: 不要に大きな画像は避ける
- **定期的なクリーンアップ**: 不要なファイルは削除

## 🔄 アップデートとメンテナンス

### 定期的なバックアップ

```bash
# バックエンドファイルのバックアップ
cp -r backend/ backup/backend-$(date +%Y%m%d)/
```

### アップストリームからの更新

```bash
# Excalidraw本体の更新を取得
git fetch upstream
git checkout main
git merge upstream/main
```

### ログの確認

- ブラウザの開発者ツールでフロントエンドのログを確認
- バックエンドのコンソール出力で API のログを確認

このユーザーガイドにより、Excalidraw フォルダ管理システムを効果的に活用できます。追加の質問や問題がある場合は、開発チームにお問い合わせください。
