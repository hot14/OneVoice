# OneVoice v2 - 배포 가이드 (Deployment Guide)

---

## 1. 환경 설정 (Environment Configuration)

### 1.1 개발 환경 (Development)

**필수 환경 변수**:

```bash
# .env.local (local development only, never commit)
GEMINI_API_KEY=your_gemini_api_key_here
```

**API 키 발급**:
1. https://aistudio.google.com/app/apikey 방문
2. "Create API key" 클릭
3. 프로젝트 선택 또는 새 프로젝트 생성
4. 생성된 키를 복사하여 `.env.local`에 붙여넣기

**개발 서버 실행**:

```bash
npm install
npm run dev
# 포트 3000에서 실행: http://localhost:3000
```

### 1.2 프로덕션 환경 (Production)

**환경 변수 설정**:

| 호스팅 플랫폼 | 설정 방법 |
|------------|---------|
| **Vercel** | 대시보드 → Settings → Environment Variables |
| **Netlify** | Site settings → Build & deploy → Environment |
| **GitHub Pages** | GitHub Secrets (자동 배포 시) |

**권장 보안 설정**:
- `.env.local` 및 `.env.*.local` 파일을 `.gitignore`에 추가
- 프로덕션 API 키는 별도 키 사용 (Gemini API에서 제한 설정 가능)
- HTTPS 필수
- API 키 로테이션 주기: 30일마다

---

## 2. 빌드 프로세스 (Build Process)

### 2.1 프로덕션 빌드

```bash
# 타입 체크
npm run type-check

# 린트 검사
npm run lint

# 프로덕션 번들 생성
npm run build

# 빌드 결과 확인 (dist/ 디렉토리)
ls -la dist/
```

**빌드 결과**:
- `dist/index.html` - 메인 HTML (SPA entry point)
- `dist/assets/` - JavaScript, CSS, 이미지 번들
- 예상 크기: ~450KB (gzip 기준 ~120KB)

### 2.2 빌드 최적화

**Vite 설정** (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'gemini': ['@google/generative-ai'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@google/generative-ai']
  }
});
```

**결과**: 평균 초기 로딩 시간 < 3초

### 2.3 로컬 프로덕션 검증

```bash
# 프로덕션 번들 미리보기
npm run preview

# http://localhost:4173에서 확인
# 마이크 권한, 번역 기능 테스트
```

---

## 3. 정적 호스팅 배포 (Static Hosting Deployment)

### 3.1 Vercel (권장)

**Step 1: GitHub 저장소 연결**

1. https://vercel.com 로그인
2. "Import Project" → GitHub 저장소 선택
3. Root Directory: `v2` (OneVoice/v2 디렉토리)

**Step 2: 환경 변수 설정**

```
대시보드 → Settings → Environment Variables
GEMINI_API_KEY = your_api_key
```

**Step 3: 배포**

```
프로젝트 설정 확인:
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install
```

자동 배포: `main` 브랜치에 push하면 자동 배포 시작

**배포 확인**:

```bash
# CLI 배포 (선택사항)
npm install -g vercel
vercel deploy --prod

# 배포 후 URL: https://onevoice-v2.vercel.app
```

**Vercel 특화 기능**:
- 자동 HTTPS 적용
- 무료 SSL 인증서
- 전역 CDN (Edge Network)
- 환경별 Preview URL (Pull Request마다)

### 3.2 Netlify

**Step 1: GitHub 연결**

1. https://netlify.com 로그인
2. "Import from Git" → GitHub 저장소 선택

**Step 2: 빌드 설정**

```
Build & Deploy 설정:
- Base directory: v2
- Build command: npm run build
- Publish directory: dist
- Environment variables: GEMINI_API_KEY
```

**Step 3: 배포**

```bash
# CLI 배포
npm install -g netlify-cli
netlify deploy --prod

# 배포 후 URL: https://onevoice-v2.netlify.app
```

### 3.3 GitHub Pages

**Step 1: 저장소 설정**

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`, Folder: `v2/dist`

**Step 2: GitHub Actions 워크플로우 생성**

```yaml
# .github/workflows/deploy-pages.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd v2 && npm install
      
      - name: Build
        run: cd v2 && npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'v2/dist'
      
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v2
```

**Step 3: Secrets 설정**

```
Settings → Secrets and variables → Actions
Repository secrets:
- GEMINI_API_KEY = your_api_key
```

**배포 확인**:
- Push to main → GitHub Actions 실행
- https://gagatrack.github.io/OneVoice (조직 이름에 따라 변경)

---

## 4. CI/CD 파이프라인 (GitHub Actions)

### 4.1 자동화 테스트 워크플로우

**파일**: `.github/workflows/test.yml`

```yaml
name: Test & Quality Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: cd v2 && npm ci
      
      - name: Type check
        run: cd v2 && npm run type-check
      
      - name: Lint
        run: cd v2 && npm run lint
      
      - name: Unit tests
        run: cd v2 && npm test -- --coverage
      
      - name: Integration tests
        run: cd v2 && npm run test:integration
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./v2/coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
      
      - name: Build
        run: cd v2 && npm run build

  e2e-test:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: cd v2 && npm ci
      
      - name: Build
        run: cd v2 && npm run build
      
      - name: E2E tests
        run: cd v2 && npm run test:e2e
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: v2/playwright-report/
```

### 4.2 배포 워크플로우

**파일**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'v2/**'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: cd v2 && npm ci
      
      - name: Build
        run: cd v2 && npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: v2
          scope: gagatrack
      
      - name: Create Deployment Status
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: context.payload.deployment.id,
              state: 'success',
              environment_url: 'https://onevoice-v2.vercel.app'
            });
```

### 4.3 성능 모니터링 워크플로우

**파일**: `.github/workflows/lighthouse.yml`

```yaml
name: Lighthouse Performance

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Audit with Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: v2/lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

**Lighthouse 설정** (`v2/lighthouserc.json`):

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000",
        "http://localhost:3000/guide",
        "http://localhost:3000/history"
      ],
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--no-sandbox"
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.8}],
        "categories:seo": ["error", {"minScore": 0.8}]
      }
    }
  }
}
```

---

## 5. 배포 검증 (Deployment Verification)

### 5.1 배포 후 체크리스트

**기능 검증**:

```bash
# 1. 페이지 로딩 확인
curl -I https://onevoice-v2.vercel.app
# 결과: HTTP/1.1 200 OK

# 2. API 키 로드 확인
curl -s https://onevoice-v2.vercel.app | grep -i "gemini\|api"

# 3. 마이크 접근 테스트 (수동)
# 브라우저에서 https://onevoice-v2.vercel.app 접속
# 마이크 버튼 클릭 → 권한 허용 → 음성 입력 테스트

# 4. 실시간 번역 테스트
# 한국어 발화 → 3초 내 영문 번역 표시 확인

# 5. 세션 저장 테스트
# 번역 완료 후 "저장" 버튼 → 모달 팝업 확인 → localStorage 저장 완료
```

### 5.2 성능 지표 검증

| 지표 | 목표 | 확인 방법 |
|------|------|---------|
| **Lighthouse Performance** | > 80 | Lighthouse 리포트 확인 |
| **First Contentful Paint (FCP)** | < 2s | DevTools → Performance |
| **Largest Contentful Paint (LCP)** | < 2.5s | Lighthouse 리포트 |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse 리포트 |
| **Time to Interactive (TTI)** | < 3.5s | Lighthouse 리포트 |
| **Bundle Size** | < 500KB | `npm run build` 출력 |

### 5.3 모니터링 설정

**Vercel Analytics**:

```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
```

**오류 추적** (Sentry):

```bash
# 설치
npm install @sentry/react @sentry/tracing

# src/main.tsx 초기화
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [new Sentry.Replay()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

---

## 6. 롤백 절차 (Rollback Procedure)

### 6.1 Vercel 롤백

**자동 롤백**:

```bash
vercel rollback --prod
```

**수동 이전 배포로 복구**:

1. Vercel 대시보드 → Deployments
2. 이전 안정적인 배포 선택
3. "Promote to Production" 클릭

### 6.2 Git 롤백

```bash
# 이전 커밋으로 되돌리기
git revert HEAD

# 또는 특정 커밋으로 되돌리기
git reset --hard <commit-hash>

# 강제 푸시 (배포 팀만)
git push origin main --force-with-lease
```

---

## 7. 마이너 업데이트 절차 (Minor Update Procedure)

### 7.1 핫픽스 (긴급 버그 수정)

```bash
# 1. hotfix 브랜치 생성
git checkout -b hotfix/issue-description

# 2. 버그 수정 및 테스트
npm run test

# 3. 커밋 및 PR
git commit -m "fix: critical bug description"
git push origin hotfix/issue-description

# 4. PR 생성 및 검토 후 main에 merge
# → GitHub Actions 자동 배포
```

### 7.2 버전 태깅

```bash
# 버전 태그 생성 및 배포
npm version patch  # 0.0.1 → 0.0.2
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 1.0.0 → 2.0.0

# 태그 푸시
git push origin --tags

# Release 노트 생성 (GitHub Releases)
# gh release create v2.0.2 --generate-notes
```

---

## 8. 보안 체크리스트 (Security Checklist)

### 배포 전 검증

- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는가?
- [ ] API 키가 소스 코드에 하드코딩되어 있지 않은가?
- [ ] 프로덕션 환경 변수가 호스팅 플랫폼에 설정되었는가?
- [ ] HTTPS가 강제되고 있는가?
- [ ] CSP (Content Security Policy) 헤더가 설정되어 있는가?
- [ ] 민감한 정보 (PII)가 로그에 노출되지 않는가?
- [ ] Gemini API 키 권한이 최소 권한 원칙에 따라 제한되었는가?
- [ ] 신뢰할 수 없는 출처의 통신이 차단되어 있는가?

### Vercel 환경 설정

```
Settings → Security & Compliance
- Auto-expose System Environment Variables: Off
- Require a Deployment Protection Allowlist: On (선택)
- Sensitive information encryption: On
```

---

## 9. 트러블슈팅 (Troubleshooting)

### 9.1 일반적인 배포 오류

| 오류 | 원인 | 해결책 |
|------|------|-------|
| **503 Service Unavailable** | API 키 미설정 또는 할당량 초과 | 환경 변수 확인, API 할당량 체크 |
| **CORS 오류** | Gemini API CORS 미설정 | 프론트엔드 배포 확인 (Vercel 자동 처리) |
| **마이크 접근 거부** | HTTPS 미설정 | HTTPS 강제 또는 localhost 테스트 |
| **번들 크기 과대** | 미사용 의존성 | `npm run build` 분석 및 tree-shaking 최적화 |

### 9.2 성능 최적화

**로딩 속도 개선**:

```bash
# 번들 분석
npm run build -- --analyze

# 청크 분할 최적화 (vite.config.ts)
rollupOptions: {
  output: {
    manualChunks: {
      'vendor': ['react', 'react-dom'],
      'gemini': ['@google/generative-ai'],
      'ui': ['lucide-react', 'framer-motion']
    }
  }
}
```

**메모리 최적화**:

```typescript
// 불필요한 세션 정리
const cleanupOldSessions = () => {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const items = JSON.parse(localStorage.getItem('history') || '[]');
  const filtered = items.filter(item => 
    new Date(item.date).getTime() > oneWeekAgo
  );
  
  localStorage.setItem('history', JSON.stringify(filtered));
};
```

---

## 10. 배포 체크인 (Deployment Checklist)

### 최종 배포 전

```
테스트 완료:
- [ ] npm test 통과 (coverage >80%)
- [ ] npm run test:e2e 통과
- [ ] npm run type-check 통과
- [ ] npm run lint 통과

빌드 확인:
- [ ] npm run build 성공
- [ ] npm run preview 동작 확인
- [ ] bundle size < 500KB

보안 검증:
- [ ] 환경 변수 설정 확인
- [ ] .env.local .gitignore 등록
- [ ] API 키 권한 확인
- [ ] HTTPS 강제 설정

배포:
- [ ] 배포 플랫폼 환경 변수 설정
- [ ] CI/CD 파이프라인 실행
- [ ] 배포 후 Lighthouse 점수 80+
- [ ] 실시간 번역 기능 테스트

모니터링:
- [ ] Analytics 활성화
- [ ] Error tracking (Sentry) 활성화
- [ ] 성능 지표 베이스라인 설정
```

---

**마지막 업데이트**: 2024년 4월  
**담당 팀**: DevOps / Platform Engineering  
**다음 검토**: 2024년 6월 (v2.1 배포 시)
