/**
 * Google Drive API utilities with security improvements
 * - Token encoding for basic protection
 * - Expiration buffer to prevent stale token usage
 * - Clear error handling
 */

import { warn } from './logger';

const TOKEN_ENCODED_KEY = 'gdrive_token_encoded';
const TOKEN_EXPIRES_KEY = 'gdrive_token_expires';

/**
 * Encode token for basic obfuscation (not encryption - use HttpOnly cookies for production)
 */
function encodeToken(token: string): string {
  try {
    return btoa(token);
  } catch {
    return token;
  }
}

/**
 * Decode token from storage
 */
function decodeToken(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return encoded;
  }
}

/**
 * Get Drive token with expiration check
 * Returns null if token is expired or doesn't exist
 */
export const getDriveToken = (): string | null => {
  try {
    const encodedToken = localStorage.getItem(TOKEN_ENCODED_KEY);
    const expiresStr = localStorage.getItem(TOKEN_EXPIRES_KEY);

    if (!encodedToken || !expiresStr) {
      return null;
    }

    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires)) {
      clearDriveToken();
      return null;
    }

    // Return null 5 minutes before actual expiration (buffer for API calls)
    const bufferMs = 5 * 60 * 1000;
    if (Date.now() >= expires - bufferMs) {
      warn('[GDrive] Token expiring soon, clearing...');
      clearDriveToken();
      return null;
    }

    return decodeToken(encodedToken);
  } catch (error) {
    warn('[GDrive] Failed to get token:', error);
    clearDriveToken();
    return null;
  }
};

/**
 * Set Drive token with expiration
 */
export const setDriveToken = (token: string, expiresInSeconds: number = 3600): void => {
  try {
    const expires = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem(TOKEN_ENCODED_KEY, encodeToken(token));
    localStorage.setItem(TOKEN_EXPIRES_KEY, expires.toString());
  } catch (error) {
    warn('[GDrive] Failed to store token:', error);
  }
};

/**
 * Clear Drive token from storage
 */
export const clearDriveToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_ENCODED_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  } catch (error) {
    warn('[GDrive] Failed to clear token:', error);
  }
};

// Legacy token functions for migration
export const getDriveTokenLegacy = (): string | null => {
  const token = localStorage.getItem('gdrive_token');
  const expires = localStorage.getItem('gdrive_token_expires');
  if (token && expires && Date.now() < parseInt(expires)) {
    return token;
  }
  return null;
};

export const migrateLegacyToken = (): boolean => {
  const legacyToken = getDriveTokenLegacy();
  if (legacyToken) {
    setDriveToken(legacyToken, 3500); // 1 hour - 50 seconds buffer
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expires');
    return true;
  }
  return false;
};

const FOLDER_NAME = 'EnglishTutor_Materials';

/**
 * Get or create app folder in Google Drive
 */
export const getOrCreateAppFolder = async (token: string) => {
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${encodeURIComponent('files(id,name)')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to search for app folder: ${res.status} ${error}`);
  }

  const data = await res.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const error = await createRes.text();
    throw new Error(`Failed to create app folder: ${createRes.status} ${error}`);
  }

  const createData = await createRes.json();
  return createData.id;
};

export const uploadFileToDrive = async (file: File, token: string, folderId?: string) => {
  const metadata: Record<string, unknown> = {
    name: file.name,
    mimeType: file.type || 'text/plain',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
  });

  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaPart = `${delimiter}Content-Type: ${metadata.mimeType}\r\n\r\n`;

  const blob = new Blob([
    metadataPart,
    mediaPart,
    fileData,
    closeDelimiter
  ], { type: `multipart/related; boundary=${boundary}` });

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: blob,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload file: ${res.status} ${errText}`);
  }

  return res.json();
};

export const listDriveFiles = async (token: string, folderId?: string) => {
  let queryStr = "trashed=false";
  if (folderId) {
    queryStr += ` and '${folderId}' in parents`;
  } else {
    queryStr += " and (mimeType='text/plain' or mimeType='text/markdown' or mimeType='text/csv' or mimeType='application/vnd.google-apps.folder')";
  }
  const query = encodeURIComponent(queryStr);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${encodeURIComponent('files(id,name,mimeType,createdTime)')}&orderBy=${encodeURIComponent('folder,createdTime desc')}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list files: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
};

export const createDriveFolder = async (name: string, token: string, parentId?: string) => {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create folder: ${res.status} ${errText}`);
  }

  return res.json();
};

export const renameDriveFile = async (fileId: string, newName: string, token: string) => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to rename file: ${res.status} ${errText}`);
  }

  return res.json();
};

export const getFileContent = async (fileId: string, token: string) => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to get file content: ${res.status} ${errText}`);
  }

  return res.text();
};

export const deleteDriveFile = async (fileId: string, token: string) => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Failed to delete file: ${res.status} ${errText}`);
  }

  return true;
};
