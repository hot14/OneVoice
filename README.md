# OneVoice - AI 동시통역 & 언어 학습 앱

## 개요

**OneVoice**는 Google Gemini Live API를 활용한 실시간 음성 동시통역과 AI 튜터 기능을 결합한 언어 학습 웹 애플리케이션입니다. 사용자는 실시간으로 외국어 대화를 통역받거나, AI 튜터와 스터디 자료를 기반으로 학습하고, 간헐적 반복(Spaced Repetition)을 통해 어휘력을 체계적으로 향상시킬 수 있습니다.

---

## 주요 기능

### 1. 실시간 동시통역 (Interpreter Session)

사용자가 마이크로 말을 하면 Gemini 3.1 Flash Live API가 실시간으로 음성을 인식하고 번역합니다.

**핵심 특성:**
- **실시간 Audio-to-Audio**: 마이크 입력 → AI 처리 → 음성 출력
- **자동 재연결**: 네트워크 단절 시 최대 3회 자동 재시도 (Exponential backoff)
- **다국어 지원**: 한국어, 영어, 태국어 등
- **대화 저장**: 세션 종료 후 Firestore에 요약 및 키워드 저장

**기술 스택:**
- `GoogleGenAI` (Gemini SDK)
- Web Audio API (AudioWorklet)
- Browser MediaRecorder API

---

### 2. AI 튜터 (Tutor Session)

RAG(Retrieval-Augmented Generation) 기반 AI 튜터가 사용자의 학습 자료에 기반한 컨텍스트 인식 대화를 제공합니다.

**핵심 특성:**
- **RAG 검색**: 사용자가 업로드한 PDF/TXT 자료에서 관련 내용 검색
- **간헐적 반복 flashcards**: 사용자가 직접 태국어 어휘를 추가
- **실시간 음성 대화**: 음성으로 AI와 상호작용
- **대화 히스토리**: 학습 세션별 대화 기록 저장

**기술 스택:**
- `EmbeddingGemma` (온디바이스 임베딩, HuggingFace transformers.js)
- OpenAI/gpt-4o-mini (요약/대화)
- Google Gemini (Live)
- Browser Web Speech API (음성 인식/합성)

---

### 3. 단어 복습 (Review Session)

SM-2 알고리즘 기반 간헐적 반복 시스템으로 어휘를 효과적으로 기억합니다.

**핵심 특성:**
- **Spaced Repetition**: 복습 간격 자동 조정
- **Mastery 지수**: 0-100으로 암기 정도 추적
- **품질 평가**: Again(0), Hard(1), Good(2), Easy(3) 버튼

**기술 스택:**
- `srsUtils.ts`: SM-2 알고리즘 구현
- Firestore: 사용자별 vocabulary 컬렉션

---

## 기술 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Interpreter │   Tutor      │   Review    │   Material     │
│  Session     │   Session    │   Session   │   Manager     │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                     Contexts & Hooks                          │
│  LanguageContext  │  AudioUtils  │  RagUtils  │  PII Filter │
├─────────────────────────────────────────────────────────────┤
│                    AI / ML Layer                              │
│  Google Gemini Live  │  EmbeddingGemma  │  OpenAI gpt-4o-mini│
├─────────────────────────────────────────────────────────────┤
│                    Firebase Layer                             │
│  Authentication  │  Firestore  │  Google Drive API           │
└─────────────────────────────────────────────────────────────┘
```

---

### 핵심 모듈

| 모듈 | 위치 | 설명 |
|------|------|------|
| `firebase.ts` | `src/` | Firebase 초기화 (Auth, Firestore) |
| `audioUtils.ts` | `src/lib/` | AudioRecorder, AudioPlayer (Web Audio API) |
| `ragUtils.ts` | `src/lib/` | RAG 검색, Embedding 생성, Chat 응답 |
| `semanticCache.ts` | `src/lib/` | 시맨틱 캐싱 (API 호출 최적화) |
| `promptNormalizer.ts` | `src/lib/` | 프롬프트 정규화 + 정확 일치 캐시 |
| `srsUtils.ts` | `src/lib/` | SM-2 간헐적 반복 알고리즘 |
| `piiFilter.ts` | `src/lib/` | PII 마스킹 (이메일, 전화번호 등) |
| `logger.ts` | `src/lib/` | Production-safe 로깅 |
| `firestoreUtils.ts` | `src/lib/` | Firestore 에러 처리 |

---

## 데이터 모델

### Firestore 구조

```
users/{userId}
├── uid: string
├── email: string
├── displayName: string
├── photoURL: string
├── level: number (1-100)
├── chatApiProvider: "gemini" | "openai" | "embedgemma"
├── chatApiBaseUrl: string
├── chatApiModel: string
├── embeddingApiProvider: "gemini" | "openai" | "embedgemma"
├── embeddingApiModel: string
├── liveApiProvider: "gemini"
├── liveApiModel: string
├── liveApiVoice: string
├── createdAt: timestamp
├── lastActiveAt: timestamp
├── usageCount: number
├── usageDuration: number
│
├── vocabulary/{vocabId}
│   ├── thai: string (태국어 단어)
│   ├── meaning: string (의미)
│   ├── pronunciation: string (발음)
│   ├── exampleSentence: string (예문)
│   ├── exampleMeaning: string (예문 번역)
│   ├── interval: number (다음 복습 간격)
│   ├── easeFactor: number (난이도)
│   ├── repetitions: number (반복 횟수)
│   ├── mastery: number (0-100)
│   ├── nextReviewAt: timestamp
│   └── lastReviewedAt: timestamp
│
├── lessons/{lessonId}
│   ├── topic: string
│   ├── content: string
│   ├── summary: string
│   └── createdAt: timestamp
│
└── conversations/{conversationId}
    ├── summary: string
    ├── keyPoints: string[]
    ├── speakers: string[]
    ├── sourceTranscript: string
    ├── targetTranscript: string
    └── createdAt: timestamp

materials/{materialId}
├── userId: string
├── title: string
├── fileName: string
├── fileType: string
├── status: "pending" | "processing" | "completed" | "failed"
├── chunks: Array<{text: string, embedding: number[]}>
├── summary: string
├── createdAt: timestamp
└── updatedAt: timestamp
```

---

## API 연동

### AI Provider 설정

사용자는 설정에서 세 가지 AI 기능을 개별적으로 구성할 수 있습니다:

| 기능 | 기본 Provider | 대체 옵션 |
|------|-------------|----------|
| **Live 통역** | Gemini 3.1 Flash Live | OpenAI Realtime |
| **Chat (요약/대화)** | OpenAI gpt-4o-mini | Gemini, Custom |
| **Embedding** | EmbeddingGemma (무료, 온디바이스) | OpenAI, Gemini |

### EmbeddingGemma (온디바이스)

HuggingFace transformers.js를 활용한 **무료 EmbeddingGemma** 구현:
- 308M 파라미터, Q8 양자화 (200MB RAM)
- WebGPU 가용 시 온디바이스 실행
- WebGPU 미지원 시 API 폴백

### 시맨틱 캐싱

```
Query 입력
    │
    ▼
┌─────────────────────┐
│ 1. 정확 일치 캐시    │ ← 24시간 TTL, 500개 제한
└─────────────────────┘
    │ (miss)
    ▼
┌─────────────────────┐
│ 2. 시맨틱 캐시       │ ← Cosine similarity ≥ 0.92
└─────────────────────┘
    │ (miss)
    ▼
┌─────────────────────┐
│ 3. Fresh API Call   │
└─────────────────────┘
```

---

## 보안

### API 키 관리

- **저장 위치**: localStorage만 사용 (Firestore에 저장하지 않음)
- **전송**: HTTPS만 사용 (Firebase 기본)
- **로깅**: Production에서 API 키 마스킹

### PII 보호

`piiFilter.ts`가 다음 형식을 마스킹:
- 이메일 (표준 형식)
- 전화번호 (한국/일본/미국/유럽 형식)
- 주민등록번호 (한국)
- 여권번호
- 카드번호

### Firestore Rules

```javascript
function isOwner(userId) {
  return request.auth.uid == userId;
}

function isAdmin() {
  return request.auth.token.admin == true;
}

match /users/{userId} {
  allow read: if isOwner(userId) || isAdmin();
  allow write: if isOwner(userId) || isAdmin();
}
```

---

## 성능 최적화

### 구현된 최적화

| 최적화 | 파일 | 효과 |
|--------|------|------|
| **시맨틱 캐싱** | `semanticCache.ts` | API 호출 50-70% 감소 |
| **프롬프트 정규화** | `promptNormalizer.ts` | 중복 호출 방지 |
| **온디바이스 Embedding** | `ragUtils.ts` | API 비용 $0 |
| **샘플레이트 통일** | `audioUtils.ts` | 리샘플링 제거 (16kHz) |
| **AudioWorklet 최적화** | `audioProcessor.js` | 지연 감소 |
| **번들 분할** | `vite.config.ts` | 초기 로드 최적화 |

### Live API 재연결

```
연결 끊김 감지
    │
    ▼
재시도 카운트 < 3?
    │
  Yes ──No──→ 에러 표시
    │
    ▼
delay = min(1000 * 2^count, 8000)
    │
    ▼
재연결 시도
```

---

## 다국어 지원

### 지원 언어

- **한국어** (ko) - UI 언어
- **영어** (en) - 학습 대상
- **태국어** (th) - 학습 자료

### 언어 설정 구조

```typescript
interface Language {
  ko: string;  // 한국어
  en: string;  // 영어
  th: string;  // 태국어
}
```

### Proficiency Level (1-100)

| 레벨 | 제목 | 설명 |
|------|------|------|
| 1 | Novice | 기본 인사말, 숫자 |
| 10 | Upper Novice | 일상 대화, 비격식 회화 |
| 25 | Intermediate | 비즈니스 미팅, 레스토랑 |
| 50 | Upper Intermediate | 인터뷰, 계약 협상 |
| 75 | Advanced | 문학, 방언, 격식 문어체 |
| 100 | Master | 모든 시나리오, 자유 토론 |

---

## 설치 및 실행

### 의존성 설치

```bash
npm install
```

### 개발 서버

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 테스트

```bash
npm test
```

### 환경 변수

`.env` 파일 생성:
```bash
GEMINI_API_KEY="your-api-key"
VITE_GEMINI_API_KEY="your-api-key"
```

---

## 폴더 구조

```
OneVoice/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Google OAuth 로그인
│   │   ├── InterpretationDashboard.tsx  # 메인 대시보드
│   │   ├── InterpretationHome.tsx # 홈 화면
│   │   ├── InterpreterSession.tsx # 동시통역 세션
│   │   ├── TutorSession.tsx      # AI 튜터 세션
│   │   ├── ReviewSession.tsx      # 단어 복습
│   │   ├── MaterialManager.tsx    # 자료 관리
│   │   ├── ErrorBoundary.tsx     # 에러 경계
│   │   └── LanguageSwitch.tsx     # 언어 전환
│   ├── contexts/
│   │   └── LanguageContext.tsx   # 다국어 지원 컨텍스트
│   ├── lib/
│   │   ├── audioUtils.ts         # 오디오 녹음/재생
│   │   ├── audioProcessor.js      # AudioWorklet 프로세서
│   │   ├── ragUtils.ts           # RAG 검색, AI API 호출
│   │   ├── semanticCache.ts       # 시맨틱 캐싱
│   │   ├── promptNormalizer.ts    # 프롬프트 정규화
│   │   ├── srsUtils.ts           # SM-2 알고리즘
│   │   ├── piiFilter.ts          # PII 마스킹
│   │   ├── logger.ts             # Production 로깅
│   │   ├── firestoreUtils.ts     # Firestore 유틸
│   │   └── proficiencyRubric.ts  # 레벨 정의
│   ├── firebase.ts               # Firebase 초기화
│   ├── App.tsx                  # 루트 컴포넌트
│   └── main.tsx                 # 엔트리 포인트
├── public/
│   └── src/lib/audioProcessor.js # AudioWorklet (public 폴더)
├── firebase-applet-config.json   # Firebase 설정 (gitignore)
├── firestore.rules              # Firestore 보안 규칙
├── package.json
├── tsconfig.json
├── vite.config.ts
├── PROJECT_REQUIREMENTS.md       # 요구사항 문서
└── README.md                    # 이 문서
```

---

## 기술 스택

| 카테고리 | 기술 |
|---------|------|
| **프레임워크** | React 19, TypeScript, Vite |
| **스타일링** | Tailwind CSS, Lucide React |
| **애니메이션** | Motion (Framer Motion) |
| **AI** | Google Gemini SDK, HuggingFace transformers.js |
| **Backend** | Firebase (Auth, Firestore) |
| **오디오** | Web Audio API, MediaRecorder, AudioWorklet |
| **음성** | Browser Web Speech API |
| **Testing** | Vitest |

---

## 참고 사항

1. **Firebase 설정**: `firebase-applet-config.json`은 로컬에서만 사용되며 깃허브에 푸시되지 않습니다.
2. **API 키**: localStorage에 저장되며 사용자가 설정에서 직접 입력합니다.
3. **Google Drive**: OAuth 시 Drive 읽기 권한을 요청하여 NotebookLM 파일에 접근합니다.
