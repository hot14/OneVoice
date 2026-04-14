/**
 * OneVoice 공통 타입 정의
 * 앱 전반에서 사용되는 타입들을 중앙 관리
 */

// ============= API Settings =============

export type ApiProvider = 'gemini' | 'openai' | 'custom' | 'embedgemma' | 'auto' | 'custom_turn_based';

export interface ApiSettings {
  provider: ApiProvider;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface EmbeddingApiSettings extends ApiSettings {
  embeddingApiProvider?: ApiProvider;
  embeddingApiBaseUrl?: string;
  embeddingApiKey?: string;
  embeddingApiModel?: string;
}

// ============= User Profile =============

export interface UserSkills {
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  listening: number;
  speaking?: number;
  reading?: number;
  writing?: number;
}

export interface RoadmapStep {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
}

export interface Roadmap {
  steps: RoadmapStep[];
  currentStep?: number;
}

export interface UserProfile {
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  level?: number;
  nativeLanguage?: string;
  learningGoals?: string;
  currentMaterial?: string;
  skills?: UserSkills;
  roadmap?: Roadmap;
  // API configurations
  chatApiProvider?: ApiProvider;
  chatApiBaseUrl?: string;
  chatApiKey?: string;
  chatApiModel?: string;
  embeddingApiProvider?: ApiProvider;
  embeddingApiBaseUrl?: string;
  embeddingApiKey?: string;
  embeddingApiModel?: string;
  liveApiProvider?: ApiProvider;
  liveApiBaseUrl?: string;
  liveApiKey?: string;
  liveApiModel?: string;
  liveApiVoice?: string;
}

// ============= Transcript & Session =============

export type TranscriptRole = 'user' | 'tutor';

export interface TranscriptMessage {
  role: TranscriptRole;
  text: string;
  timestamp?: number;
}

export type SessionState = 'idle' | 'connecting' | 'recording' | 'error';

export interface ToolCallArgs {
  query?: string;
  [key: string]: unknown;
}

export interface FunctionCall {
  id: string;
  name: string;
  args: ToolCallArgs;
}

export interface FunctionResponse {
  id: string;
  name: string;
  response: { result?: string; error?: string };
}

// ============= Materials =============

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime?: string;
  size?: number;
  webViewLink?: string;
}

export interface FolderPath {
  id: string;
  name: string;
}

export interface SelectedMaterial {
  id: string;
  name: string;
  content: string;
}

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface ProcessingFileEntry {
  id: string;
  status: ProcessingStatus;
  error?: string;
}

export interface MaterialData {
  id: string;
  name: string;
  summary: string;
  chunks?: string[];
  createdAt?: Date;
}

// ============= Vocabulary & Lessons =============

export interface VocabularyItem {
  id: string;
  thai?: string;
  korean?: string;
  meaning?: string;
  exampleSentence?: string;
  exampleMeaning?: string;
  pronunciation?: string;
  mastery: number;
  notes?: string;
  createdAt?: Date;
  lastReviewed?: Date;
  nextReviewAt?: Date;
}

export interface ExpGained {
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  listening: number;
}

export interface LessonData {
  id: string;
  topic: string;
  durationSeconds: number;
  transcript: TranscriptMessage[];
  summary: string;
  feedback: string;
  learningTips: string;
  expGained: ExpGained;
  acquiredExpressions: VocabularyItem[];
  diagnosedLevel: number;
  levelReasoning: string;
  completedAt?: Date;
}

// ============= Audio =============

export interface AudioProcessorConfig {
  bufferSize?: number;
  sampleRate?: number;
  rmsThreshold?: number;
}

export interface AudioLevelInfo {
  rms: number;
  peak: number;
  isActive: boolean;
}

// ============= Firestore =============

export type FirestoreOperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  userId?: string;
}

// ============= Error Boundary =============

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: React.ErrorInfo;
  resetKey: number;
}