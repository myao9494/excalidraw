// メールフォルダ管理用のユーティリティ

let cachedMailDirectoryHandle: FileSystemDirectoryHandle | null = null;

export const getMailDirectory = async (): Promise<FileSystemDirectoryHandle | null> => {
  // キャッシュされたディレクトリハンドルがある場合はそれを使用
  if (cachedMailDirectoryHandle) {
    try {
      // ディレクトリがまだ有効か確認
      if ('queryPermission' in cachedMailDirectoryHandle) {
        await (cachedMailDirectoryHandle as any).queryPermission({ mode: 'readwrite' });
      }
      return cachedMailDirectoryHandle;
    } catch {
      // 無効になっている場合はキャッシュをクリア
      cachedMailDirectoryHandle = null;
    }
  }

  // File System Access APIが利用可能かチェック
  if (!('showDirectoryPicker' in window)) {
    return null;
  }

  try {
    // ユーザーにディレクトリを選択してもらう
    const directoryHandle = await (window as any).showDirectoryPicker({
      id: 'excalidraw-mail-save',
      mode: 'readwrite',
      startIn: 'documents'
    });

    cachedMailDirectoryHandle = directoryHandle;
    return directoryHandle;
  } catch (error) {
    console.log('ディレクトリ選択がキャンセルされました:', error);
    return null;
  }
};

export const createMailFolder = async (parentDirectory: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> => {
  try {
    // mailフォルダを取得または作成
    let mailDirHandle: FileSystemDirectoryHandle;
    try {
      mailDirHandle = await parentDirectory.getDirectoryHandle('mail');
    } catch {
      mailDirHandle = await parentDirectory.getDirectoryHandle('mail', { create: true });
    }
    return mailDirHandle;
  } catch (error) {
    console.error('mailフォルダの作成に失敗:', error);
    throw error;
  }
};

export const saveEmailToMailFolder = async (
  content: string,
  fileName: string,
  mailDirectory: FileSystemDirectoryHandle
): Promise<string> => {
  try {
    // メールファイルを作成
    const fileHandle = await mailDirectory.getFileHandle(fileName, { create: true });
    const writable = await (fileHandle as any).createWritable();
    await writable.write(content);
    await writable.close();
    
    return `./mail/${fileName}`;
  } catch (error) {
    console.error('メールファイルの保存に失敗:', error);
    throw error;
  }
};

export const clearMailDirectoryCache = () => {
  cachedMailDirectoryHandle = null;
};