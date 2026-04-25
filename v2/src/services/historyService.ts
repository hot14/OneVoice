
export interface ScriptLine {
  id: string;
  speaker: 'user' | 'other';
  speakerLabel: string;
  originalText: string;
  translatedText: string;
  isUser: boolean;
  timestamp?: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  langs: string;
  date: string;
  duration: string;
  participants: string;
  type: 'translate' | 'guide';
  summary: string;
  script: ScriptLine[];
}

const STORAGE_KEY = 'onevoice_history';

export const getHistory = (): HistoryItem[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const getHistoryItem = (id: string): HistoryItem | undefined => {
  const history = getHistory();
  return history.find((item) => item.id === id);
};

export const saveHistoryItem = (item: HistoryItem) => {
  const history = getHistory();
  const updated = [item, ...history];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteHistoryItem = (id: string) => {
  const history = getHistory();
  const updated = history.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const generateSummary = async (script: ScriptLine[]): Promise<string> => {
  // Simple summary for demo purposes
  if (script.length === 0) return "대화 내용이 없습니다.";
  const lastLine = script[script.length - 1].translatedText;
  return `이 세션은 약 ${script.length}번의 발화가 포함되어 있습니다. 마지막 주요 내용: "${lastLine.slice(0, 30)}..."`;
};
