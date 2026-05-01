---
title: "부록 B. 환경변수 전체 목록"
slug: "appendix-env-vars"
appendix: "B"
words_target: 2000
screenshots:
  - app-b-step01-env-example-file
  - app-b-step02-env-validation-zod
  - app-b-step03-doppler-or-1password-secret
---

# 부록 B. 환경변수 전체 목록

## 학습 목표

- 본 SaaS 의 25개 환경변수를 5개 카테고리로 정리한다
- 모든 변수에 zod 스키마 검증을 적용한다
- 시크릿 보관 옵션 3가지(`.env`, Doppler, 1Password)를 비교한다

## 핵심 개념

환경변수는 운영의 가장 흔한 사고 원인이다. 한 줄 누락으로 SaaS 가 부팅에 실패하고,
한 줄 오타로 보안 사고가 난다. 그래서 우리는 **시작 시점에 zod 로 100% 검증**한다.

<!-- SCREENSHOT: app-b-step01-env-example-file -->
![.env.example — 카테고리 5개로 그룹화](../assets/screenshots/app-b-step01-env-example-file.png)
*그림 B-1. # ===== Auth =====, # ===== DB =====, # ===== Storage =====, # ===== Email =====, # ===== Cron/Ops ===== 로 시각 분리.*
<!-- /SCREENSHOT -->

## B.1 카테고리별 변수

### 인증 (Auth)
- `AUTH_SECRET` — 32바이트 랜덤
- `AUTH_URL` — `https://aed.example.kr`
- `AUTH_TRUST_HOST` — `true` (cloudflared 뒤)
- `MAGIC_LINK_TTL_MIN` — 5

### DB
- `DATABASE_URL` — Postgres
- `REDIS_URL` — Redis
- `DB_SSL` — `require` / `disable`

### Storage
- `STORAGE_PROVIDER` — `r2` / `s3`
- `STORAGE_ENDPOINT` — `https://<acct>.r2.cloudflarestorage.com`
- `STORAGE_ACCESS_KEY` — 시크릿
- `STORAGE_SECRET_KEY` — 시크릿
- `STORAGE_BUCKET_PRIMARY` — `aed-prod`
- `STORAGE_BUCKET_BACKUP` — `aed-backup-r2`

### Email
- `EMAIL_PROVIDER` — `resend` / `ses`
- `RESEND_API_KEY` — 시크릿
- `EMAIL_FROM_AUTH` — `auth@aed.example.kr`
- `EMAIL_FROM_REPORTS` — `reports@aed.example.kr`

### Cron / Ops
- `KUMA_PUSH_URL_SCHEDULE` — push monitor URL
- `KUMA_PUSH_URL_REPORT` — push monitor URL
- `KUMA_PUSH_URL_BACKUP` — push monitor URL
- `KUMA_PUSH_URL_NOTIFY` — push monitor URL
- `KUMA_PUSH_URL_CLEANUP` — push monitor URL
- `KUMA_PUSH_URL_RETRY` — push monitor URL
- `BACKUP_GPG_RECIPIENT` — `backup@aed.example.kr`
- `CLOUDFLARED_TOKEN` — 시크릿

총 25개.

## B.2 zod 검증

```ts
// src/lib/env.ts
const schema = z.object({
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  // ...
})
export const env = schema.parse(process.env)
```

<!-- SCREENSHOT: app-b-step02-env-validation-zod -->
![zod 검증 실패 시 부팅 차단 — 친절한 에러 메시지](../assets/screenshots/app-b-step02-env-validation-zod.png)
*그림 B-2. AUTH_SECRET 누락 → "AUTH_SECRET: Required" 와 함께 부팅 종료. 운영 시간 절약의 핵심.*
<!-- /SCREENSHOT -->

## B.3 시크릿 보관

| 옵션 | 장점 | 단점 |
|---|---|---|
| `.env.production` 파일 | 단순 | 백업·접근 통제 부족 |
| Doppler | 자동 회전, 감사 로그 | 외부 의존성 |
| 1Password CLI | 사람·기계 모두 사용 | 설정 복잡 |

본 SaaS 는 1인 운영 시작 → `.env.production` + 백업 본 별도 보관, 팀 합류 시
1Password CLI 로 전환 권장.

<!-- SCREENSHOT: app-b-step03-doppler-or-1password-secret -->
![1Password CLI — op read 로 시크릿 주입](../assets/screenshots/app-b-step03-doppler-or-1password-secret.png)
*그림 B-3. `op run -- docker compose up` 패턴. .env 파일이 디스크에 남지 않는다.*
<!-- /SCREENSHOT -->

## 캡처 체크리스트

- [ ] `app-b-step01-env-example-file.png`
- [ ] `app-b-step02-env-validation-zod.png`
- [ ] `app-b-step03-doppler-or-1password-secret.png`
