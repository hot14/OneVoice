# OneVoice v2 - API 참고서

---

## 1. Gemini Live API

### 1.1 API 개요

**모델**: `gemini-3.1-flash-live-preview`

**프로토콜**: WebSocket (wss://)

**기본 URL**: `https://generativelanguage.googleapis.com/google.ai.generativelanguage.v1alpha.GenerativeService`

**인증**: API 키 기반 (쿼리 파라미터)

### 1.2 연결 설정

```typescript
const session = await ai.live.connect({
  model: "gemini-3.1-flash-live-preview",
  config: {
    systemInstruction: "당신은 동시통역 AI입니다. 간결하고 정확하게 응답하세요.",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  },
});
```

**설정 파라미터**:

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `model` | string | O | 모델 ID |
| `systemInstruction` | string | X | 시스템 프롬프트 |
| `temperature` | number | X | 0.0~2.0 (기본: 1.0) |
| `maxOutputTokens` | number | X | 최대 출력 토큰 |
| `responseModalities` | array | X | ["TEXT", "AUDIO"] |
| `voiceConfig` | object | X | { voiceName: "Aoede" } |

### 1.3 메시지 송수신

**사용자 메시지 전송**:
```typescript
await session.send([
  {
    role: "user",
    parts: [
      {
        mimeType: "audio/pcm;rate=16000",
        data: base64EncodedAudio,
      },
    ],
  },
]);
```

**응답 수신**:
```typescript
const response = await session.receive();
// {
//   contentParts: [
//     {
//       text: "안녕하세요.",
//       inlineData: {
//         mimeType: "audio/pcm;rate=24000",
//         data: base64EncodedAudio,
//       }
//     }
//   ]
// }
```

### 1.4 오디오 포맷

| 구분 | 입력 | 출력 |
|------|------|------|
| **샘플 레이트** | 16 kHz | 24 kHz |
| **포맷** | PCM 16비트 LE | PCM 16비트 LE |
| **청크 크기** | 16,000 샘플 (1초) | 24,000 샘플 (1초) |
| **바이트 크기** | 32 KB | 48 KB |
| **MIME 타입** | audio/pcm;rate=16000 | audio/pcm;rate=24000 |

### 1.5 에러 처리

**API 에러 코드**:

| 상태 코드 | 설명 | 복구 방법 |
|---------|------|---------|
| 401 | API 키 잘못됨 | .env.local 확인 |
| 429 | 요청 한계 초과 | 지수 백오프 재시도 |
| 500 | 서버 오류 | 1~4초 후 재연결 |
| 503 | 서비스 점검 | 지수 백오프 (최대 3회) |

**에러 처리 예시**:
```typescript
try {
  await session.send(message);
} catch (error) {
  if (error.code === 429) {
    // 지수 백오프 재시도
    const delay = Math.pow(2, attemptCount) * 1000;
    setTimeout(() => retry(), delay);
  } else if (error.code === 401) {
    setError("API 키가 유효하지 않습니다.");
  }
}
```

---

## 2. Service 함수 API

### 2.1 번역 함수

**함수**: `translateText(text, sourceLang, targetLang)`

```typescript
const result = await translateText("안녕하세요", "ko", "en");
// Returns: "Hello"
```

**파라미터**:

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `text` | string | O | 번역할 텍스트 |
| `sourceLang` | string | O | 원본 언어 코드 (ko, en, jp, cn, fr, de, es) |
| `targetLang` | string | O | 대상 언어 코드 |

**반환값**: `Promise<string>` - 번역된 텍스트

**에러**: Gemini API 오류 발생 시 `throw error`

**예제**:
```typescript
try {
  const translated = await translateText("환영합니다", "ko", "jp");
  console.log(translated); // "いらっしゃいませ"
} catch (error) {
  console.error("번역 실패:", error);
}
```

### 2.2 요약 함수

**함수**: `summarizeConversation(conversationText)`

```typescript
const summary = await summarizeConversation(scriptText);
// Returns: ["첫 번째 핵심 요점", "두 번째 핵심 요점", "세 번째 핵심 요점"]
```

**파라미터**:

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `conversationText` | string | O | 대화 전체 텍스트 |

**반환값**: `Promise<string[]>` - 3개의 핵심 요점 배열

**기본 응답**: 오류 시 `["내용 요약 불가"]` 또는 `["내용 요약 중 오류 발생"]`

**예제**:
```typescript
const script = "사용자: 안녕하세요\n상대방: 안녕하세요";
const points = await summarizeConversation(script);
// [
//   "인사 인사",
//   "상호 존중",
//   "기본 대화"
// ]
```

### 2.3 가이드 챗봇 함수

**함수**: `chatWithGuide(history, message)`

```typescript
const response = await chatWithGuide(
  [
    { role: "user", parts: [{ text: "일본 인사법을 알려주세요" }] },
    { role: "model", parts: [{ text: "일본에서는..." }] }
  ],
  "감사 표현은?"
);
```

**파라미터**:

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `history` | ChatMessage[] | O | 이전 대화 히스토리 |
| `message` | string | O | 사용자의 현재 메시지 |

**ChatMessage 구조**:
```typescript
{
  role: "user" | "model",
  parts: [
    {
      text: string
    }
  ]
}
```

**반환값**: `Promise<string>` - AI 응답 텍스트

**기본 응답**: 오류 시 `"Sorry, I couldn't understand that."` 또는 `"Error connecting to AI. Please try again."`

**예제**:
```typescript
const messages = [];
const userQuestion = "한국에서 명함 교환 예절은?";

const aiResponse = await chatWithGuide(messages, userQuestion);
// "한국에서는 명함을 받을 때 양손으로 받으며..."

messages.push({ role: "user", parts: [{ text: userQuestion }] });
messages.push({ role: "model", parts: [{ text: aiResponse }] });
```

---

## 3. 히스토리 서비스 API

### 3.1 데이터 모델

**ScriptLine**:
```typescript
{
  id: string;                 // 고유 식별자 (UUID)
  speaker: "user" | "other";  // 발화자 (사용자 또는 상대방)
  speakerLabel: string;       // UI 표시용 라벨 ("You" 또는 "Visitor")
  originalText: string;       // 원본 텍스트
  translatedText: string;     // 번역 텍스트
  isUser: boolean;            // 발화자 판별 플래그
  timestamp?: number;         // 발화 시간 (선택)
}
```

**HistoryItem**:
```typescript
{
  id: string;                    // UUID
  title: string;                 // 세션 제목
  langs: string;                 // 언어 쌍 (예: "ko-en")
  date: string;                  // ISO 8601 날짜
  duration: string;              // 지속시간 (예: "5분 32초")
  participants: string;          // 참여자 ("You & Visitor")
  type: "translate" | "guide";   // 세션 타입
  summary: string;               // 요약 내용
  script: ScriptLine[];          // 전체 스크립트
}
```

### 3.2 CRUD 함수

**조회 - getHistory()**:
```typescript
const allSessions = getHistory();
// Returns: HistoryItem[]
```

**조회 - getHistoryItem(id)**:
```typescript
const session = getHistoryItem("abc-123-def");
// Returns: HistoryItem | undefined
```

**생성 - saveHistoryItem(item)**:
```typescript
saveHistoryItem({
  id: "abc-123-def",
  title: "한-영 비즈니스 회의",
  langs: "ko-en",
  date: new Date().toISOString(),
  duration: "5분 32초",
  participants: "You & Visitor",
  type: "translate",
  summary: "사업 제안 논의",
  script: [/* ... */]
});
```

**삭제 - deleteHistoryItem(id)**:
```typescript
deleteHistoryItem("abc-123-def");
// localStorage에서 제거
```

**저장소 제한**:
- localStorage 최대: ~5MB
- 각 HistoryItem 평균: 50KB~200KB
- 예상 저장 가능: ~25~100개 세션

### 3.3 요약 생성

**함수**: `generateSummary(script)`

```typescript
const summary = await generateSummary(scriptLines);
// Returns: string - 간단한 요약
```

**반환 형식**:
```
"이 세션은 약 12번의 발화가 포함되어 있습니다. 마지막 주요 내용: "회의 일정은..."
```

---

## 4. 언어 감지 API

### 4.1 자동 언어 감지

**함수**: `detectLanguage(text, candidates)`

```typescript
const detected = detectLanguage("こんにちは", ["ko", "jp", "en"]);
// Returns: "jp"
```

**파라미터**:

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `text` | string | O | 감지할 텍스트 |
| `candidates` | string[] | O | 가능한 언어 코드 배열 |

**반환값**: `string` - 감지된 언어 코드

**감지 우선순위**:
1. `ko` (한국어 - Unicode U+AC00~D7AF)
2. `jp` (일본어 - Hiragana/Kanji)
3. `cn` (중국어 - Hanzi)
4. `ar` (아랍어)
5. 기타 언어 (fr, de, es)
6. 기본값: `candidates[0]`

**패턴 테이블**:

| 언어 | Unicode 범위 | 정규식 |
|------|-------------|--------|
| ko | U+AC00~D7AF | /[\uAC00-\uD7AF]/ |
| jp | U+3040~309F | /[\u3040-\u309F]/ |
| cn | U+4E00~9FFF | /[\u4E00-\u9FFF]/ |
| ar | U+0600~06FF | /[\u0600-\u06FF]/ |
| fr | 악센트 문자 | /[àâä...]/ |
| de | 움라우트 | /[äöü]/ |
| es | 악센트 | /[áéí...]/ |

**예제**:
```typescript
detectLanguage("안녕", ["ko", "en"]);        // "ko"
detectLanguage("Hello", ["en", "ko"]);       // "en"
detectLanguage("你好", ["jp", "cn", "ko"]); // "cn"
detectLanguage("مرحبا", ["ar", "en"]);      // "ar"
detectLanguage("Bonjour", ["fr", "de", "es"]); // "fr"
```

---

## 5. PII 필터 API

### 5.1 민감정보 마스킹

**함수**: `maskPII(text)`

```typescript
const masked = maskPII("이메일: user@example.com, 전화: 010-1234-5678");
// Returns: "이메일: u***@example.com, 전화: 010-****-5678"
```

**마스킹 규칙**:

| 유형 | 패턴 | 마스킹 방식 | 예 |
|------|------|-----------|-----|
| **이메일** | user@domain.com | u***@domain.com | user@example.com → u***@example.com |
| **전화번호** | 010-1234-5678 | 010-****-5678 | 010-1234-5678 → 010-****-5678 |
| **한국 주민번호** | 123456-1234567 | ******-******* | 123456-1234567 → ******-******* |

**지원 전화 형식**:
- `+82-10-1234-5678`
- `(010) 1234-5678`
- `010.1234.5678`
- `01012345678`

**반환값**: `string` - 마스킹된 텍스트

**예제**:
```typescript
maskPII("연락처: 02-1234-5678, 주민번호: 900101-1234567");
// "연락처: 02-****-5678, 주민번호: ******-*******"

maskPII("Email: john.doe@company.com");
// "Email: j***@company.com"
```

---

## 6. 테스트 시나리오

### 6.1 API 테스트 명령어

**환경 변수 설정**:
```bash
export GEMINI_API_KEY="your_api_key_here"
```

**기본 연결 테스트**:
```bash
# Gemini Live API 연결 확인
curl -i -N \
  -H "Content-Type: application/json" \
  "wss://generativelanguage.googleapis.com/google.ai.generativelanguage.v1alpha.GenerativeService/BidiGenerateContent?key=$GEMINI_API_KEY"
```

**번역 함수 테스트**:
```typescript
// src/test-api.ts
import { translateText } from './services/geminiService';

(async () => {
  try {
    const result = await translateText("안녕하세요", "ko", "en");
    console.log("Translation:", result);
  } catch (error) {
    console.error("Error:", error);
  }
})();
```

**요약 함수 테스트**:
```typescript
import { summarizeConversation } from './services/geminiService';

(async () => {
  const script = `
    사용자: 안녕하세요, 오늘 날씨는 어떻습니까?
    상대방: 맑고 따뜻합니다. 외출하기 좋은 날씨네요.
    사용자: 감사합니다.
  `;
  
  const summary = await summarizeConversation(script);
  console.log("Summary:", summary);
})();
```

**언어 감지 테스트**:
```typescript
import { detectLanguage } from './lib/languageDetect';

console.log(detectLanguage("こんにちは", ["ko", "jp", "en"]));    // "jp"
console.log(detectLanguage("안녕하세요", ["en", "ko"]));          // "ko"
console.log(detectLanguage("你好", ["cn", "jp"]));              // "cn"
```

**PII 필터 테스트**:
```typescript
import { maskPII } from './lib/piiFilter';

console.log(maskPII("이메일: test@example.com"));
// "이메일: t***@example.com"
```

### 6.2 성능 테스트

**API 응답 시간 측정**:
```typescript
console.time("translate");
await translateText("안녕하세요", "ko", "en");
console.timeEnd("translate");
// Expected: < 2000ms
```

**동시 요청 테스트** (최대 3개):
```typescript
const promises = [
  translateText("A", "ko", "en"),
  translateText("B", "ko", "en"),
  translateText("C", "ko", "en"),
];
const results = await Promise.all(promises);
console.log("Concurrent results:", results);
```

---

## 7. 환경 변수

```env
# .env.local
GEMINI_API_KEY=your_api_key_from_aistudio_google_com

# 선택 사항
VITE_API_TIMEOUT=30000        # API 타임아웃 (밀리초)
VITE_MAX_RETRY_ATTEMPTS=3     # 최대 재시도 횟수
VITE_RETRY_DELAY=1000         # 초기 재시도 지연 (밀리초)
```
