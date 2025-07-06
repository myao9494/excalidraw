/**
 * API動作確認スクリプト
 * Node.jsで実行してAPI機能をテスト
 */

const API_BASE = 'http://localhost:8000';

// ヘルスチェック
async function testHealthCheck() {
    console.log('🏥 ヘルスチェック...');
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('✅ ヘルスチェック成功:', data);
        return true;
    } catch (error) {
        console.error('❌ ヘルスチェック失敗:', error.message);
        return false;
    }
}

// ファイル一覧取得テスト
async function testFileList() {
    console.log('\n📁 ファイル一覧取得テスト...');
    try {
        const response = await fetch(`${API_BASE}/api/v1/files/`);
        const data = await response.json();
        console.log('✅ ファイル一覧取得成功:');
        console.log(`   現在のパス: ${data.current_path}`);
        console.log(`   ファイル数: ${data.total_count}`);
        if (data.files && data.files.length > 0) {
            console.log('   ファイル例:', data.files[0]);
        }
        return true;
    } catch (error) {
        console.error('❌ ファイル一覧取得失敗:', error.message);
        return false;
    }
}

// ファイル保存テスト
async function testFileSave() {
    console.log('\n💾 ファイル保存テスト...');
    try {
        const testData = {
            type: "excalidraw",
            version: 2,
            source: "https://excalidraw.com",
            elements: [
                {
                    type: "rectangle",
                    x: 100,
                    y: 100,
                    width: 200,
                    height: 100,
                    strokeColor: "#000000",
                    backgroundColor: "transparent"
                }
            ],
            appState: {
                viewBackgroundColor: "#ffffff"
            }
        };

        const response = await fetch(`${API_BASE}/api/v1/files/save/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_path: 'test-api-save.excalidraw',
                content: JSON.stringify(testData),
                create_directories: true
            })
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ ファイル保存成功:', result.file_info?.path);
            return true;
        } else {
            console.error('❌ ファイル保存失敗:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ ファイル保存エラー:', error.message);
        return false;
    }
}

// バックアップ情報テスト
async function testBackupInfo() {
    console.log('\n🔄 バックアップ情報テスト...');
    try {
        const response = await fetch(`${API_BASE}/api/v1/files/backup/info/?file_path=test-api-save.excalidraw`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ バックアップ情報取得成功:');
            console.log(`   ファイル名: ${data.filename}`);
            console.log(`   バックアップ数: ${data.backup_count}/${data.max_backups}`);
            if (data.backups && data.backups.length > 0) {
                console.log('   最新バックアップ:', data.backups[0]);
            }
            return true;
        } else {
            console.log('ℹ️ バックアップ情報（まだバックアップなし）:', data.error);
            return true; // これは正常な状態
        }
    } catch (error) {
        console.error('❌ バックアップ情報取得失敗:', error.message);
        return false;
    }
}

// 日本語パステスト
async function testJapanesePath() {
    console.log('\n🗾 日本語パステスト...');
    try {
        const testData = {
            type: "excalidraw",
            version: 2,
            source: "https://excalidraw.com",
            elements: [],
            appState: {
                viewBackgroundColor: "#ffffff"
            }
        };

        const response = await fetch(`${API_BASE}/api/v1/files/save/?base_folder=${encodeURIComponent('/Users/sudoupousei/000_work/web_file_manager/excalidraw_myao')}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_path: '図面/テスト図面.excalidraw',
                content: JSON.stringify(testData),
                create_directories: true
            })
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ 日本語パス保存成功:', result.file_info?.path);
            return true;
        } else {
            console.error('❌ 日本語パス保存失敗:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ 日本語パステストエラー:', error.message);
        return false;
    }
}

// メインテスト実行
async function runAllTests() {
    console.log('🚀 Excalidraw File Manager API テスト開始\n');
    
    const results = [];
    
    results.push(await testHealthCheck());
    results.push(await testFileList());
    results.push(await testFileSave());
    results.push(await testBackupInfo());
    results.push(await testJapanesePath());
    
    console.log('\n📊 テスト結果:');
    console.log(`✅ 成功: ${results.filter(r => r).length}/${results.length}`);
    console.log(`❌ 失敗: ${results.filter(r => !r).length}/${results.length}`);
    
    if (results.every(r => r)) {
        console.log('\n🎉 すべてのAPIテストが成功しました！');
        console.log('\n📋 次のステップ:');
        console.log('1. ブラウザで http://localhost:3001 を開く');
        console.log('2. test-functionality.html のテストリンクを試す');
        console.log('3. フロントエンド統合が正常に動作することを確認');
    } else {
        console.log('\n⚠️ 一部のテストが失敗しました。バックエンドの設定を確認してください。');
    }
}

// スクリプト実行
if (typeof fetch === 'undefined') {
    console.log('❌ このスクリプトはNode.js 18+またはブラウザで実行してください');
    console.log('💡 ブラウザのコンソールで実行するか、Node.js 18+をインストールしてください');
} else {
    runAllTests().catch(console.error);
}