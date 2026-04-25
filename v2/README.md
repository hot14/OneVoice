# OneVoice v2 - AI 실시간 동시통역 서비스

<div align="center">
  <h3>언어 장벽 없는 실시간 대면 소통</h3>
  <p>React 19 + Vite + TypeScript + Gemini Live API</p>
</div>

---

## 개요

**OneVoice v2**는 Google Gemini Live API를 활용한 AI 기반 실시간 동시통역 웹 애플리케이션입니다. 전문 통역사 없이도 두 사람이 마주 앉아 각자의 언어로 대화하며 실시간 번역을 받을 수 있습니다.

- **완전 프론트엔드 기반**: 서버 없음, 클라이언트 사이드에서 모든 처리
- **16kHz PCM 오디오**: 마이크 입력을 실시간으로 Gemini Live API로 스트리밍
- **이중 패널 UI**: 상단 패널 180° 회전으로 상대방 시점 표현
- **세션 저장**: localStorage를 활용한 히스토리 관리
- **Knowledge Guide 챗봇**: 문화 예절 및 언어 도움

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **실시간 동시통역** | Gemini Live WebSocket을 통한 2~5초 지연의 동시통역 |
| **이어폰 모드** | L/R 스테레오 채널 분리 (사용자 -1, 상대방 +1) |
| **화자 자동 감지** | 유니코드 범위 기반 언어 인식 및 자동 분절 |
| **세션 히스토리** | 날짜, 참여자, 내용 저장 및 검색 |
| **Knowledge Guide** | AI 챗봇을 통한 문화/언어 상담 |
| **다국어 지원** | 한국어, English, 日本語, 简体中文, Français, Deutsch, Español |
| **자동 재연결** | 네트워크 끊김 시 지수 백오프로 자동 재시도 |

---

## 빠른 시작 (Quick Start)

### 필수 사항

- **Node.js** 16.x 이상
- **Google Gemini API 키** ([aistudio.google.com](https://aistudio.google.com/app/apikey))

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/gagatrack/OneVoice.git
cd OneVoice/v2

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 GEMINI_API_KEY 입력

# 개발 서버 실행 (포트 3000)
npm run dev

# 프로덕션 빌드
npm run build
npm run preview
```

**결과**: 브라우저에서 `http://localhost:3000` 접속

---

## 환경 변수

`.env.local` 파일에 다음 항목을 설정하세요:

```env
# Gemini API Key (필수)
# Google AI Studio에서 발급: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | React 19, TypeScript 5.8 |
| **번들러** | Vite 6.2 |
| **라우팅** | React Router DOM 7.14 |
| **UI/스타일** | Tailwind CSS 4.1, Lucide Icons |
| **다국어** | i18next 26.0 |
| **애니메이션** | Framer Motion 12.23 |
| **AI API** | Google GenAI SDK 1.50 |
| **마크다운** | React Markdown 10.1 |

---

## 프로젝트 구조

```
src/
├── pages/
│   ├── Translate.tsx         # 실시간 동시통역 페이지
│   ├── Guide.tsx             # Knowledge Guide 챗봇
│   ├── History.tsx           # 세션 히스토리 목록
│   ├── HistoryDetail.tsx     # 세션 상세 조회
│   └── Home.tsx              # 홈페이지
├── services/
│   ├── geminiService.ts      # Gemini API 호출 (번역, 요약, 챗봇)
│   └── historyService.ts     # localStorage 기반 히스토리 관리
├── components/
│   ├── Layout.tsx            # 레이아웃 래퍼
│   └── PretextWrap.tsx       # Pretext 통합
├── hooks/
│   └── useSpeech.ts          # 음성 인식 훅
├── lib/
│   ├── audioUtils.ts         # AudioRecorder, AudioPlayer 클래스
│   ├── audioProcessor.ts     # AudioWorklet 스크립트
│   ├── micUtils.ts           # 마이크 에러 처리
│   ├── piiFilter.ts          # PII 마스킹
│   └── languageDetect.ts     # 언어 감지
├── i18n.ts                   # i18next 설정
├── App.tsx                   # 라우터 설정
└── main.tsx                  # 진입점
```

---

## v1 vs v2 비교

| 항목 | v1 | v2 |
|------|----|----|
| **서버** | Express 백엔드 필요 | 프론트엔드 전용 |
| **API** | REST API | Gemini Live WebSocket |
| **히스토리** | 클라우드 저장 | localStorage |
| **지연시간** | 5~7초 | 2~5초 |
| **오디오 포맷** | WAV | PCM16 (16kHz) |
| **인증** | 로그인 필요 | API 키만 필요 |
| **배포** | 호스팅 필요 | 정적 호스팅 (Vercel, Netlify) |

---

## 사용 방법

### 1. 실시간 동시통역

1. `/` (Translate 페이지) 접속
2. 상단/하단 언어 선택
3. 마이크 버튼 클릭하여 녹음 시작
4. 대면으로 대화하면 실시간 번역 표시
5. 저장 버튼으로 세션 히스토리에 저장

### 2. Knowledge Guide

1. `/guide` 접속
2. 문화 예절 또는 언어 관련 질문 입력
3. AI 챗봇으로부터 상담 받기

### 3. 히스토리 조회

1. `/history` 접속
2. 세션 검색 및 선택
3. `/history/:id`에서 전체 대화 전사 조회

---

## 기여 방법

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 지원

문제가 발생하면 [GitHub Issues](https://github.com/gagatrack/OneVoice/issues)에 보고해주세요.
