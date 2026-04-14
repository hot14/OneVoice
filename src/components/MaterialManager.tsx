/// <reference types="vite/client" />
import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Info,
  FolderOpen,
  FolderPlus,
  Edit2,
  ChevronRight,
  Folder,
} from "lucide-react";
import {
  getDriveToken,
  listDriveFiles,
  uploadFileToDrive,
  getFileContent,
  deleteDriveFile,
  getOrCreateAppFolder,
  createDriveFolder,
  renameDriveFile,
} from "../lib/gdrive";
import { useLanguage } from "../contexts/LanguageContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { processAndStoreMaterial, ApiSettings } from "../lib/ragUtils";
import { error as loggerError } from "../lib/logger";

interface MaterialManagerProps {
  onClose: () => void;
  currentMaterial: string;
  onMaterialSelect: (content: string) => void;
  chatApiSettings?: ApiSettings;
  embeddingApiSettings?: ApiSettings;
}

export function MaterialManager({
  onClose,
  currentMaterial,
  onMaterialSelect,
  chatApiSettings,
  embeddingApiSettings
}: MaterialManagerProps) {
  const { t, sourceLanguage } = useLanguage();
  const language = sourceLanguage;
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{id: string, name: string, content: string}[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null); // Root app folder
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string, name: string}[]>([]);

  const handleError = (err: any, defaultMessage: string) => {
    loggerError("MaterialManager error:", err?.message || defaultMessage);
    if (
      err.message?.includes("Google Drive API has not been used") ||
      err.message?.includes("SERVICE_DISABLED")
    ) {
      const match = err.message.match(
        /https:\/\/console\.developers\.google\.com\/apis\/api\/drive\.googleapis\.com\/overview\?project=\d+/,
      );
      const link = match
        ? match[0]
        : "https://console.cloud.google.com/apis/library/drive.googleapis.com";
      setError(
        <span>
          {language === "ko"
            ? "Google Drive API가 비활성화되어 있습니다. "
            : "Google Drive API is disabled. Please "}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold"
          >
            {language === "ko" ? "여기에서 활성화" : "enable it here"}
          </a>
          {language === "ko" ? "한 후 다시 시도해주세요." : " and try again."}
        </span>,
      );
    } else if (err.message?.includes("401") || err.message?.includes("403")) {
      localStorage.removeItem("gdrive_token");
      localStorage.removeItem("gdrive_token_expires");
      setToken(null);
    } else {
      setError(`${defaultMessage}: ${err.message}`);
    }
  };

  useEffect(() => {
    const driveToken = getDriveToken();
    setToken(driveToken);
    if (driveToken) {
      initializeFolderAndFiles(driveToken);
    } else {
      setError(t("materials.authRequired"));
    }
  }, []);

  useEffect(() => {
    if (!currentMaterial) {
      setSelectedFiles([]);
      return;
    }
    try {
      const parsed = JSON.parse(currentMaterial);
      if (Array.isArray(parsed)) {
        setSelectedFiles(parsed);
      }
    } catch (e) {
      // Legacy string format, ignore or clear
    }
  }, [currentMaterial]);

  const initializeFolderAndFiles = async (driveToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const appFolderId = await getOrCreateAppFolder(driveToken);
      setFolderId(appFolderId);
      setCurrentFolderId(appFolderId);
      setFolderPath([{ id: appFolderId, name: t("materials.myFiles") || "My Files" }]);
      await fetchFiles(driveToken, appFolderId);
    } catch (err: any) {
      handleError(err, t("materials.fetchError"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async (driveToken: string, targetFolderId: string) => {
    try {
      const driveFiles = await listDriveFiles(driveToken, targetFolderId);
      setFiles(driveFiles || []);
    } catch (err: any) {
      handleError(err, t("materials.fetchError"));
    }
  };

  const handleNavigateFolder = async (folder: {id: string, name: string}) => {
    if (!token) return;
    setIsLoading(true);
    setCurrentFolderId(folder.id);
    const existingIndex = folderPath.findIndex(p => p.id === folder.id);
    if (existingIndex >= 0) {
      setFolderPath(folderPath.slice(0, existingIndex + 1));
    } else {
      setFolderPath([...folderPath, folder]);
    }
    await fetchFiles(token, folder.id);
    setIsLoading(false);
  };

  const handleCreateFolder = async () => {
    if (!token || !currentFolderId) return;
    const name = window.prompt(language === 'ko' ? "새 폴더 이름을 입력하세요:" : "Enter new folder name:");
    if (!name) return;
    setIsLoading(true);
    try {
      await createDriveFolder(name, token, currentFolderId);
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      handleError(err, language === 'ko' ? "폴더 생성 실패" : "Failed to create folder");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async (fileId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token || !currentFolderId) return;
    const newName = window.prompt(language === 'ko' ? "새 이름을 입력하세요:" : "Enter new name:", currentName);
    if (!newName || newName === currentName) return;
    setIsLoading(true);
    try {
      await renameDriveFile(fileId, newName, token);
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      handleError(err, language === 'ko' ? "이름 변경 실패" : "Failed to rename");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = e.target; // Save reference to target
    if (!file || !token || !currentFolderId) return;

    // Check file type
    const validTypes = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ];
    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(txt|md|csv)$/i)
    ) {
      setError(
        t("materials.uploadError") +
          ": Only text files (.txt, .md, .csv) are supported",
      );
      if (target) target.value = "";
      return;
    }

    // Google Drive multipart upload limit is 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError(t("materials.uploadError") + ": File size exceeds 5MB limit");
      if (target) target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await uploadFileToDrive(file, token, currentFolderId);
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      handleError(err, t("materials.uploadError"));
    } finally {
      setIsUploading(false);
      if (target) target.value = "";
    }
  };

  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

  const handleToggleFile = async (fileId: string, fileName: string) => {
    if (!token || !auth.currentUser) return;
    if (processingFiles.has(fileId)) return; // Prevent double click
    
    setError(null);
    
    let newSelected = [...selectedFiles];
    const existingIndex = newSelected.findIndex(f => f.id === fileId);

    if (existingIndex >= 0) {
      // Deselect
      newSelected.splice(existingIndex, 1);
    } else {
      // Select and Process
      setProcessingFiles(prev => new Set(prev).add(fileId));
      try {
        const uid = auth.currentUser.uid;
        const materialRef = doc(db, "users", uid, "materials", fileId);
        const materialSnap = await getDoc(materialRef);
        
        let materialData;
        if (materialSnap.exists()) {
          materialData = materialSnap.data();
        } else {
          // Need to process
          const content = await getFileContent(fileId, token);
          // Security: Use localStorage for API key, fallback to env var
          const apiKey = localStorage.getItem('api_key_chat') || import.meta.env.VITE_GEMINI_API_KEY || "";
          if (!apiKey) throw new Error("API Key not found");
          
          materialData = await processAndStoreMaterial(fileId, fileName, content, apiKey, chatApiSettings, embeddingApiSettings);
        }
        
        newSelected.push({ id: fileId, name: fileName, content: materialData.summary });
      } catch (err: any) {
        handleError(err, language === 'ko' ? "자료 처리 중 오류가 발생했습니다." : "Error processing material.");
        setProcessingFiles(prev => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
        return;
      }
    }

    const newContentString = JSON.stringify(newSelected);

    setSelectedFiles(newSelected);
    onMaterialSelect(newContentString);

    // Also save to user profile
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, { 
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Learner',
        email: auth.currentUser.email || '',
        photoURL: auth.currentUser.photoURL || '',
        currentMaterial: newContentString 
      }, { merge: true });
    }
    
    setProcessingFiles(prev => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token || !currentFolderId) return;

    if (!window.confirm(t("materials.confirmDelete"))) return;

    setIsLoading(true);
    try {
      await deleteDriveFile(fileId, token);
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      handleError(err, t("materials.deleteError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-xl w-full h-full sm:h-auto sm:max-h-[85vh] max-w-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            {t("materials.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col">
          {!token ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t("materials.authRequiredTitle")}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {t("materials.authRequiredDesc")}
              </p>
              <button
                onClick={() => {
                  auth.signOut();
                  window.location.reload();
                }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                {t("materials.relogin")}
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">
                      {t("materials.notebookTitle")}
                    </h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      {t("materials.notebookDesc")}
                    </p>
                    <a href="https://notebooklm.google.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block">
                      {language === 'ko' ? 'NotebookLM 열기' : 'Open NotebookLM'}
                    </a>
                  </div>
                </div>

                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                    )}
                    <p className="text-sm text-indigo-900 font-medium">
                      {isUploading
                        ? t("materials.uploading")
                        : language === 'ko' ? '클릭하여 파일 업로드 (현재 폴더에 저장됨)' : 'Click to upload (saved to current folder)'}
                    </p>
                    <p className="text-xs text-indigo-500 mt-1">
                      .txt, .md, .csv
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.csv"
                    onChange={handleFileUpload}
                    disabled={isUploading || isLoading}
                  />
                </label>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-600 overflow-x-auto pb-1">
                    {folderPath.map((folder, index) => (
                      <React.Fragment key={folder.id}>
                        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                        <button
                          onClick={() => handleNavigateFolder(folder)}
                          className={`hover:text-indigo-600 transition-colors whitespace-nowrap ${index === folderPath.length - 1 ? 'text-indigo-900 font-bold' : ''}`}
                        >
                          {folder.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCreateFolder}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      {language === 'ko' ? '새 폴더' : 'New Folder'}
                    </button>
                    {folderId && (
                      <a
                        href={`https://drive.google.com/drive/folders/${currentFolderId || folderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-2"
                        title={language === 'ko' ? '드라이브에서 폴더 열기' : 'Open folder in Drive'}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {isLoading && files.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {t("materials.noFiles")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => {
                      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                      const isSelected = selectedFiles.some(f => f.id === file.id);
                      const isFileProcessing = processingFiles.has(file.id);
                      return (
                        <div
                          key={file.id}
                          onClick={() => {
                            if (isFileProcessing) return;
                            isFolder ? handleNavigateFolder({id: file.id, name: file.name}) : handleToggleFile(file.id, file.name);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isFileProcessing ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                          } ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div
                              className={`p-2 rounded-lg ${isSelected ? "bg-indigo-100 text-indigo-600" : isFolder ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"}`}
                            >
                              {isFolder ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div className="truncate">
                              <p
                                className={`text-sm font-medium truncate ${isSelected ? "text-indigo-900" : "text-gray-900"}`}
                              >
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isFolder ? (language === 'ko' ? '폴더' : 'Folder') : new Date(
                                  file.createdTime,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isFileProcessing ? (
                              <div className="flex items-center gap-2 mr-2">
                                <span className="text-xs text-indigo-600 font-medium">{language === 'ko' ? '분석 중...' : 'Processing...'}</span>
                                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                              </div>
                            ) : !isFolder && (
                              <div className={`w-5 h-5 rounded border flex items-center justify-center mr-2 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                              </div>
                            )}
                            <button
                              onClick={(e) => handleRename(file.id, file.name, e)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                              disabled={isLoading || isFileProcessing}
                              title={language === 'ko' ? '이름 변경' : 'Rename'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteFile(file.id, e)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              disabled={isLoading || isFileProcessing}
                              title={language === 'ko' ? '삭제' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
