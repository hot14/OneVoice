# OneVoice v2 - 기능 명세 (Feature Specification)

---

## 1. TranslatePage (`/`)

### 1.1 실시간 동시통역 모드

**기능**: Gemini Live API WebSocket을 통한 실시간 양방향 동시통역

**작동 흐름**:
1. 마이크 버튼 클릭 → 녹음 시작
2. 사용자 발화 → 16kHz PCM으로 변환 → WebSocket으로 Gemini Live에 전송
3. Gemini Live 응답 수신 → 원문 + 번역문 파싱
4. 번역문에 대한 오디오 응답 생성 → StereoPanner로 정위 설정 → 스피커 재생
5. 마이크 버튼 다시 클릭 → 녹음 중지 → 세션 종료

**성능 지표**:
- **지연시간**: 2~5초 (발화 시작 → 번역 완료)
- **동시 스트림**: 입력 1개 (마이크) + 출력 1개 (스피커)
- **샘플레이트**: 입력 16kHz, 출력 24kHz

**상태 전환**:
```
초기 상태 (isRecording=false)
  ↓
마이크 버튼 클릭
  ↓
연결 중 (isConnecting=true)
  ↓
녹음 중 (isRecording=true)
  ↓
마이크 버튼 클릭 또는 타임아웃
  ↓
종료 (isRecording=false, 세션 저장 모달)
```

### 1.2 언어 선택

**기능**: 상단/하단 독립적 언어 설정

**지원 언어** (7개):
| 코드 | 이름 | 유니코드 범위 |
|------|------|-------------|
| ko | 한국어 | U+AC00~D7A3 |
| en | English | U+0000~007F |
| jp | 日本語 | U+3040~309F, U+4E00~9FFF |
| cn | 简体中文 | U+4E00~9FFF |
| fr | Français | U+0000~017F, U+0100~017F |
| de | Deutsch | U+0000~017F, U+0100~017F |
| es | Español | U+0000~017F, U+0100~017F |

**상단 (topLang)**:
- 상대방의 언어 (보통 대화 상대가 사용하는 언어)
- UI는 180° 회전 (상대방 시점)

**하단 (bottomLang)**:
- 사용자의 언어 (자신이 사용하는 언어)
- UI는 정상 방향

**드롭다운**:
- 클릭 시 언어 목록 표시
- 선택 시 즉시 상태 업데이트
- 녹음 중 변경 불가 (disable)

### 1.3 이어폰 모드 (Earphone Mode)

**기능**: 스테레오 스피커로 L/R 채널을 분리하여 어느 쪽이 누구의 음성인지 구분

**동작**:
- **활성화**: 토글 스위치 클릭
- **사용자 발화**: StereoPanner.pan = -1.0 (좌측 채널)
- **상대방 발화**: StereoPanner.pan = +1.0 (우측 채널)

**시나리오**:
- 워이어리스 이어폰 착용 → 좌측에서 자신의 음성, 우측에서 상대방 음성 수신
- 쾌적한 청취 경험 (어느 쪽이 말하는지 명확)

**구현** (`src/lib/audioUtils.ts`):
```typescript
class AudioPlayer {
  setPan(value: number): void {
    this.panner.pan.value = value; // -1.0 ~ +1.0
  }
  
  async playAudio(base64Audio: string, speaker: 'user' | 'other'): Promise<void> {
    const panValue = speaker === 'user' ? -1.0 : +1.0;
    this.setPan(panValue);
    // 재생...
  }
}
```

### 1.4 화자 자동 감지

**기능**: 발화 텍스트의 유니코드 범위를 분석하여 자동으로 언어 감지

**알고리즘**:
```typescript
const isLanguageKorean = (t: string) => /[가-힣]/.test(t);

const guessLanguage = (text: string, lang1: string, lang2: string): string => {
  const isL1Ko = lang1 === "ko";
  const containsKo = isLanguageKorean(text);
  
  if (isL1Ko) {
    return containsKo ? lang1 : lang2; // lang1이 한국어면 한국어 감지 시 lang1 반환
  }
  return containsKo ? "ko" : (lang1 === "ko" ? lang1 : lang2);
};
```

**정확도**: ~85% (하이브리드 언어 사용 시 낮을 수 있음)

**사용 시점**:
- Gemini Live로부터 텍스트 수신 후
- 원문의 언어를 자동 감지
- ScriptLine의 speaker ('user' 또는 'other')를 결정

### 1.5 세션 저장

**기능**: 현재 대화를 localStorage에 저장

**저장 시점**:
- 마이크 버튼 클릭하여 녹음 중지 후 "저장" 버튼 클릭
- 세션 모달 팝업 표시 (제목 입력)
- 확인 버튼 클릭 → HistoryItem 생성 → localStorage에 저장

**저장 데이터** (HistoryItem):
```typescript
{
  id: "abc123def456",                    // UUID
  title: "한국-일본 비즈니스 미팅",      // 사용자 입력
  langs: "ko-jp",                        // 상단-하단 언어
  date: "2024-04-25T10:30:00Z",         // ISO 8601
  duration: "5분 32초",                  // 계산된 지속시간
  participants: "You & Visitor",        // 고정값
  type: "translate",                     // 세션 유형
  summary: "AI 생성 요약...",            // summarizeConversation()
  script: [                              // 전체 대화
    {
      id: "line1", speaker: "user", originalText: "안녕하세요",
      translatedText: "こんにちは", speakerLabel: "You", isUser: true
    },
    // ...
  ]
}
```

### 1.6 이중 패널 UI

**기능**: 상단과 하단으로 나뉜 화면에서 상단은 180° 회전

**레이아웃**:
```
┌─────────────────────────────────────┐
│  [180° 회전] 상대방 언어             │ ← topLang (거꾸로)
│  번역문: "こんにちは"               │ ← topText (거꾸로)
├─────────────────────────────────────┤
│  [마이크 버튼] [언어 선택]           │
├─────────────────────────────────────┤
│  사용자 언어 (정상)                  │ ← bottomLang (정상)
│  원문: "안녕하세요"                  │ ← bottomText (정상)
└─────────────────────────────────────┘
```

**CSS 적용** (Tailwind):
```tsx
<div className="transform rotate-180"> {/* 상단 패널 */}
  <div className="text-center text-lg font-semibold">{topText}</div>
</div>
```

**목적**: 마주 보고 앉았을 때 각자가 자신의 언어를 읽을 수 있게

### 1.7 자동 재연결

**기능**: WebSocket 연결 끊김 시 자동으로 재연결 시도

**정책**:
- **최대 시도**: 3회
- **백오프**: 지수 백오프 (1초, 2초, 4초)
- **실패 처리**: 에러 모달 표시 및 수동 재시도 안내

**구현**:
```typescript
async function connectWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const session = ai.live.connect({ /* config */ });
      return session;
    } catch (error) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  setError("연결 실패. 다시 시도해주세요.");
}
```

---

## 2. GuidePage (`/guide`)

### 2.1 Knowledge Guide AI 챗봇

**기능**: 문화 예절, 언어 팁, 상황별 표현을 제공하는 멀티턴 챗봇

**시스템 프롬프트**:
```
You are a Knowledge Guide for cultural etiquette and language assistance.
Answer concisely and politely in the user's language.
Provide practical advice for international communication.
```

**대화 흐름**:
1. 사용자 입력 (텍스트 또는 음성)
2. 메시지 히스토리에 추가
3. `chatWithGuide()` 호출 (히스토리 + 현재 메시지)
4. Gemini 응답 수신
5. 응답을 메시지 히스토리에 추가
6. 화면에 표시

**QuickPrompt 버튼**:
```tsx
const quickPrompts = [
  "일본 문화 인사법을 알려주세요",
  "출장에서 쓸 수 있는 영어 표현",
  "중국 비즈니스 에티켓",
  "레스토랑에서 주문하기"
];

<button onClick={() => setPrompt("일본 문화 인사법을 알려주세요")}>
  일본 문화 인사법을 알려주세요
</button>
```

### 2.2 다중 턴 대화 히스토리

**구조**:
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

const [messages, setMessages] = useState<ChatMessage[]>([]);
```

**Gemini API 전달 형식**:
```typescript
const historyPayload = messages.map(m => ({
  role: m.role,
  parts: [{ text: m.content }]
}));

const response = await chatWithGuide(historyPayload, userText);
```

---

## 3. HistoryPage (`/history`)

### 3.1 세션 목록 조회

**기능**: 저장된 모든 세션을 시간 역순으로 표시

**데이터 출처**: `getHistory()` (localStorage)

**표시 정보**:
- 제목 (title)
- 언어 쌍 (langs: "ko-en")
- 날짜 (date: "2024-04-25 10:30")
- 지속시간 (duration: "5분 32초")
- 참여자 (participants: "You & Visitor")
- 요약 (summary)

**정렬**: 최신순 (newest first)

### 3.2 검색 기능

**검색 필드**: 언어 또는 요약 내용

**구현**:
```typescript
const filteredItems = items.filter(item => 
  item.langs.toLowerCase().includes(searchTerm.toLowerCase()) ||
  item.summary.toLowerCase().includes(searchTerm.toLowerCase())
);
```

**실시간 필터링**: 입력 시 즉시 목록 업데이트

### 3.3 세션 삭제

**트리거**: 세션 카드의 삭제 버튼 클릭

**확인 대화**:
```
"이 기록을 삭제하시겠습니까?"
→ [취소] [삭제]
```

**구현**:
```typescript
const handleDelete = (e: React.MouseEvent, id: string) => {
  e.stopPropagation();
  if (confirm('이 기록을 삭제하시겠습니까?')) {
    deleteHistoryItem(id);
    setItems(getHistory());
  }
};
```

---

## 4. HistoryDetailPage (`/history/:id`)

### 4.1 전체 대화 전사

**기능**: 선택한 세션의 완전한 대화 기록을 원문 + 번역문으로 표시

**레이아웃**:
```
┌────────────────────────────────────────┐
│ [세션 제목]                             │
│ 한국어 ↔ 일본어 | 2024-04-25 10:30    │
├────────────────────────────────────────┤
│ [You (한국어)]                          │
│ 원문: "안녕하세요"                      │
│ 번역: "こんにちは"                      │
├────────────────────────────────────────┤
│ [Visitor (일본어)]                      │
│ 원문: "どうぞよろしくお願いします"      │
│ 번역: "반갑습니다"                      │
├────────────────────────────────────────┤
│ ...
```

### 4.2 세션 메타데이터

**표시**:
- **제목**: session.title
- **언어**: session.langs (예: "ko-jp")
- **날짜**: session.date (ISO 8601)
- **지속시간**: session.duration
- **참여자**: session.participants
- **요약**: session.summary

### 4.3 요약

**요약 생성 시점**: 세션 저장 시

**알고리즘** (`summarizeConversation()`):
- Gemini API로 대화 텍스트 전송
- "3개의 핵심 요점을 한국어로 정리"
- 마크다운 포맷 제거 후 반환

---

## 5. 오류 처리

### 5.1 마이크 접근 거부

**에러 메시지**:
```
"마이크 접근이 거부되었습니다.
브라우저 설정에서 마이크 권한을 허용해주세요."
```

**복구**:
- 브라우저 권한 설정 변경
- 재시도 버튼 클릭

### 5.2 WebSocket 연결 실패

**에러 메시지**:
```
"Gemini Live API 연결에 실패했습니다.
네트워크를 확인하고 다시 시도해주세요."
```

**자동 재시도**: 지수 백오프 (최대 3회)

### 5.3 API 키 미설정

**에러 메시지**:
```
"Gemini API 키가 설정되지 않았습니다.
.env.local 파일을 확인하세요."
```

### 5.4 Storage 할당량 초과

**경고**:
```
"히스토리 저장소가 거의 가득 찼습니다.
오래된 세션을 삭제해주세요."
```

---

## 6. 음성 기능 (Future)

### 6.1 음성 입력 (음성 인식)

**기능** (미구현):
- 마이크로 음성 입력
- 텍스트 자동 변환
- Knowledge Guide에서 음성 질문

### 6.2 음성 출력

**기능** (구현 중):
- Gemini Live의 오디오 응답 재생
- 이어폰 모드에서 L/R 분리

---

## 7. 접근성 (A11y)

### ARIA 레이블
```tsx
<button
  aria-label="마이크 녹음 시작"
  onClick={startRecording}
>
  <Mic />
</button>
```

### 키보드 네비게이션
- Tab으로 포커스 이동
- Enter/Space로 버튼 활성화

### 색상 대비
- WCAG AA 표준 (4.5:1)

---

## 8. 다국어 UI

**지원 언어**: 한국어, 영어, 일본어 (i18next)

**예**:
```typescript
const { t } = useTranslation();
<h1>{t('pages.translate.title')}</h1> // "실시간 동시통역"
```
