# AI 프로젝트 개발 요구사항 표준 문서

## 프로젝트 개요
- **프로젝트명**: OneVoice (동시통역 + AI 튜터 앱)
- **플랫폼**: Web (브라우저 기반, 모바일 최적화)
- **핵심기능**: 실시간 음성 동시통역, AI 튜터, RAG 기반 자료 검색
- **목표**: Gemini Live API 수준의 통역 품질 + 최소한의 API 비용

---

## 1. 레포지토리 및 개발환경

### 1.1 요구사항
- 깃허브 레포지토리를 로컬에 클론 또는 동기화
- AI 스튜디오 ↔ 깃허브 간 코드 동기화 워크플로우 구축

### 1.2 실행 명령어
```bash
# 클론 (신규)
git clone https://github.com/hot14/OneVoice.git
cd OneVoice

# 동기화 (기존)
git fetch origin main
git pull origin main --no-rebase --allow-unrelated-histories

# 원격 리모트 설정
git remote add origin https://github.com/hot14/OneVoice.git
```

### 1.3 환경 변수 (.env)
- `.env` 파일 생성 (로컬만 사용, 깃허브 푸시 금지)
- `.gitignore`에 `.env*` 포함 확인
- 템플릿:
```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
APP_URL="YOUR_APP_URL_HERE"
```

---

## 2. 비용 최적화 요구사항

### 2.1 목표
- Gemini Live API 유지 (동시통역 품질 보장)
- API 호출 최소화 + 무료/온디바이스 옵션 우선 사용
- 월 1,000분 통역 기준 비용: $23 이하 목표

### 2.2 적용 원칙

| 우선순위 | 방식 | 설명 |
|----------|------|------|
| 1 | **무료 온디바이스** | EmbeddingGemma (transformers.js) |
| 2 | **저렴한 API** | gpt-4o-mini (OpenAI), text-embedding-3-small |
| 3 | **Gemini Live** | 실시간 통역 전용 (불가피) |

### 2.3 비용 최적화 적용 대상

#### RAG Embedding (벡터화)
- **적용**: `src/lib/ragUtils.ts`
- **방식**: EmbeddingGemma 온디바이스 (무료) → API 폴백
- **기술**: transformers.js + WebGPU/WASM
- **모델**: `Xenova/embedding-gemma` (308M 파라미터, 200MB RAM)

#### Chat/LLM (텍스트 생성)
- **적용**: `src/lib/ragUtils.ts`
- **방식**: gpt-4o-mini (OpenAI) 기본값
- **비용**: $0.15/1M input (gpt-4o 대비 94% 절감)

#### Live 통역 (실시간 음성)
- **유지**: Gemini 3.1 Flash Live API
- **이유**: 실시간 특성상 서버 필수, 현재 가장 저렴+품질 균형

#### TTS (음성 합성)
- **적용**: `src/lib/audioUtils.ts`
- **방식**: Browser Web Speech API (무료) 우선
- **폴백**: Gemini TTS

---

## 3. 성능 최적화 요구사항

### 3.1 오디오 파이프라인

| 파일 | 최적화 내용 |
|------|------------|
| `src/lib/audioProcessor.js` | AudioWorklet 프로세서 최적화 |
| `src/lib/audioUtils.ts` | 샘플레이트 16kHz 통일 (리샘플링 제거) |

### 3.2 프론트엔드

| 파일 | 최적화 내용 |
|------|------------|
| `vite.config.ts` | vendor-react, vendor-ai, vendor-ui chunk 분할 |
| `src/lib/piiFilter.ts` | 다국적 PII 형식 지원 (한국/일본/중국/미국/유럽) |

### 3.3 중복 호출 방지
- **적용**: `src/components/InterpreterSession.tsx`
- **방식**: 24시간 TTL 캐시로 중복 API 호출 방지

---

## 4. 모바일 최적화 요구사항

### 4.1 목표
- 휴대폰 (안드로이드/iOS)에서 안정적 작동
- WebGPU 가용성 자동 감지 → 폴백 체계 수립

### 4.2 적용 원칙
```
WebGPU 사용 가능? ──Yes──> EmbeddingGemma (무료, 온디바이스)
                        │
                   No ─┘
                        ▼
              OpenAI/Gemini API로 자동 폴백
```

### 4.3 기술 스택
- **임베딩**: transformers.js v4+ (WebGPU/WASM 런타임)
- **모델**: EmbeddingGemma (`Xenova/embedding-gemma`)
- **양자화**: Q8 (200MB RAM)

---

## 5. API 설정 기본값

### 5.1 InterpretationDashboard.tsx
```typescript
chatApiProvider: "openai"          // 유료 API (gpt-4o-mini)
embeddingApiProvider: "embedgemma" // 무료 온디바이스
liveApiProvider: "gemini"          // 실시간 통역 (유일한 선택)
```

### 5.2 ragUtils.ts 백엔드 선택 로직
```typescript
// 1. embedgemma 또는 auto 모드
if (provider === 'embedgemma' || provider === 'auto') {
  const model = await getEmbeddingModel(); // WebGPU 체크
  if (model) return EmbeddingGemma; // 무료
}

// 2. API 폴백
if (provider === 'openai' || provider === 'custom') return OpenAI API;
return Gemini API;
```

---

## 6. 보안 요구사항

### 6.1 필수
- `.env` 파일 깃허브 푸시 금지 (.gitignore 확인)
- API 키 로컬에만 저장
- PII 필터: 이메일, 전화번호, 신분증 등 마스킹

### 6.2 PII 마스킹 형식
```typescript
// 포함해야 할 형식
- 이메일: standard email format
- 한국 전화: 010-XXXX-XXXX
- 일본 전화: 03-XXXX-XXXX
- 미국 전화: (XXX) XXX-XXXX
- 주민등록번호: Korean RRN format
- 여권번호: General passport pattern
- 카드번호: Credit card format
```

---

## 7. 빌드 및 테스트

### 7.1 검증 명령어
```bash
# 타입 체크
npm run lint

# 테스트 실행
npm test

# 프로덕션 빌드
npm run build
```

### 7.2 성공 기준
- `npm run lint`: 통과 (TS 타입 오류 없음)
- `npm test`: 모든 테스트 통과
- `npm run build`: 성공 (1.78s 내외)

---

## 8. 개발 워크플로우

### 8.1 코드 수정 후 커밋/푸시
```bash
# 1. 변경 파일 확인
git status

# 2. 변경 내용 검토
git diff

# 3. 모든 변경 사항 스테이징
git add .

# 4. 커밋
git commit -m "적용한 변경 내용 설명"

# 5. 푸시
git push origin main
```

### 8.2 Git 사용자 설정 (최초 1회)
```bash
git config user.email "your@email.com"
git config user.name "Your Name"
```

---

## 9. 적용 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/lib/ragUtils.ts` | 수정 | EmbeddingGemma 백엔드 추가, API 폴백 |
| `src/lib/audioUtils.ts` | 수정 | 샘플레이트 16kHz 통일 |
| `src/lib/audioProcessor.js` | 수정 | AudioWorklet 최적화 |
| `src/lib/piiFilter.ts` | 수정 | 다국적 PII 지원 |
| `src/components/InterpreterSession.tsx` | 수정 | 중복 호출 캐싱 |
| `src/components/InterpretationDashboard.tsx` | 수정 | API 기본값 embedgemma로 변경 |
| `vite.config.ts` | 수정 | 번들 chunk 분할 |
| `package.json` | 수정 | transformers.js 추가 |
| `.env` | 신규 | 환경 변수 템플릿 |

---

## 10. 비용 목표 요약

### 월 1,000분 통역 기준

| 항목 | 비용 |
|------|------|
| Live 통역 (Gemini 3.1 Flash Live) | $23 |
| Chat 요약 (gpt-4o-mini) | $0.03 |
| RAG Embedding (EmbeddingGemma) | **$0** |
| **총** | **~$23** |

---

## 11. 참고사항

### 11.1 EmbeddingGemma 제한
- 첫 실행 시 모델 다운로드 필요 (~50-100MB)
- 이후 브라우저 캐시 사용
- WebGPU 미지원 기기에서는 API 폴백

### 11.2 Live 통역 불가 사항
- 실시간 특성상 서버 기반 필수
- 현재 기술로 온디바이스 대체 불가
- Gemini 3.1 Flash Live가 가장 저렴한 선택

### 11.3 향후 고려사항
- WebLLM 기반 Chat 온디바이스 (아직 휴대폰에 부적합)
- 모델 자체 개션 시 시장 재확인 필요
