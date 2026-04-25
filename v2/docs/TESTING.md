# OneVoice v2 - 테스트 전략 및 실행 가이드 (Testing Strategy & Execution Guide)

---

## 1. 테스트 구조

### 1.1 테스트 종류별 분류

| 종류 | 대상 | 도구 | 커버리지 목표 |
|------|------|------|-------------|
| **유닛 테스트** | 함수, 서비스, 유틸리티 | Vitest + TypeScript | >80% |
| **통합 테스트** | 페이지 + 서비스 + API | Vitest + mocking | >70% |
| **E2E 테스트** | 사용자 플로우 (GUI) | Playwright | >60% |
| **성능 테스트** | 오디오 처리, 렌더링 | Lighthouse, Chrome DevTools | <5s 지연 |
| **수동 테스트** | 실제 사용자 시나리오 | 체크리스트 | 중요 기능 100% |

### 1.2 테스트 피라미드

```
         E2E (5%)
        ╱─────╲
       ╱   통합  ╲ (25%)
      ╱────────╲
     ╱   유닛    ╲ (70%)
    ╱────────────╲
```

---

## 2. 유닛 테스트 (Unit Tests)

### 2.1 테스트 파일 목록 및 커버리지

**목표**: >80% 코드 커버리지

| 파일 | 테스트 케이스 | 목표 |
|------|--------------|------|
| `src/lib/languageDetect.ts` | detectLanguage() - 7개 언어 + 혼합 | 100% |
| `src/lib/piiFilter.ts` | maskPII() - 이메일, 전화, SSN | 100% |
| `src/lib/audioUtils.ts` | AudioRecorder, AudioPlayer 클래스 | 95% |
| `src/services/geminiService.ts` | translateText, summarizeConversation, chatWithGuide | 85% |
| `src/services/historyService.ts` | CRUD (get, save, delete) + 저장소 할당량 | 90% |

### 2.2 주요 유닛 테스트 시나리오

#### 2.2.1 언어 감지 (languageDetect.ts)

```typescript
describe('detectLanguage', () => {
  it('한국어 텍스트를 감지해야 함', () => {
    const result = detectLanguage('안녕하세요', ['ko', 'en']);
    expect(result).toBe('ko');
  });

  it('영문 텍스트를 감지해야 함', () => {
    const result = detectLanguage('Hello', ['ko', 'en']);
    expect(result).toBe('en');
  });

  it('일본어 히라가나를 감지해야 함', () => {
    const result = detectLanguage('こんにちは', ['jp', 'ko']);
    expect(result).toBe('jp');
  });

  it('혼합 언어에서 우선순위가 높은 언어 선택', () => {
    const result = detectLanguage('Hello 안녕하세요', ['ko', 'en']);
    expect(result).toBe('ko'); // 'ko' 우선순위 > 'en'
  });

  it('후보 언어에 없으면 첫 번째 후보 반환', () => {
    const result = detectLanguage('안녕', ['en', 'jp']);
    expect(result).toBe('en');
  });
});
```

#### 2.2.2 PII 필터링 (piiFilter.ts)

```typescript
describe('maskPII', () => {
  it('이메일을 마스킹해야 함', () => {
    const result = maskPII('user@example.com에 연락하세요');
    expect(result).toContain('u***@example.com');
  });

  it('전화번호를 마스킹해야 함', () => {
    const result = maskPII('010-1234-5678로 전화하세요');
    expect(result).toContain('***-****-5678');
  });

  it('한국 주민등록번호를 마스킹해야 함', () => {
    const result = maskPII('주민번호 123456-1234567');
    expect(result).toContain('123456-*******');
  });

  it('여러 PII가 포함되면 모두 마스킹', () => {
    const input = '사람: user@gmail.com, 번호: 02-123-4567';
    const result = maskPII(input);
    expect(result).not.toContain('user@gmail.com');
    expect(result).not.toContain('123-4567');
  });

  it('PII 없으면 원문 반환', () => {
    const input = '일반 텍스트입니다';
    const result = maskPII(input);
    expect(result).toBe(input);
  });
});
```

#### 2.2.3 히스토리 서비스 (historyService.ts)

```typescript
describe('historyService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('새 세션을 저장하고 조회할 수 있음', () => {
    const item = {
      id: 'test-1',
      title: 'Test Session',
      langs: 'ko-en',
      date: new Date().toISOString(),
      duration: '5분',
      participants: 'You & Visitor',
      type: 'translate',
      summary: '테스트 요약',
      script: []
    };
    saveHistoryItem(item);
    const retrieved = getHistoryItem('test-1');
    expect(retrieved?.title).toBe('Test Session');
  });

  it('모든 세션을 시간 역순으로 조회', () => {
    const now = new Date();
    const items = [
      { ...mockItem, id: '1', date: new Date(now.getTime() - 2000).toISOString() },
      { ...mockItem, id: '2', date: new Date(now.getTime() - 1000).toISOString() }
    ];
    items.forEach(saveHistoryItem);
    const all = getHistory();
    expect(all[0].id).toBe('2'); // 최신순
  });

  it('세션 삭제 후 조회 불가', () => {
    saveHistoryItem(mockItem);
    deleteHistoryItem('test-1');
    expect(getHistoryItem('test-1')).toBeNull();
  });

  it('localStorage 할당량 초과 경고', () => {
    const largeScript = Array(5000).fill({ text: 'x'.repeat(1000) });
    const item = { ...mockItem, script: largeScript };
    expect(() => saveHistoryItem(item)).toThrow('Storage quota');
  });
});
```

### 2.3 실행 명령어

```bash
# 모든 유닛 테스트 실행
npm test

# 커버리지 리포트 생성
npm test -- --coverage

# 특정 파일만 테스트
npm test -- languageDetect.ts

# 감시 모드 (파일 변경 시 자동 재실행)
npm test -- --watch
```

---

## 3. 통합 테스트 (Integration Tests)

### 3.1 시나리오별 테스트

#### 3.1.1 실시간 번역 플로우

```typescript
describe('TranslatePage Integration', () => {
  it('마이크 녹음 → Gemini API 호출 → 번역 표시', async () => {
    const { getByRole, getByText } = render(<TranslatePage />);
    const micButton = getByRole('button', { name: /마이크/i });
    
    // 녹음 시작
    fireEvent.click(micButton);
    expect(getByText(/녹음 중/i)).toBeInTheDocument();
    
    // 녹음 중단 (모킹된 Gemini API 응답 시뮬레이션)
    fireEvent.click(micButton);
    await waitFor(() => {
      expect(getByText(/こんにちは/i)).toBeInTheDocument(); // 번역문
    });
  });

  it('언어 변경 후 다시 녹음하면 새 언어로 번역', async () => {
    const { getByRole, getByDisplayValue } = render(<TranslatePage />);
    
    // 하단 언어를 영어로 변경
    fireEvent.change(getByDisplayValue(/한국어/i), { target: { value: 'en' } });
    
    // 녹음 → 번역 (영어 → 일본어)
    const micButton = getByRole('button', { name: /마이크/i });
    fireEvent.click(micButton);
    fireEvent.click(micButton);
    
    await waitFor(() => {
      expect(getByText(/こんにちは/i)).toBeInTheDocument();
    });
  });
});
```

#### 3.1.2 세션 저장 및 복원

```typescript
describe('Session Save & Restore', () => {
  it('세션을 저장하고 히스토리에서 조회 가능', async () => {
    // 1. TranslatePage에서 대화 진행
    const { getByRole, getByText } = render(<TranslatePage />);
    // ... 녹음 및 번역 진행 ...

    // 2. 저장 버튼 클릭
    fireEvent.click(getByRole('button', { name: /저장/i }));
    
    // 3. 제목 입력 및 확인
    const titleInput = screen.getByPlaceholderText(/제목/i);
    fireEvent.change(titleInput, { target: { value: '비즈니스 미팅' } });
    fireEvent.click(getByRole('button', { name: /확인/i }));

    // 4. HistoryPage에서 해당 세션 확인
    const { rerender } = render(<HistoryPage />);
    await waitFor(() => {
      expect(getByText('비즈니스 미팅')).toBeInTheDocument();
    });
  });
});
```

#### 3.1.3 Knowledge Guide 챗봇

```typescript
describe('GuidePage Chatbot', () => {
  it('문화 예절 질문에 응답', async () => {
    const { getByRole, getByText, getByPlaceholderText } = render(<GuidePage />);
    
    const input = getByPlaceholderText(/질문/i);
    fireEvent.change(input, { target: { value: '일본 문화 인사법' } });
    fireEvent.click(getByRole('button', { name: /전송/i }));
    
    await waitFor(() => {
      expect(getByText(/お辞儀|깊이 인사|respectful|bow/i)).toBeInTheDocument();
    });
  });

  it('QuickPrompt 버튼으로 빠른 질문', async () => {
    const { getByRole } = render(<GuidePage />);
    
    // QuickPrompt 버튼 클릭
    fireEvent.click(getByRole('button', { name: /일본 문화/i }));
    
    await waitFor(() => {
      expect(screen.queryByText(/로딩/i)).not.toBeInTheDocument();
    });
  });
});
```

### 3.2 실행 명령어

```bash
# 통합 테스트만 실행
npm test -- --grep "Integration"

# 커버리지 포함 통합 테스트
npm test -- integration --coverage
```

---

## 4. E2E 테스트 (End-to-End with Playwright)

### 4.1 주요 E2E 시나리오

#### 4.1.1 실시간 번역 플로우 (사용자 관점)

```bash
# tests/e2e/translate.spec.ts

import { test, expect } from '@playwright/test';

test('사용자는 실시간 동시통역을 할 수 있다', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  
  // 1. 페이지 로드 확인
  await expect(page.locator('text=마이크 버튼')).toBeVisible();
  
  // 2. 언어 선택 (하단: 한국어, 상단: 영어)
  await page.selectOption('select[data-testid="bottom-lang"]', 'ko');
  await page.selectOption('select[data-testid="top-lang"]', 'en');
  
  // 3. 마이크 버튼 클릭 → 녹음 시작
  await page.click('button[aria-label="마이크 녹음 시작"]');
  await expect(page.locator('text=녹음 중')).toBeVisible();
  
  // 4. 녹음 중단
  await page.click('button[aria-label="마이크 녹음 시작"]');
  
  // 5. 번역 결과 확인 (최대 5초 대기)
  await expect(page.locator('[data-testid="top-text"]')).toContainText(/hello|hi/, { timeout: 5000 });
});
```

#### 4.1.2 세션 저장 및 조회

```bash
test('사용자는 대화를 저장하고 나중에 조회할 수 있다', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  
  // 1. 실시간 번역 진행 (생략)
  // ...
  
  // 2. 저장 버튼 클릭
  await page.click('button:has-text("저장")');
  
  // 3. 세션 제목 입력
  await page.fill('input[placeholder="제목"]', '비즈니스 미팅 2024-04-25');
  await page.click('button:has-text("확인")');
  
  // 4. 히스토리 페이지 이동
  await page.goto('http://localhost:3000/history');
  await expect(page.locator('text=비즈니스 미팅 2024-04-25')).toBeVisible();
  
  // 5. 세션 클릭하여 상세 조회
  await page.click('text=비즈니스 미팅 2024-04-25');
  await expect(page.locator('[data-testid="session-title"]')).toContainText('비즈니스 미팅');
  
  // 6. 전체 대화 전사 확인
  await expect(page.locator('[data-testid="transcript"]')).toBeVisible();
});
```

#### 4.1.3 Knowledge Guide 챗봇

```bash
test('사용자는 Knowledge Guide에서 질문할 수 있다', async ({ page }) => {
  await page.goto('http://localhost:3000/guide');
  
  // 1. QuickPrompt 버튼 클릭
  await page.click('button:has-text("일본 문화 인사법")');
  
  // 2. 응답 대기 (최대 3초)
  await expect(page.locator('[data-testid="response"]')).toContainText(/お辞儀|respectful/i, { timeout: 3000 });
  
  // 3. 추가 질문 입력
  await page.fill('input[placeholder="질문"]', '출장에서 쓸 수 있는 표현');
  await page.click('button:has-text("전송")');
  
  // 4. 응답 확인
  await expect(page.locator('[data-testid="response"]')).toBeVisible({ timeout: 3000 });
});
```

### 4.2 E2E 실행 명령어

```bash
# 모든 E2E 테스트 실행
npm run test:e2e

# 특정 브라우저에서만 실행
npm run test:e2e -- --project=chromium

# 디버그 모드로 실행 (화면 표시)
npm run test:e2e -- --debug

# E2E 결과 리포트 보기
npm run test:e2e:report
```

---

## 5. 성능 테스트 (Performance Testing)

### 5.1 성능 메트릭 목표

| 메트릭 | 목표 | 측정 방법 |
|--------|------|---------|
| **통역 지연시간** | < 5초 | 발화 시작 → 번역 표시 시간 |
| **오디오 재생 지연** | < 500ms | 응답 수신 → 스피커 출력 |
| **UI 렌더링** | < 16ms (60fps) | Lighthouse DevTools |
| **로드 시간** | < 3초 | Lighthouse PageSpeed |
| **메모리 사용** | < 150MB | Chrome DevTools Memory |

### 5.2 Lighthouse 성능 감사

```bash
# 프로덕션 빌드 후 성능 측정
npm run build
npm run preview

# 별도 터미널에서 Lighthouse 실행
npx lighthouse http://localhost:5173 --view
```

### 5.3 오디오 처리 성능 테스트

```typescript
describe('Audio Processing Performance', () => {
  it('1초 PCM 청크 처리 시간 < 100ms', async () => {
    const audioRecorder = new AudioRecorder();
    const pcmData = new Float32Array(16000); // 1초, 16kHz
    
    const start = performance.now();
    const processed = audioRecorder.processPCM(pcmData);
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(100);
  });

  it('오디오 재생 시작 지연 < 200ms', async () => {
    const player = new AudioPlayer();
    const mockBase64 = 'data:audio/wav;base64,...'; // 모킹된 오디오
    
    const start = performance.now();
    await player.playAudio(mockBase64, 'user');
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(200);
  });
});
```

---

## 6. 수동 테스트 체크리스트 (Manual Testing Checklist)

### 6.1 실시간 번역 (TranslatePage)

- [ ] 마이크 버튼 클릭 시 녹음 시작 (UI 변경 확인)
- [ ] 마이크 버튼 다시 클릭 시 녹음 중단
- [ ] 2~5초 내에 번역 결과 표시
- [ ] 상단 패널이 180° 회전되어 표시됨
- [ ] 하단 원문, 상단 번역문 정확함
- [ ] 언어 변경 후 재녹음 시 새 언어로 번역
- [ ] 녹음 중 언어 선택 불가 (disabled 상태)
- [ ] 마이크 접근 권한 없을 때 에러 메시지 표시
- [ ] WebSocket 끊김 시 자동 재연결 (최대 3회)
- [ ] 재연결 실패 시 수동 재시도 버튼 표시

### 6.2 이어폰 모드 (Earphone Mode)

- [ ] 토글 스위치 ON/OFF 작동
- [ ] 활성화 상태에서 사용자 음성 좌측 채널 출력
- [ ] 활성화 상태에서 상대방 음성 우측 채널 출력
- [ ] 비활성화 상태에서 양쪽 채널 혼합 출력
- [ ] 이어폰 착용 시 정위감(stereo separation) 확인

### 6.3 세션 저장 (Session Save)

- [ ] "저장" 버튼 클릭 → 모달 팝업
- [ ] 제목 입력 가능
- [ ] "확인" 버튼 클릭 → localStorage에 저장
- [ ] 저장 완료 메시지 표시
- [ ] 저장 후 페이지 새로고침해도 데이터 유지
- [ ] 저장소 할당량 초과 시 경고 메시지

### 6.4 히스토리 조회 (HistoryPage)

- [ ] 모든 저장된 세션 목록 표시
- [ ] 최신순 정렬 확인
- [ ] 검색 입력 시 실시간 필터링
- [ ] 언어 필터링 (예: "ko-en" 검색)
- [ ] 요약 내용 검색
- [ ] 세션 카드 클릭 → 상세 페이지 이동
- [ ] 삭제 버튼 클릭 → 확인 대화 표시
- [ ] 삭제 확인 후 목록에서 제거

### 6.5 히스토리 상세 조회 (HistoryDetailPage)

- [ ] 세션 메타데이터 표시 (제목, 언어, 날짜, 지속시간)
- [ ] 전체 대화 전사 표시 (원문 + 번역)
- [ ] 화자별 라벨 ("You", "Visitor") 구분
- [ ] 요약 섹션 표시

### 6.6 Knowledge Guide (GuidePage)

- [ ] 텍스트 입력 및 전송 가능
- [ ] AI 응답 실시간 스트리밍 표시
- [ ] QuickPrompt 버튼 클릭 → 질문 자동 입력
- [ ] 다중 턴 대화 히스토리 유지
- [ ] 응답이 마크다운 형식으로 스타일링됨

### 6.7 다국어 UI

- [ ] 한국어 UI 확인
- [ ] 영어 UI 전환 가능
- [ ] 일본어 UI 전환 가능
- [ ] 언어 변경 후 모든 텍스트 업데이트
- [ ] 언어 선택 드롭다운에 7개 언어 모두 표시

### 6.8 접근성 (Accessibility)

- [ ] Tab 키로 모든 버튼 포커스 가능
- [ ] Enter/Space 키로 버튼 활성화 가능
- [ ] 스크린 리더로 버튼 레이블 읽음 (aria-label)
- [ ] 색상 대비 충분함 (밝기 4.5:1 이상)
- [ ] 포커스 표시 선명함

### 6.9 에러 처리

- [ ] 마이크 권한 없음 → 에러 메시지
- [ ] 인터넷 끊김 → 자동 재연결 시도
- [ ] API 키 미설정 → 명확한 안내 메시지
- [ ] 저장소 할당량 초과 → 경고 + 정리 안내
- [ ] Gemini API 타임아웃 → 재시도 안내

### 6.10 브라우저 호환성

- [ ] Chrome (최신 2개 버전) 작동 확인
- [ ] Safari (최신 2개 버전) 작동 확인
- [ ] Firefox (최신 2개 버전) 작동 확인
- [ ] 모바일 Safari (iOS 15+) 작동 확인
- [ ] Chrome Mobile (Android 12+) 작동 확인

---

## 7. CI/CD 자동 테스트

### 7.1 GitHub Actions 워크플로우

파일: `.github/workflows/test.yml`

```yaml
name: Test & Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run unit tests
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
    
    - name: Build project
      run: npm run build
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload E2E report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: playwright-report/
```

### 7.2 테스트 실행 전제 조건

- 모든 유닛 테스트 통과 (coverage >80%)
- 모든 E2E 테스트 통과
- ESLint 통과 (오류 없음)
- TypeScript 컴파일 성공
- 프로덕션 빌드 성공

---

## 8. 테스트 실행 명령어 정리

```bash
# 전체 테스트 실행 (권장)
npm run test:all

# 개별 실행
npm test                    # 유닛 테스트
npm test -- --coverage     # 커버리지 포함
npm run test:e2e           # E2E 테스트
npm run lint               # ESLint 검사
npm run build              # 프로덕션 빌드 검증

# 감시 모드 (개발 중)
npm test -- --watch
npm run test:e2e -- --headed

# 디버그 모드
npm test -- --inspect-brk
npm run test:e2e -- --debug
```

---

## 9. 테스트 작성 가이드라인

### 9.1 테스트 이름 컨벤션

```typescript
// ✅ Good
it('한국어 텍스트를 감지해야 함', () => { ... });
it('이메일을 u***@example.com 형태로 마스킹해야 함', () => { ... });

// ❌ Bad
it('test language detection', () => { ... });
it('masks emails', () => { ... });
```

### 9.2 AAA 패턴 (Arrange-Act-Assert)

```typescript
it('세션을 저장하고 조회할 수 있음', () => {
  // Arrange: 테스트 데이터 준비
  const item = createMockHistoryItem();
  
  // Act: 함수 실행
  saveHistoryItem(item);
  
  // Assert: 결과 검증
  expect(getHistoryItem(item.id)).toEqual(item);
});
```

### 9.3 모킹 가이드

```typescript
// Gemini API 모킹
vi.mock('src/services/geminiService', () => ({
  translateText: vi.fn(() => Promise.resolve('こんにちは')),
  summarizeConversation: vi.fn(() => Promise.resolve(['요약1', '요약2', '요약3']))
}));

// 오디오 API 모킹
vi.mock('src/lib/audioUtils', () => ({
  AudioRecorder: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() }))
}));
```

---

## 10. 테스트 커버리지 보고서

```bash
# 커버리지 리포트 생성
npm test -- --coverage

# 출력 예시:
# ├─ Statements   : 85.3%
# ├─ Branches     : 82.1%
# ├─ Functions    : 87.5%
# └─ Lines        : 86.2%
```

목표: **>80% 전체 커버리지**, 핵심 경로 **>90%**

