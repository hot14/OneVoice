export const getDriveToken = () => {
  const token = localStorage.getItem('gdrive_token');
  const expires = localStorage.getItem('gdrive_token_expires');
  if (token && expires && Date.now() < parseInt(expires)) {
    return token;
  }
  return null;
};

const FOLDER_NAME = 'EnglishTutor_Materials';

export const getOrCreateAppFolder = async (token: string) => {
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${encodeURIComponent('files(id,name)')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to search for app folder');
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
  
  if (!createRes.ok) throw new Error('Failed to create app folder');
  const createData = await createRes.json();
  return createData.id;
};

export const uploadFileToDrive = async (file: File, token: string, folderId?: string) => {
  const metadata: any = {
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
    reader.onerror = reject;
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
  return data.files;
};

export const createDriveFolder = async (name: string, token: string, parentId?: string) => {
  const metadata: any = {
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
  if (!res.ok) throw new Error('Failed to create folder');
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
  if (!res.ok) throw new Error('Failed to rename file');
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
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete file: ${res.status} ${errText}`);
  }
  return true;
};
