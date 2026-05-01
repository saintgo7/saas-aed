# AED Inspection SaaS

> 자동심장충격기(AED) 다기관 점검 관리 시스템 — 자체 호스팅, Cloudflare Tunnel 기반
> Multi-tenant AED inspection management — self-hosted via Cloudflare Tunnel

[![CI](https://github.com/saintgo7/saas-aed/actions/workflows/ci.yml/badge.svg)](https://github.com/saintgo7/saas-aed/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 한국어

### 핵심 워크플로우 (4단계)

```
간단 입력 → 서명 → DOCX/PDF 발송 → 데이터 보존
```

매월 12개 항목을 라디오 버튼으로 입력 → 캔버스 서명 → 자동으로 DOCX·PDF 생성 → 점검자·관리자에게 이메일 발송 → DB·R2에 5년 보관.

### 빠른 시작 (로컬 개발)

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수 설정
cp .env.example .env.local
# DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET 등 채우기

# 3. DB 컨테이너 부트
docker compose up -d postgres redis

# 4. 마이그레이션
pnpm db:generate
pnpm db:migrate

# 5. 개발 서버
pnpm dev               # http://localhost:3000
pnpm cron:dev          # cron worker (별도 터미널)
```

### 데모 모드 (로그인 없이 체험)

`.env.local` 또는 환경변수에 `DEMO_MODE=true` 설정 → 시드된 ADMIN 계정으로 자동 로그인.

```bash
# 시드 + 데모 모드 실행
docker compose up -d postgres redis
pnpm db:migrate
pnpm seed:dev
DEMO_MODE=true pnpm dev
# → http://localhost:3000 접속하면 곧바로 /dashboard 진입
```

대시보드 상단에 "DEMO 모드" 황색 배너가 표시되며, Resend 이메일·R2 업로드는 모의(stub) 처리됩니다. **운영 환경에서는 절대 `DEMO_MODE`를 켜지 마세요.**

### 운영 배포 (abada-65)

[부록 C 운영 체크리스트](docs/book/ko/appendix/C-ops-checklist.md) 참조.

```bash
# abada-65 서버에서 한 번만:
mkdir -p /data/saas-aed
cd /data/saas-aed
# .env.production 작성 (시크릿)
# cloudflared/config.yml 작성 (터널 UUID + credentials)
docker compose up -d
```

GitHub Actions가 main 브랜치에 push되면 자동 배포.

### 디렉토리 구조

```
saas-aed/
├── src/
│   ├── app/              # Next.js App Router
│   ├── lib/
│   │   ├── auth/         # Auth.js v5 매직링크
│   │   ├── db/           # Drizzle 스키마 (8 tables)
│   │   ├── tenant/       # 다기관 격리 3계층 가드
│   │   ├── storage/      # R2 어댑터
│   │   ├── email/        # Resend + React Email
│   │   ├── documents/    # DOCX·PDF 생성
│   │   └── signature/    # SHA-256 + 캔버스
│   ├── server/cron/      # node-cron worker
│   └── middleware.ts     # tenant guard layer 2
├── docs/
│   ├── design/           # ERD, API 명세, 아키텍처, DESIGN.md
│   └── book/             # 단행본 한/영 17장 + 부록
│       ├── ko/
│       ├── en/
│       └── assets/screenshots/   ← 캡처 이미지 보관소
├── nginx/
├── cloudflared/
├── scripts/
│   ├── backup.sh
│   ├── capture-helper.sh         ← 캡처 헬퍼
│   └── verify-screenshots.sh     ← 캡처 누락 검증
└── docker-compose.yml
```

### 개발 캡처 워크플로우 (책·매뉴얼 동시 적용)

이 프로젝트는 **개발 중 캡처를 책에 자동 삽입**하는 워크플로우를 채택합니다. 자세한 내용은 [SCREENSHOT_WORKFLOW.md](docs/book/SCREENSHOT_WORKFLOW.md).

핵심 규칙:

1. **언제 캡처?** 새 파일 생성 직후, 핵심 결정 코드 작성 시점, 명령어 실행 결과, 빌드/테스트 통과 화면, 실제 동작 UI
2. **파일명 규칙**: `ch{NN}-step{NN}-{slug}.png` (예: `ch07-step02-auth-config.png`)
3. **저장 위치**: `docs/book/assets/screenshots/`
4. **마커 형식**: 마크다운에 `<!-- SCREENSHOT: ch07-step02-auth-config -->` ... `<!-- /SCREENSHOT -->`
5. **검증**: `pnpm book:verify-screenshots` — 마커는 있는데 파일이 없으면 경고

캡처 헬퍼 사용:

```bash
# macOS Cmd+Shift+5로 영역 선택 → 자동으로 슬러그 적용 + 폴더 이동
./scripts/capture-helper.sh ch07-step02-auth-config
```

### 책 빌드

```bash
pnpm book:build
# → docs/book/build/aed-saas-ko.pdf
# → docs/book/build/aed-saas-ko.docx
# → docs/book/build/aed-saas-en.pdf
# → docs/book/build/aed-saas-en.docx
```

요구: `pandoc` 3.x+, `xelatex` (MacTeX), Pretendard·Inter 폰트.

### 라이선스

- 코드: MIT
- 책 본문: CC BY-NC-SA 4.0

---

## English

### Core Workflow (4 Steps)

```
Quick Input → Sign → Send DOCX/PDF → Preserve
```

Tap 12 radio buttons monthly → canvas signature → auto-generated DOCX & PDF → emailed to inspector & admin → stored in DB & R2 for 5 years.

### Quick Start (Local Dev)

```bash
pnpm install
cp .env.example .env.local
docker compose up -d postgres redis
pnpm db:generate && pnpm db:migrate
pnpm dev               # http://localhost:3000
pnpm cron:dev          # in another terminal
```

### Production Deploy (abada-65)

See [Appendix C — Ops Checklist](docs/book/en/appendix/C-ops-checklist.md).

GitHub Actions auto-deploys on push to main.

### Capture Workflow

This project embeds **dev-time screenshots into the book**. See [SCREENSHOT_WORKFLOW.md](docs/book/SCREENSHOT_WORKFLOW.md).

```bash
./scripts/capture-helper.sh ch07-step02-auth-config
pnpm book:verify-screenshots
```

### Book Build

```bash
pnpm book:build
```

### License

- Code: MIT
- Book content: CC BY-NC-SA 4.0
