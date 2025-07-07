import { getMailDirectory, createMailFolder, saveEmailToMailFolder } from './mailFolderManager';

export interface EmailData {
  subject: string;
  from: string;
  to?: string;
  date?: string;
  body?: string;
  attachments?: string[];
}

export const parseEmailFromDataTransfer = async (dataTransfer: DataTransfer): Promise<EmailData | null> => {
  try {
    // メールクライアントからのドラッグ・アンド・ドロップデータをチェック
    const types = Array.from(dataTransfer.types);
    
    // デバッグ情報を出力
    console.log('利用可能なデータタイプ:', types);
    types.forEach(type => {
      try {
        const data = dataTransfer.getData(type);
        console.log(`タイプ: ${type}`, data ? `データ長: ${data.length}` : 'データなし');
      } catch (e) {
        console.log(`タイプ: ${type} - データ取得エラー`);
      }
    });
    
    // Outlook for Mac形式のメールデータ
    if (types.includes('com.microsoft.outlook.message')) {
      const messageData = dataTransfer.getData('com.microsoft.outlook.message');
      return parseOutlookMessage(messageData);
    }
    
    // Outlook for Windows形式のメールデータ
    if (types.includes('application/x-ms-outlook')) {
      const messageData = dataTransfer.getData('application/x-ms-outlook');
      return parseOutlookMessage(messageData);
    }
    
    // Outlookの一般的な形式
    if (types.includes('text/outlook')) {
      const messageData = dataTransfer.getData('text/outlook');
      return parseOutlookMessage(messageData);
    }
    
    // Outlook MSG形式
    if (types.includes('application/vnd.ms-outlook')) {
      const messageData = dataTransfer.getData('application/vnd.ms-outlook');
      return parseOutlookMessage(messageData);
    }
    
    // Thunderbird形式のメールデータ
    if (types.includes('text/x-moz-message')) {
      const messageData = dataTransfer.getData('text/x-moz-message');
      return parseThunderbirdMessage(messageData);
    }
    
    // macOS Mail.app形式
    if (types.includes('com.apple.mail.PasteboardTypeEmailMessage')) {
      const mailData = dataTransfer.getData('com.apple.mail.PasteboardTypeEmailMessage');
      return parseAppleMailMessage(mailData);
    }
    
    // ファイルとしてドロップされたメール
    const droppedFiles = Array.from(dataTransfer.files);
    const emailFile = droppedFiles.find(file => 
      file.name.endsWith('.eml') || 
      file.name.endsWith('.msg') ||
      file.type === 'message/rfc822'
    );
    
    if (emailFile) {
      return await parseEmailFile(emailFile);
    }
    
    // HTML形式のメールデータ（Outlookなど）
    if (types.includes('text/html')) {
      const htmlData = dataTransfer.getData('text/html');
      if (htmlData) {
        const emailData = parseEmailFromHTML(htmlData);
        if (emailData) return emailData;
      }
    }
    
    // プレーンテキストとしてメールコンテンツがある場合
    if (types.includes('text/plain')) {
      const textData = dataTransfer.getData('text/plain');
      if (textData) {
        return parseEmailFromText(textData);
      }
    }
    
    // Outlookの場合、ファイルとしてドロップされることもある
    const allFiles = Array.from(dataTransfer.files);
    if (allFiles.length > 0) {
      console.log('ドロップされたファイル:', allFiles.map(f => `${f.name} (${f.type})`));
    }
    
    return null;
  } catch (error) {
    console.warn('メールデータの解析に失敗しました:', error);
    return null;
  }
};

const parseOutlookMessage = (messageData: string): EmailData | null => {
  try {
    console.log('Outlookメッセージデータ:', messageData.substring(0, 500));
    
    // Outlookからのデータが空の場合、text/plainデータを試す
    if (!messageData) {
      return null;
    }
    
    // Outlookの場合、データがJSON形式やXML形式の可能性があります
    try {
      // JSON形式を試す
      const jsonData = JSON.parse(messageData);
      return {
        subject: jsonData.subject || jsonData.Subject || '',
        from: jsonData.from || jsonData.From || jsonData.sender || '',
        to: jsonData.to || jsonData.To || '',
        date: jsonData.date || jsonData.Date || '',
        body: jsonData.body || jsonData.Body || messageData,
      };
    } catch (jsonError) {
      // JSON解析失敗、プレーンテキストとして処理
      return parseEmailFromText(messageData);
    }
  } catch (error) {
    console.warn('Outlookメッセージの解析に失敗しました:', error);
    return null;
  }
};

const parseThunderbirdMessage = (messageData: string): EmailData | null => {
  try {
    // Thunderbird形式のメッセージデータを解析
    const lines = messageData.split('\n');
    let subject = '';
    let from = '';
    let to = '';
    let date = '';
    
    for (const line of lines) {
      if (line.startsWith('Subject: ')) {
        subject = line.substring(9);
      } else if (line.startsWith('From: ')) {
        from = line.substring(6);
      } else if (line.startsWith('To: ')) {
        to = line.substring(4);
      } else if (line.startsWith('Date: ')) {
        date = line.substring(6);
      }
    }
    
    return { subject, from, to, date };
  } catch (error) {
    console.warn('Thunderbirdメッセージの解析に失敗しました:', error);
    return null;
  }
};

const parseAppleMailMessage = (mailData: string): EmailData | null => {
  try {
    // Apple Mail形式のメッセージデータを解析
    // JSON形式またはplist形式の可能性があります
    const parsedData = JSON.parse(mailData);
    return {
      subject: parsedData.subject || '',
      from: parsedData.from || '',
      to: parsedData.to || '',
      date: parsedData.date || '',
    };
  } catch (error) {
    console.warn('Apple Mailメッセージの解析に失敗しました:', error);
    return null;
  }
};

const parseEmailFile = async (file: File): Promise<EmailData | null> => {
  try {
    const text = await file.text();
    
    // EMLファイルの解析
    const lines = text.split('\n');
    let subject = '';
    let from = '';
    let to = '';
    let date = '';
    let inHeaders = true;
    
    for (const line of lines) {
      if (inHeaders) {
        if (line.trim() === '') {
          inHeaders = false;
          continue;
        }
        
        if (line.startsWith('Subject: ')) {
          subject = line.substring(9).trim();
        } else if (line.startsWith('From: ')) {
          from = line.substring(6).trim();
        } else if (line.startsWith('To: ')) {
          to = line.substring(4).trim();
        } else if (line.startsWith('Date: ')) {
          date = line.substring(6).trim();
        }
      }
    }
    
    return { subject, from, to, date, body: text };
  } catch (error) {
    console.warn('メールファイルの解析に失敗しました:', error);
    return null;
  }
};

const parseEmailFromHTML = (htmlData: string): EmailData | null => {
  try {
    console.log('HTMLデータ:', htmlData.substring(0, 500));
    
    // DOMParserを使用してHTMLを解析
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, 'text/html');
    
    // OutlookのHTML形式から件名を抽出
    let subject = '';
    let from = '';
    
    // メタタグから情報を取得
    const titleElement = doc.querySelector('title');
    if (titleElement) {
      subject = titleElement.textContent || '';
    }
    
    // Outlookの場合、HTMLコメントに情報が含まれることがある
    const htmlContent = htmlData;
    const subjectMatch = htmlContent.match(/Subject:\s*([^\r\n]+)/i);
    const fromMatch = htmlContent.match(/From:\s*([^\r\n]+)/i);
    
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
    }
    if (fromMatch) {
      from = fromMatch[1].trim();
    }
    
    // HTMLからプレーンテキストを抽出
    const textContent = doc.body ? doc.body.textContent || '' : '';
    
    // 件名が取得できない場合は、テキストの最初の行を使用
    if (!subject && textContent) {
      const lines = textContent.split('\n').filter(line => line.trim());
      subject = lines[0] || 'Outlookメール';
    }
    
    return {
      subject: subject || 'Outlookメール',
      from,
      body: htmlData,
    };
  } catch (error) {
    console.warn('HTML解析に失敗しました:', error);
    return null;
  }
};

const parseEmailFromText = (textData: string): EmailData | null => {
  // プレーンテキストからメール情報を抽出
  const lines = textData.split('\n');
  
  // Outlookの場合、最初の数行にヘッダー情報がある可能性
  let subject = '';
  let from = '';
  
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (line.startsWith('Subject:') || line.startsWith('件名:')) {
      subject = line.replace(/^(Subject:|件名:)\s*/, '').trim();
    } else if (line.startsWith('From:') || line.startsWith('送信者:')) {
      from = line.replace(/^(From:|送信者:)\s*/, '').trim();
    }
  }
  
  // 件名が見つからない場合は最初の非空行を使用
  if (!subject) {
    const nonEmptyLines = lines.filter(line => line.trim());
    subject = nonEmptyLines[0] || 'ドロップされたメール';
  }
  
  return {
    subject,
    from,
    body: textData,
  };
};

export const saveEmailToFile = async (
  emailData: EmailData, 
  fileName: string, 
  forceDownload: boolean = false
): Promise<string> => {
  try {
    const emlContent = generateEMLContent(emailData);
    
    // 強制ダウンロードが指定されていない場合、File System Access APIを試す
    if (!forceDownload && 'showDirectoryPicker' in window) {
      try {
        const directoryHandle = await getMailDirectory();
        if (directoryHandle) {
          const mailDirHandle = await createMailFolder(directoryHandle);
          return await saveEmailToMailFolder(emlContent, fileName, mailDirHandle);
        }
      } catch (error) {
        console.warn('File System Access APIでの保存に失敗:', error);
        // フォールバックとしてダウンロードを使用
      }
    }
    
    // フォールバック: 自動ダウンロード
    return await saveViaDownload(emlContent, fileName);
    
  } catch (error) {
    console.error('メールファイルの保存に失敗しました:', error);
    throw error;
  }
};


const saveViaDownload = async (content: string, fileName: string): Promise<string> => {
  // 自動ダウンロードを実行
  const blob = new Blob([content], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  
  // ダウンロードリンクを作成して自動クリック
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = fileName;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  // ダウンロードフォルダのパスを返す（概念的）
  return `~/Downloads/${fileName}`;
};

const generateEMLContent = (emailData: EmailData): string => {
  const { subject, from, to, date, body } = emailData;
  
  let emlContent = '';
  
  if (from) emlContent += `From: ${from}\n`;
  if (to) emlContent += `To: ${to}\n`;
  if (date) emlContent += `Date: ${date}\n`;
  if (subject) emlContent += `Subject: ${subject}\n`;
  
  emlContent += '\n'; // ヘッダーとボディの区切り
  
  if (body) emlContent += body;
  
  return emlContent;
};

export const generateEmailFileName = (emailData: EmailData): string => {
  // ファイル名に使用できない文字を除去
  const cleanSubject = emailData.subject
    .replace(/[<>:"/\\|?*]/g, '_')
    .substring(0, 50); // 長すぎる場合は切り詰め
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return `${cleanSubject}_${timestamp}.eml`;
};