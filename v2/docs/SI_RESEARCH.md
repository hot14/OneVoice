# OneVoice v2 - 동시통역학 (SI) 이론 기초

---

## 1. 동시통역 소개

### 1.1 정의

**동시통역 (Simultaneous Interpretation, SI)**:
발화자의 발화가 계속되는 동안 통역사가 거의 동시에 목표어로 번역하는 통역 방식.

**OneVoice 구현 모델**:
- 사람 발화 → 마이크 녹음 → AI 번역 → 목표어 음성 출력 (2~5초 지연)
- 전문 통역사의 3~4초 지연과 유사한 수준

### 1.2 역사 배경

| 시대 | 발전 |
|------|------|
| 1920년대 | Philips 사가 최초의 동시통역 기술 개발 |
| 1945년 | 뉘른베르크 재판에서 최초 사용 |
| 1970~1980년대 | Danica Seleskovitch의 "의미론적 이론" 발표 |
| 1990년대 | Ghislain Chernov의 "발화 생성 모델 (EVS)" 제시 |
| 2020년대 | AI 기반 동시통역 실용화 (Google Gemini Live, OpenAI Realtime) |

---

## 2. 이론적 기초

### 2.1 Seleskovitch의 의미론적 이론 (Semantic Theory)

**핵심 원칙**:
통역사는 원문의 단어가 아닌 **의미 (meaning)**를 파악하고, 목표어의 관습에 맞게 표현한다.

**3단계 프로세스**:

```
1단계: 분석 (Comprehension)
  ↓
2단계: 탈언어화 (Deverbalization)
  ↓
3단계: 재표현 (Reexpression)
```

| 단계 | 설명 | OneVoice 적용 |
|------|------|-------------|
| **분석** | 원문의 의도, 맥락 이해 | Gemini API의 문맥 인식 |
| **탈언어화** | 언어 종속성 제거, 순수 의미만 남김 | 언어 모델의 내부 표현 |
| **재표현** | 목표어 규칙에 맞게 표현 | Gemini API의 target language generation |

**예**:
```
원문 (한국어): "신발이 떨어졌어요"
의미: 신발이 바닥에서 분리됨
재표현 (영어): "My shoe came off" 또는 "I lost my shoe"
```

### 2.2 Chernov의 발화 생성 모델 (EVS)

**발화 생성 모델 (Effort-Valuation System)**:
동시통역사는 다음 3가지 노력을 동시에 수행한다:

1. **청취 노력 (Listening Effort)**: 원문 청취 및 이해
2. **메모리 노력 (Memory Effort)**: 청취한 내용 단기 기억
3. **말하기 노력 (Speaking Effort)**: 목표어 산출

**OneVoice 관점**:
```
청취 노력 ← 자동 음성 인식 (ASR) - Gemini Live가 처리
↓
메모리 노력 ← 컨텍스트 윈도우 (16,000 tokens) - 최대 약 30초 발화
↓
말하기 노력 ← 자동 음성 생성 (TTS) - Gemini Live가 처리
```

**인지 부하 관리**:
```typescript
// Gemini Live는 내부적으로 다음을 최적화:
// - 청취: WebSocket에서 PCM16 스트림 수신
// - 메모리: 최대 30초 컨텍스트 유지
// - 말하기: 24kHz PCM으로 점진적 스트리밍
```

### 2.3 Gile의 노력 모델 (Effort Model)

**세 가지 노력의 균형**:

```
┌─────────────────────────┐
│   청취 노력 (40%)       │ ← 마이크에서 음성 입력
│   분석 노력 (40%)       │ ← Gemini 텍스트 생성
│   표현 노력 (20%)       │ ← 음성 합성 및 출력
└─────────────────────────┘
```

**OneVoice 최적화**:
- 마이크 입력 자동화: 청취 노력 감소
- AI 분석: 분석 노력 자동화
- TTS 자동화: 표현 노력 감소

---

## 3. 발화 분할 (Segmentation) 전략

### 3.1 의미 단위 분할

**동시통역의 핵심**: 원문이 끝날 때까지 기다리지 않고, 의미 단위로 선제적으로 번역

**5가지 분할 유형**:

| 유형 | 예 | 지연 | OneVoice 구현 |
|------|-----|------|-------------|
| **구 (Phrase)** | "안녕하세요" | 0.5초 | 즉시 번역 |
| **절 (Clause)** | "내일 오후에 만날래?" | 1~2초 | 2초 대기 후 번역 |
| **문장 (Sentence)** | "회의가 내일 오후 2시에 있습니다" | 2~3초 | 전체 문장 수신 후 번역 |
| **복합문** | "내가 간 곳에서 그들은..." | 3~4초 | 완전한 의미 유닛 대기 |
| **턴 (Turn)** | 한 사람의 전체 발화 | 4~5초 | 세션 저장 후 요약 |

**OneVoice 세분화**:
```
사용자 발화: "오늘 날씨는 정말 좋네요. 산책하기 좋은 날입니다."

분할 1: "오늘 날씨는 정말 좋네요"
  → 번역 (2초): "The weather is great today"
  
분할 2: "산책하기 좋은 날입니다"
  → 번역 (3초): "It's a perfect day for a walk"
```

### 3.2 구간별 재구조화

**문제**: 언어마다 문법 구조가 다름

| 원문 (한국어) | 바로 번역 (틀림) | 의미 재구조화 (옳음) |
|-----------|-------------|--------------|
| "저는 학교를 갔어요" | "I school went" ❌ | "I went to school" ✓ |
| "큰 나무" | "Big tree" ✓ | "A large tree" ✓ |
| "할 수 없어요" | "Can't do" ✓ | "I'm unable to do it" ✓ |

**Gemini Live 구현**:
```typescript
// 자동 구조 재구성
const originalText = "저는 어제 부산을 다녀왔습니다";
const geminiTranslation = "I visited Busan yesterday"; // 올바른 구조
```

---

## 4. 음성 속도 관리

### 4.1 발화 속도와 이해도

**연구 결과**:
- 최적 속도: 분당 120~150 단어 (WPM)
- 통역 속도: 분당 100~130 단어
- AI 합성 속도: 가변 (150~200 WPM 가능)

**OneVoice 구현 전략**:

| 발화 속도 | 통역 지연 | 청취자 경험 |
|---------|---------|-----------|
| 120 WPM | 2~3초 | 자연스러운 속도 |
| 150 WPM | 3~4초 | 약간 빠름 |
| 200 WPM | 4~5초 | 어려움 |

### 4.2 음성 합성 속도 개인화 (v2.1 계획)

```typescript
// 향후 구현 예정
interface SpeedPreference {
  userSpeakingRate: "slow" | "normal" | "fast"; // 사용자 선호도
  outputRate: 0.8 | 1.0 | 1.2; // 출력 배수 (80%, 100%, 120%)
}

// Gemini Live의 voiceConfig에 추가
const voiceConfig = {
  voiceName: "Aoede",
  speakingRate: 1.0, // 1.2x까지 지원 가능
};
```

---

## 5. 장기 기억과 단기 기억

### 5.1 메모리 계층

**Chernov의 메모리 이론**:

```
┌─────────────────────────────────────────┐
│      장기 기억 (Long-term Memory)        │ ← 주제 지식, 용어 사전
│                                         │   예: 기술 용어, 문화 지식
├─────────────────────────────────────────┤
│      단기 기억 (Short-term Memory)       │ ← 직전 발화 내용 (2~4초)
│                                         │   예: 최근 문장, 대명사 지시체
└─────────────────────────────────────────┘
```

**OneVoice 구현**:

```typescript
// Gemini Live의 컨텍스트 윈도우
{
  systemInstruction: "한국-일본 비즈니스 회의",  // 장기: 주제 컨텍스트
  config: {
    maxContextLength: 30000, // 단기: ~30초 발화 메모리
  }
}

// 예: 대명사 처리
사용자: "김철수 이사가 왔습니다. 그는 일본 지사장입니다."
  → Gemini가 "그"를 "김철수" 또는 "일본 지사장"으로 인식
  → "He is the director of the Japan branch" (올바른 지시체)
```

### 5.2 용어 사전 통합 (v2.1 계획)

```typescript
interface TermGlossary {
  domain: "medical" | "legal" | "business" | "technical";
  terms: {
    [source: string]: {
      [target: string]: string;
    };
  };
}

// 예: 의료 용어
const medicalGlossary = {
  ko_en: {
    "당뇨병": "diabetes mellitus",
    "고혈압": "hypertension",
    "혈액 검사": "blood test",
  }
};

// Gemini 프롬프트에 추가
const systemInstruction = `
당신은 의료 분야 동시통역사입니다.
다음 용어는 반드시 정확히 번역하세요:
${JSON.stringify(medicalGlossary.ko_en, null, 2)}
`;
```

---

## 6. 지연 시간 (Lag) 관리

### 6.1 지연 시간의 구성

```
총 지연 = 청취 지연 + 처리 지연 + 음성 합성 지연

총 지연 = 0.5초 + 1.5초 + 0.5초 = 2.5초
```

| 단계 | 시간 | 최적화 |
|------|------|--------|
| **청취 지연** | 0.5초 | PCM 스트림 수신 간격 |
| **처리 지연** | 1.0~2.0초 | Gemini API 응답 시간 |
| **합성 지연** | 0.3~0.5초 | TTS 레이턴시 |

### 6.2 지연 시간과 통역 정확도

**연구**: Gile (2009) - 지연과 오류율의 관계

```
지연 시간과 오류율:
0~2초   → 오류율 5~10%  ✓ 최적
2~4초   → 오류율 10~20% ○ 양호
4~6초   → 오류율 20~35% △ 미흡
6초+    → 오류율 35%+   ✗ 부적절
```

**OneVoice 목표**: 2~5초 지연 유지로 오류율 15% 이하

---

## 7. 대화 전략

### 7.1 능동적 청취 (Active Listening)

**동시통역사의 기법** → **OneVoice 의도**:

| 기법 | 설명 | OneVoice 구현 |
|------|------|-------------|
| **예측** | 문맥에서 다음 내용 예측 | Gemini의 컨텍스트 활용 |
| **정정** | 오류 발견 시 자동 수정 | 재번역 불가능 (실시간) |
| **요약** | 중요 내용 압축 | 세션 저장 후 AI 요약 |
| **명확화** | 불명확한 부분 질문 | Knowledge Guide 챗봇 |

### 7.2 문화적 적응

**동시통역의 문화 적응**:

```
원문 (한국어): "미안해요. 정말로 미안해요"
직역: "I'm sorry. I'm really sorry"
문화 적응: "I sincerely apologize"  ← 영미 문화에서 더 강력한 표현

OneVoice Knowledge Guide에서:
사용자: "영국 비즈니스에서 사과할 때?"
AI: "I do apologize 또는 I must apologize를 사용하면 더 공식적입니다"
```

---

## 8. 품질 평가 지표

### 8.1 정확성 (Accuracy)

**측정 방식**:
```
정확도 = (정확한 번역 세그먼트 수 / 전체 세그먼트 수) × 100%

목표: > 85%
```

**오류 분류**:

| 오류 유형 | 예 | 심각도 |
|----------|-----|--------|
| **누락** | "좋습니다" → 번역 생략 | 높음 |
| **첨가** | "좋습니다" → "very good" | 중간 |
| **왜곡** | "아니" → "yes"로 잘못 번역 | 높음 |
| **문법** | "go school" → "go to school" | 낮음 |
| **문체** | 존댓글 → 반말 | 낮음 |

### 8.2 유창성 (Fluency)

**청취자가 인식하는 자연스러움**:
1. 발음 명확성
2. 속도 일관성
3. 억양 자연성
4. 휴지(pause) 적절성

**OneVoice 측정**:
```
유창성 점수 = (청취자 만족도 + 오류율 역수) / 2
목표: > 80점 (100점 만점)
```

---

## 9. OneVoice 시스템과 SI 이론의 연계

### 9.1 Seleskovitch + AI

```
의미론적 이론 적용:
1. 분석 (Comprehension)
   → Gemini: "환자가 복통을 호소합니다" 이해
   
2. 탈언어화 (Deverbalization)
   → Gemini 내부 임베딩: [의료개념, 증상, 위치]
   
3. 재표현 (Reexpression)
   → Gemini: "The patient complains of abdominal pain"
```

### 9.2 EVS (Effort-Valuation) + WebSocket

```
Chernov의 노력 분산:
- 청취 노력: PCM 스트림 자동 처리 (100% 자동화)
- 분석 노력: Gemini 모델이 처리
- 표현 노력: TTS 자동 처리 (100% 자동화)

결과: 인간 통역사의 90% 자동화 가능
```

### 9.3 메모리 + 컨텍스트 윈도우

```
단기 기억 (2~4초) = Gemini 컨텍스트 윈도우
  ↓
장기 기억 (세션 히스토리) = localStorage + 요약
  ↓
용어 사전 (v2.1) = Knowledge Graph 통합
```

---

## 10. 참고 문헌

### 학술 자료

1. **Seleskovitch, D. (1978)**. *Interpreting for International Conferences*. Pen and Booth Publications.

2. **Chernov, G. (1979)**. *Semantic Aspects of Simultaneous Interpretation*. Language and Communication, 2(1), 77-91.

3. **Gile, D. (2009)**. *Basic Concepts and Models for Interpreter and Translator Training* (2nd ed.). John Benjamins.

4. **Pöchhacker, F. (2016)**. *Introducing Interpreting Studies* (2nd ed.). Routledge.

### 실무 자료

- 대한통역사협회 (2023). 동시통역 실무 가이드
- ISO 2603: 동시통역 서비스 - 표준
- AIIC (Association Internationale des Interprètes de Conférence): www.aiic.net

### OneVoice 관련

- Gemini Live API 문서: https://ai.google.dev/tutorials/live_api
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- PCM 오디오 처리: https://github.com/gagatrack/OneVoice
