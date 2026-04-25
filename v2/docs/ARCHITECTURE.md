# OneVoice v2 - 아키텍처 문서

---

## 1. 시스템 개요

```
┌─────────────────────────────────────────────────────────────┐
│                  사용자 브라우저                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React 19 + TypeScript UI                   │   │
│  │  (Translate, Guide, History 페이지)                 │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │           서비스 계층 (Services)                      │   │
│  │  • geminiService.ts (번역, 요약, 챗)               │   │
│  │  • historyService.ts (히스토리 관리)                │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │           라이브러리 계층 (Libraries)                 │   │
│  │  • audioUtils.ts (AudioRecorder, AudioPlayer)      │   │
│  │  • languageDetect.ts (언어 감지)                    │   │
│  │  • piiFilter.ts (PII 마스킹)                        │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │        Web APIs                                       │   │
│  │  • getUserMedia (마이크)                             │   │
│  │  • AudioContext (16kHz)                             │   │
│  │  • AudioWorklet (PCM 변환)                          │   │
│  │  • localStorage (히스토리)                           │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
       ┌──────────────▼──────────────┐
       │  Gemini Live API            │
       │  (WebSocket)                │
       │  • 16kHz PCM 입력           │
       │  • 24kHz PCM 출력           │
       │  • 실시간 번역              │
       └─────────────────────────────┘
```

---

## 2. 오디오 파이프라인

### 입력 경로 (마이크 → Gemini)

```
마이크 입력
    ↓
getUserMedia (constraints: {audio: {sampleRate: 16000}})
    ↓
AudioContext (sampleRate: 16000)
    ↓
AudioWorklet (audioProcessor.js)
    ├─ PCM16LE로 변환
    ├─ 1초 청크로 분할
    └─ 회원 전송
    ↓
Base64 인코딩
    ↓
WebSocket → Gemini Live API
```

**핵심 코드** (`src/lib/audioUtils.ts`):
```typescript
class AudioRecorder {
  private context: AudioContext;
  private worklet: AudioWorkletNode;
  
  async start(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000 }
    });
    this.source = this.context.createMediaStreamAudioSource(stream);
    this.source.connect(this.worklet);
    this.worklet.connect(this.context.destination);
  }
}
```

### 출력 경로 (Gemini → 스피커)

```
Gemini Live API 응답
    ↓
Base64 디코딩
    ↓
PCM16LE (24kHz)
    ↓
AudioContext에 로드
    ↓
StereoPanner 적용 (이어폰 모드)
    ├─ 사용자 발화: -1.0 (좌측)
    └─ 상대방 발화: +1.0 (우측)
    ↓
스피커 출력
```

**핵심 코드** (`src/lib/audioUtils.ts`):
```typescript
class AudioPlayer {
  async playAudio(base64Audio: string): Promise<void> {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBuffer = await this.context.decodeAudioData(bytes.buffer);
    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    
    // 이어폰 모드: 스테레오 분리
    if (this.isEarphoneMode) {
      source.connect(this.panner);
      this.panner.pan.value = this.panValue; // -1 또는 +1
    } else {
      source.connect(this.context.destination);
    }
    
    source.start();
  }
}
```

---

## 3. 컴포넌트 구조

### 페이지별 역할

```
App.tsx (라우터)
├── Home (/)
│   └─ 로그인, 기능 소개
├── Translate (/)
│   ├─ 실시간 동시통역
│   ├─ 이어폰 모드 토글
│   └─ 세션 저장
├── Guide (/guide)
│   ├─ Knowledge Guide 챗봇
│   └─ 다중 턴 대화
├── History (/history)
│   ├─ 세션 목록
│   ├─ 검색
│   └─ 삭제
└── HistoryDetail (/history/:id)
    ├─ 전체 대화 전사
    ├─ 원문 + 번역문
    └─ 메타데이터
```

### 주요 컴포넌트

| 컴포넌트 | 역할 | 상태 |
|---------|------|------|
| `Layout.tsx` | 네비게이션, 레이아웃 | UI 프레임워크 |
| `PretextWrap.tsx` | Pretext 통합 | 음성 강조 |

---

## 4. 데이터 흐름

### 세션 라이프사이클

```
1. 세션 초기화
   ├─ AudioRecorder 생성 (16kHz)
   ├─ AudioPlayer 생성
   ├─ Gemini Live WebSocket 연결
   └─ 언어 쌍 설정 (lang1, lang2)

2. 오디오 스트리밍
   ├─ 마이크 → PCM16 → Base64
   ├─ WebSocket → Gemini Live API
   └─ 1초마다 청크 전송

3. 텍스트 수신 및 파싱
   ├─ Gemini Live 응답 수신
   ├─ [ORIGINAL]: ... 정규식으로 원문 추출
   ├─ [TRANSLATED]: ... 정규식으로 번역문 추출
   ├─ 화자 감지 (유니코드 범위)
   ├─ 오디오 응답 재생 (StereoPanner)
   └─ UI 업데이트

4. 세션 저장
   ├─ ScriptLine[] 수집
   ├─ 메타데이터 생성 (날짜, 언어, 참여자)
   └─ localStorage에 HistoryItem 저장
```

### 상태 관리 패턴

**Translate.tsx 상태**:
```typescript
const [isRecording, setIsRecording] = useState(false);      // 녹음 중
const [bottomLang, setBottomLang] = useState("ko");         // 하단 언어
const [topLang, setTopLang] = useState("en");               // 상단 언어
const [bottomText, setBottomText] = useState("");           // 하단 원문
const [topText, setTopText] = useState("");                 // 상단 번역
const [script, setScript] = useState<ScriptLine[]>([]);     // 전체 대화
const recorderRef = useRef<AudioRecorder | null>(null);     // 오디오 레코더
const sessionRef = useRef<any>(null);                       // Gemini Live 세션
```

---

## 5. Gemini Live API 통합

### 연결 흐름

```typescript
const session = ai.live.connect({
  model: "gemini-3.1-flash-live-preview",
  config: {
    responseModalities: [Modality.TEXT, Modality.AUDIO],
    voiceConfig: { voiceName: "Aoede" },
    outputAudioTranscription: {}
  }
});

session.on("open", () => console.log("WebSocket 연결"));
session.on("message", (message) => handleMessage(message));
session.on("close", () => console.log("WebSocket 종료"));

// 오디오 스트림 전송
session.send([
  new Part({
    inlineData: {
      mimeType: "audio/pcm",
      data: base64EncodedPCM
    }
  })
]);
```

### 설정 파라미터

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `model` | `gemini-3.1-flash-live-preview` | 사용 모델 |
| `responseModalities` | `[TEXT, AUDIO]` | 텍스트 + 오디오 동시 반환 |
| `voiceConfig.voiceName` | `Aoede` | 출력 음성 (자연스러운 한국어) |
| `outputAudioTranscription` | `{}` | 오디오 전사 활성화 |
| `systemInstruction` | (설정 안 함) | 기본 설정 사용 |

### 메시지 파싱

```typescript
// Gemini Live는 텍스트 응답에 다음 형식 사용:
// [ORIGINAL]: 원문
// [TRANSLATED]: 번역문

const originalMatch = text.match(/\[ORIGINAL\]:\s*(.+?)(?=\[TRANSLATED\]|$)/);
const translatedMatch = text.match(/\[TRANSLATED\]:\s*(.+?)$/);

const originalText = originalMatch?.[1]?.trim() || "";
const translatedText = translatedMatch?.[1]?.trim() || "";
```

---

## 6. 화자 감지 (Language Detection)

### 유니코드 범위 기반

```typescript
const isLanguageKorean = (t: string) => /[가-힣]/.test(t);

const guessLanguage = (text: string, lang1: string, lang2: string) => {
  const isL1Ko = lang1 === "ko";
  const containsKo = isLanguageKorean(text);
  if (isL1Ko) return containsKo ? lang1 : lang2;
  return containsKo ? "ko" : (lang1 === "ko" ? lang1 : lang2);
};
```

**범위 정의**:
- 한국어 (가-힣): U+AC00 ~ U+D7A3
- 일본어 (히라가나): U+3040 ~ U+309F
- 중국어 (CJK): U+4E00 ~ U+9FFF

**정확도**: ~85% (하이브리드 문법에서 낮을 수 있음)

---

## 7. 상태 관리: localStorage

### HistoryItem 스키마

```typescript
interface HistoryItem {
  id: string;                    // UUID (nanoid 같은 라이브러리)
  title: string;                 // 세션 제목 (auto-generated)
  langs: string;                 // "ko-en" 형식
  date: string;                  // ISO 8601 (2024-04-25T10:30:00Z)
  duration: string;              // "12분 34초"
  participants: string;          // "You & Guest"
  type: 'translate' | 'guide';  // 세션 유형
  summary: string;               // AI 생성 요약
  script: ScriptLine[]          // 전체 대화
}

interface ScriptLine {
  id: string;
  speaker: 'user' | 'other';
  speakerLabel: string;          // "You" 또는 "Guest"
  originalText: string;
  translatedText: string;
  isUser: boolean;
  timestamp?: number;            // ms since session start
}
```

### localStorage 저장 방식

```typescript
const STORAGE_KEY = 'onevoice_history';

// 저장
const history = getHistory(); // 기존 데이터 로드
const updated = [newItem, ...history]; // 최신 항목 맨 앞
localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

// 로드
const data = localStorage.getItem(STORAGE_KEY);
const history = data ? JSON.parse(data) : [];
```

**크기 제한**: ~5MB (대부분 브라우저 표준)

---

## 8. 보안 고려사항

### PII (Personally Identifiable Information) 필터

```typescript
// src/lib/piiFilter.ts
export const maskPII = (text: string): string => {
  return text
    .replace(/\d{6}-\d{7}/g, "[주민번호]")           // 주민등록번호
    .replace(/\d{4}-\d{4}-\d{4}-\d{4}/g, "[카드]")   // 신용카드
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[이메일]")    // 이메일
    .replace(/\d{10,11}/g, "[전화번호]");             // 휴대폰
};
```

**마스킹 시점**:
1. Gemini API로 전송 전 (입력)
2. UI 표시 전 (선택적 - 민감한 데이터)
3. localStorage 저장 전 (선택적)

### API 키 보안

**주의**: 클라이언트 사이드 API 키는 보안 위험

**현재 (v2)**: 프로토타입이므로 가능
**향후 (v3)**: 백엔드 프록시 추가
```
브라우저 → 백엔드 (인증) → Gemini API
```

---

## 9. 성능 최적화

### AudioWorklet 스레딩

```typescript
// 메인 스레드 블로킹 방지
// audioProcessor.js는 별도 스레드에서 실행
class AudioWorkletProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0][0]; // 첫 채널
    
    // PCM16 변환 (Float32 → Int16)
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      pcm16[i] = Math.max(-1, Math.min(1, input[i])) * 0x7FFF;
    }
    
    // 1초마다 포스트메시지
    this.port.postMessage(pcm16);
    return true;
  }
}
```

### 청크 스플리팅

```typescript
// 1초 × 16kHz = 16,000 샘플
// 2바이트 × 16,000 = 32,000 바이트
// Base64 인코딩 → ~42,666 바이트 → WebSocket 전송
```

---

## 10. 에러 처리 및 재연결

### 자동 재연결 로직

```typescript
async function connectWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const session = ai.live.connect({ /* config */ });
      return session;
    } catch (error) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 지수 백오프
      console.log(`재시도 ${attempt}/${maxAttempts}, ${delay}ms 후`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("연결 실패");
}
```

**재시도 정책**:
- 1차: 즉시
- 2차: 1초 후
- 3차: 2초 후
- 실패: 사용자 알림

---

## 11. 배포 아키텍처

```
로컬 개발 (npm run dev)
  ↓
프로덕션 빌드 (npm run build)
  ├─ vite build → dist/ 폴더
  ├─ audioProcessor.js public에서 dist로 복사
  └─ dist 크기: ~2.5MB (gzip)
  ↓
정적 호스팅 (Vercel / Netlify)
  ├─ HTTPS 자동 적용
  ├─ CDN 배포
  ├─ 환경 변수 설정 (GEMINI_API_KEY)
  └─ 자동 배포 (git push)
```

---

## 12. 모니터링 및 로깅

### 클라이언트 로그

```typescript
// src/pages/Translate.tsx
console.log(`[SESSION] Connected to Gemini Live`);
console.log(`[AUDIO] Sent ${pcm16.length} bytes`);
console.log(`[TEXT] Original: ${originalText}`);
console.log(`[TEXT] Translated: ${translatedText}`);
console.log(`[HISTORY] Saved session ${item.id}`);
```

### 모니터링 메트릭

| 메트릭 | 목표 | 방법 |
|--------|------|------|
| API 응답시간 | < 2s | performance.now() |
| 메모리 사용 | < 100MB | navigator.deviceMemory |
| 오디오 지연 | < 5s | 타임스탬프 추적 |
| WebSocket 연결 상태 | 99.9% | session.on("close") 추적 |
