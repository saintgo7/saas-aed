---
title: "부록 D. 트러블슈팅 사례 32선"
slug: "appendix-troubleshooting"
appendix: "D"
words_target: 9000
screenshots:
  - app-d-step01-cloudflared-tunnel-down-error
  - app-d-step01-cloudflared-tunnel-down-fix
  - app-d-step02-postgres-too-many-connections-error
  - app-d-step02-postgres-too-many-connections-fix
  - app-d-step03-magic-link-expired-error
  - app-d-step03-magic-link-expired-fix
  - app-d-step04-r2-presign-403-error
  - app-d-step04-r2-presign-403-fix
  - app-d-step05-docx-template-render-error
  - app-d-step05-docx-template-render-fix
  - app-d-step06-pdf-korean-font-broken-error
  - app-d-step06-pdf-korean-font-broken-fix
  - app-d-step07-resend-bounce-spike-error
  - app-d-step07-resend-bounce-spike-fix
  - app-d-step08-cron-deadlock-error
  - app-d-step08-cron-deadlock-fix
  - app-d-step09-redis-oom-error
  - app-d-step09-redis-oom-fix
  - app-d-step10-drizzle-migration-fail-error
  - app-d-step10-drizzle-migration-fail-fix
  - app-d-step11-clock-drift-error
  - app-d-step11-clock-drift-fix
  - app-d-step12-tenant-leak-suspect-error
  - app-d-step12-tenant-leak-suspect-fix
  - app-d-step13-next-standalone-build-fail-error
  - app-d-step13-next-standalone-build-fail-fix
  - app-d-step14-pnpm-esbuild-hang-error
  - app-d-step14-pnpm-esbuild-hang-fix
  - app-d-step15-drizzle-empty-migration-error
  - app-d-step15-drizzle-empty-migration-fix
  - app-d-step16-tailwind-content-path-error
  - app-d-step16-tailwind-content-path-fix
  - app-d-step17-typescript-5x-incompat-error
  - app-d-step17-typescript-5x-incompat-fix
  - app-d-step18-postgres-healthy-but-refused-error
  - app-d-step18-postgres-healthy-but-refused-fix
  - app-d-step19-tenant-id-missing-query-error
  - app-d-step19-tenant-id-missing-query-fix
  - app-d-step20-search-path-rows-invisible-error
  - app-d-step20-search-path-rows-invisible-fix
  - app-d-step21-jsonb-items-slow-error
  - app-d-step21-jsonb-items-slow-fix
  - app-d-step22-restore-sequence-conflict-error
  - app-d-step22-restore-sequence-conflict-fix
  - app-d-step23-resend-quota-exceeded-error
  - app-d-step23-resend-quota-exceeded-fix
  - app-d-step24-session-tenant-missing-error
  - app-d-step24-session-tenant-missing-fix
  - app-d-step25-jwt-refresh-broken-error
  - app-d-step25-jwt-refresh-broken-fix
  - app-d-step26-multi-tenant-wrong-org-error
  - app-d-step26-multi-tenant-wrong-org-fix
  - app-d-step27-cron-timezone-missed-error
  - app-d-step27-cron-timezone-missed-fix
  - app-d-step28-overdue-notice-duplicate-error
  - app-d-step28-overdue-notice-duplicate-fix
  - app-d-step29-cron-worker-sigkill-loop-error
  - app-d-step29-cron-worker-sigkill-loop-fix
  - app-d-step30-r2-cors-upload-403-error
  - app-d-step30-r2-cors-upload-403-fix
  - app-d-step31-signed-url-expired-reissue-error
  - app-d-step31-signed-url-expired-reissue-fix
  - app-d-step32-r2-region-misroute-error
  - app-d-step32-r2-region-misroute-fix
  - app-d-step33-resend-attachment-missing-error
  - app-d-step33-resend-attachment-missing-fix
  - app-d-step34-resend-bounce-not-handled-error
  - app-d-step34-resend-bounce-not-handled-fix
  - app-d-step35-email-subject-utf8-broken-error
  - app-d-step35-email-subject-utf8-broken-fix
  - app-d-step36-tunnel-up-but-502-error
  - app-d-step36-tunnel-up-but-502-fix
  - app-d-step37-dns-propagation-stall-error
  - app-d-step37-dns-propagation-stall-fix
  - app-d-step38-cloudflared-restart-auth-error
  - app-d-step38-cloudflared-restart-auth-fix
  - app-d-step39-dashboard-cold-start-error
  - app-d-step39-dashboard-cold-start-fix
  - app-d-step40-dashboard-stat-n-plus-1-error
  - app-d-step40-dashboard-stat-n-plus-1-fix
  - app-d-step41-sql-injection-blocked-error
  - app-d-step41-sql-injection-blocked-fix
  - app-d-step42-csrf-missing-mutation-error
  - app-d-step42-csrf-missing-mutation-fix
  - app-d-step43-ios-input-focus-zoom-error
  - app-d-step43-ios-input-focus-zoom-fix
  - app-d-step44-signature-canvas-retina-blur-error
  - app-d-step44-signature-canvas-retina-blur-fix
---

# 부록 D. 트러블슈팅 사례 32선

## 학습 목표

- 본 SaaS 운영 1년간 실제 마주친 32개 사고 패턴을 학습한다
- 각 사고의 증상·원인·진단·수정·검증을 5단으로 정리한다
- 에러 화면과 해결 후 화면을 쌍으로 시각 비교한다
- 카테고리별로 묶어 비슷한 종류의 사고가 다시 닥쳤을 때 빠르게 매칭한다

## 핵심 개념

운영의 깊이는 **사고를 기록한 양**에 비례한다. 처음 12선이 1년차의 결과였다면,
이 32선은 2년차까지의 종합 기록이다. 카테고리는 다음과 같이 묶었다.

1. Build & Dependency (D.13–D.17)
2. Database (D.2, D.18–D.22)
3. Auth & Session (D.3, D.23–D.26)
4. Cron & Notifications (D.8, D.27–D.29)
5. R2 Storage (D.4, D.30–D.32)
6. Email — Resend (D.7, D.33–D.35)
7. Cloudflare Tunnel (D.1, D.36–D.38)
8. Performance (D.39–D.40)
9. Security (D.41–D.42)
10. UI / UX (D.43–D.44)

각 사례는 다음 5줄 구조를 따른다.

- **증상**: 사용자가 보는 현상
- **원인**: 진짜 기술적 원인
- **진단**: 어떤 명령어/로그로 확인했는가
- **수정**: 정확한 코드 또는 명령
- **검증**: 수정 후 무엇으로 확인했는가

---

## 1차 12선 (1년차)

---

### 1. cloudflared 터널 down — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-error -->
![에러 — cloudflared 컨테이너 exited(1)](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-error.png)
*그림 D-1a. docker compose ps. cloudflared 만 빨간색.*
<!-- /SCREENSHOT -->

**증상**: status page 502, Kuma 외부 모니터 critical, 사용자 전체 접속 불가.
**원인**: Cloudflare Tunnel 토큰 만료. 30일짜리 토큰을 갱신하지 않았다.
**진단**: `docker compose logs cloudflared --tail=50` → `failed to authenticate: token expired`.
**수정**: dashboard 에서 새 토큰 발급 → `.env.production` 의 `CLOUDFLARE_TUNNEL_TOKEN` 갱신 → `docker compose up -d cloudflared`.
**검증**: `cloudflared tunnel info` 200 OK, status page 200 복귀.

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-fix -->
![해결 — cloudflared healthy 복귀](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-fix.png)
*그림 D-1b. 30초 만에 healthy. 재발 방지: 토큰 만료 30일 전 알람.*
<!-- /SCREENSHOT -->

---

### 2. Postgres "too many connections" — Database

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-error -->
![에러 — FATAL: sorry, too many clients already](../assets/screenshots/app-d-step02-postgres-too-many-connections-error.png)
*그림 D-2a. 100대 시점에 발생.*
<!-- /SCREENSHOT -->

**증상**: 동시 접속 100대 직후 모든 API 가 503, 로그에 `too many clients already`.
**원인**: Next.js 의 hot path 가 매 요청마다 새 connection 을 만들었고 pool 한계 초과.
**진단**: `SELECT count(*) FROM pg_stat_activity` = 95, `max_connections` = 100.
**수정**: pgbouncer (transaction pool) 도입, `DATABASE_URL` 을 6432 포트로 교체.
**검증**: 부하 테스트 200 RPS 에서 활성 커넥션 25대 안정 유지.

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-fix -->
![해결 — pgbouncer 추가 후 활성 커넥션 25 안정](../assets/screenshots/app-d-step02-postgres-too-many-connections-fix.png)
*그림 D-2b. 17장에 자세한 설정.*
<!-- /SCREENSHOT -->

---

### 3. 매직링크 expired — Auth & Session

<!-- SCREENSHOT: app-d-step03-magic-link-expired-error -->
![에러 — 5분 지나 만료](../assets/screenshots/app-d-step03-magic-link-expired-error.png)
*그림 D-3a. 사용자가 메일 늦게 확인.*
<!-- /SCREENSHOT -->

**증상**: 사용자가 매직링크를 늦게 클릭하면 "expired" 화면만 나옴.
**원인**: TTL 5분이 짧고, 만료 후 재발급 동선이 없었음.
**진단**: 운영 로그에서 expired 클릭 비율 23%. 대다수가 5–15분 사이.
**수정**: 만료 화면에 "다시 받기" 1클릭 버튼 + rate limit 60초.
**검증**: 다음 주 expired 클릭 후 "다시 받기" 전환율 81%, CS 문의 0건.

<!-- SCREENSHOT: app-d-step03-magic-link-expired-fix -->
![해결 — 다시 받기 버튼 + 친절 메시지](../assets/screenshots/app-d-step03-magic-link-expired-fix.png)
*그림 D-3b.*
<!-- /SCREENSHOT -->

---

### 4. R2 presigned URL 403 — R2 Storage

<!-- SCREENSHOT: app-d-step04-r2-presign-403-error -->
![에러 — presigned PUT 403 SignatureDoesNotMatch](../assets/screenshots/app-d-step04-r2-presign-403-error.png)
*그림 D-4a. Content-Type 헤더 누락.*
<!-- /SCREENSHOT -->

**증상**: 클라이언트 PUT 시 403 `SignatureDoesNotMatch`.
**원인**: presign 시 지정한 `Content-Type` 과 실제 PUT 헤더가 달랐다.
**진단**: 브라우저 Network 탭, presign payload 와 PUT request header 비교.
**수정**: presign 함수가 받은 `contentType` 을 응답에 함께 반환, 클라이언트가 동일 값으로 PUT.
**검증**: 200 OK, R2 콘솔에서 정상 객체 확인.

<!-- SCREENSHOT: app-d-step04-r2-presign-403-fix -->
![해결 — Content-Type: image/png 명시 후 200](../assets/screenshots/app-d-step04-r2-presign-403-fix.png)
*그림 D-4b.*
<!-- /SCREENSHOT -->

---

### 5. DOCX 템플릿 렌더 실패 — Build & Dependency

<!-- SCREENSHOT: app-d-step05-docx-template-render-error -->
![에러 — docxtemplater unclosed loop](../assets/screenshots/app-d-step05-docx-template-render-error.png)
*그림 D-5a. 표 안 placeholder 깨짐.*
<!-- /SCREENSHOT -->

**증상**: docxtemplater 가 `unclosed loop` 던지며 보고서 생성 실패.
**원인**: 표 안에 줄바꿈 없이 `{#items}` 를 넣어 paragraph 경계가 찢겼다.
**진단**: `docxtemplater` `parser:1` 옵션으로 템플릿 디버깅, 깨진 셀 좌표 식별.
**수정**: `paragraphLoop:true` + 표 안 placeholder 를 별도 `<w:p>` 로 분리.
**검증**: 12개 항목 보고서 정상 렌더, 회귀 fixture 추가.

<!-- SCREENSHOT: app-d-step05-docx-template-render-fix -->
![해결 — 정상 렌더](../assets/screenshots/app-d-step05-docx-template-render-fix.png)
*그림 D-5b.*
<!-- /SCREENSHOT -->

---

### 6. PDF 한글 폰트 깨짐 — Build & Dependency

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-error -->
![에러 — PDF에 □□□ 출력](../assets/screenshots/app-d-step06-pdf-korean-font-broken-error.png)
*그림 D-6a. 폰트 임베드 실패.*
<!-- /SCREENSHOT -->

**증상**: PDF 보고서가 한글 부분에서 □□□ 출력.
**원인**: `@react-pdf/renderer` 가 기본 Helvetica 만 가지고 있어 한글 글리프 없음.
**진단**: PDF 를 macOS Preview 로 열어 폰트 메타 확인, 한글 폰트 미임베드.
**수정**: `Pretendard-Regular.ttf` 임베드 + `Font.register({ family, src })`.
**검증**: 한글 본문/제목 모두 정상, 파일 크기 +600KB 수용 가능.

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-fix -->
![해결 — 한글 정상 출력](../assets/screenshots/app-d-step06-pdf-korean-font-broken-fix.png)
*그림 D-6b.*
<!-- /SCREENSHOT -->

---

### 7. Resend 반송률 급등 — Email (Resend)

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-error -->
![에러 — 반송률 15% 알람](../assets/screenshots/app-d-step07-resend-bounce-spike-error.png)
*그림 D-7a. SPF 레코드 조정 후 propagation 지연.*
<!-- /SCREENSHOT -->

**증상**: Resend 대시보드 bounce rate 15% 알람.
**원인**: SPF 변경 직후 propagation 지연으로 일부 RBL 에서 reject.
**진단**: `dig +short TXT example.com`, 일부 리졸버에서 옛 레코드 반환.
**수정**: SPF flat-include → ip4 단순화, TTL 300 → 60.
**검증**: 24시간 후 bounce rate 0.5%, Postmaster Tools 정상.

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-fix -->
![해결 — 24시간 후 반송률 0.5%로 회복](../assets/screenshots/app-d-step07-resend-bounce-spike-fix.png)
*그림 D-7b.*
<!-- /SCREENSHOT -->

---

### 8. cron 잡 deadlock — Cron & Notifications

<!-- SCREENSHOT: app-d-step08-cron-deadlock-error -->
![에러 — backup-daily 잡이 영원히 끝나지 않음](../assets/screenshots/app-d-step08-cron-deadlock-error.png)
*그림 D-8a. Redis 락이 풀리지 않은 채 컨테이너 OOM.*
<!-- /SCREENSHOT -->

**증상**: BullMQ `backup-daily` 잡이 4시간째 running, 다음 잡 모두 대기.
**원인**: 워커 OOM 으로 컨테이너 재시작, Redis 락은 TTL 없이 남음.
**진단**: `redis-cli KEYS 'bull:*lock'`, TTL -1 확인.
**수정**: `acquireLock(key, ttl=600)` 강제, `try/finally` 로 release 보장.
**검증**: 워커를 강제 kill 해도 다음 분에 잡이 자동으로 다시 잡힘.

<!-- SCREENSHOT: app-d-step08-cron-deadlock-fix -->
![해결 — 락 자동 해제 보장](../assets/screenshots/app-d-step08-cron-deadlock-fix.png)
*그림 D-8b.*
<!-- /SCREENSHOT -->

---

### 9. Redis OOM — Database

<!-- SCREENSHOT: app-d-step09-redis-oom-error -->
![에러 — OOM command not allowed when used memory > 'maxmemory'](../assets/screenshots/app-d-step09-redis-oom-error.png)
*그림 D-9a. nonce TTL 누락 누적.*
<!-- /SCREENSHOT -->

**증상**: Redis 가 `OOM command not allowed` 던지며 모든 SET 실패.
**원인**: 매직링크 nonce 일부가 TTL 없이 SET 되어 무한 누적.
**진단**: `INFO memory`, `SCAN 0 MATCH 'nonce:*'` 100만 개.
**수정**: `maxmemory-policy allkeys-lru`, 모든 nonce 에 `EX 600` 명시.
**검증**: 메모리 사용량 60MB 안정 유지, OOM 알람 30일 무발생.

<!-- SCREENSHOT: app-d-step09-redis-oom-fix -->
![해결 — 메모리 안정](../assets/screenshots/app-d-step09-redis-oom-fix.png)
*그림 D-9b.*
<!-- /SCREENSHOT -->

---

### 10. drizzle migration 실패 — Database

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-error -->
![에러 — column "deleted_at" already exists](../assets/screenshots/app-d-step10-drizzle-migration-fail-error.png)
*그림 D-10a. 부분 실패 후 재시도.*
<!-- /SCREENSHOT -->

**증상**: `drizzle-kit migrate` 가 `column "deleted_at" already exists` 로 실패.
**원인**: 이전 마이그레이션이 add column 까지 성공, index 에서 실패. 재실행 시 중복.
**진단**: `SELECT * FROM drizzle.__drizzle_migrations ORDER BY id` 로 중단 지점 확인.
**수정**: 마이그레이션을 `ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` 로 idempotent 화.
**검증**: 재실행 통과, drift check 깨끗.

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-fix -->
![해결 — 재실행 통과](../assets/screenshots/app-d-step10-drizzle-migration-fail-fix.png)
*그림 D-10b.*
<!-- /SCREENSHOT -->

---

### 11. 시계 드리프트 — Auth & Session

<!-- SCREENSHOT: app-d-step11-clock-drift-error -->
![에러 — JWT not valid yet (clock skew)](../assets/screenshots/app-d-step11-clock-drift-error.png)
*그림 D-11a. 호스트 ntp 미설정.*
<!-- /SCREENSHOT -->

**증상**: 일부 사용자가 로그인 직후 `JWT not valid yet` 으로 거부됨.
**원인**: 호스트 시계가 47초 앞서 있어 발급 직후 토큰의 `nbf` 가 미래로 인식.
**진단**: `timedatectl status` → `System clock synchronized: no`.
**수정**: `chrony` 설치, NTP 소스를 Cloudflare time service 로 지정.
**검증**: `chronyc tracking` offset < 5ms 유지, `nbf` 거부 0건.

<!-- SCREENSHOT: app-d-step11-clock-drift-fix -->
![해결 — chronyc tracking 안정](../assets/screenshots/app-d-step11-clock-drift-fix.png)
*그림 D-11b.*
<!-- /SCREENSHOT -->

---

### 12. 테넌트 누수 의심 — Security

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-error -->
![에러 — 통합 테스트가 누수 가능성 시나리오 발견](../assets/screenshots/app-d-step12-tenant-leak-suspect-error.png)
*그림 D-12a. 새 라우트 추가 후 5장 테스트 누락.*
<!-- /SCREENSHOT -->

**증상**: 통합 테스트가 새 라우트에서 다른 기관 데이터가 보일 가능성 발견.
**원인**: 라우트 추가 시 5장에서 정의한 누수 테스트 패턴이 자동으로 늘지 않음.
**진단**: 테스트 매트릭스 vs 라우트 enum diff, 4개 미커버 라우트 식별.
**수정**: 라우트 enum 자동 수집 → 테스트가 enum 길이만큼 자동 생성.
**검증**: 모든 라우트 누수 테스트 100% 통과, 신규 라우트 PR 시 자동 추가.

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-fix -->
![해결 — 모든 라우트 누수 테스트 통과](../assets/screenshots/app-d-step12-tenant-leak-suspect-fix.png)
*그림 D-12b.*
<!-- /SCREENSHOT -->

---

## 2차 추가 20선 (2년차)

---

## Build & Dependency

---

### 13. Next.js standalone 빌드 실패 — Build & Dependency

<!-- SCREENSHOT: app-d-step13-next-standalone-build-fail-error -->
<!-- /SCREENSHOT -->

**증상**: `next build` 가 `Error: DATABASE_URL is required` 로 실패하며 standalone 산출물이 생성되지 않음.
**원인**: 빌드 시점에 DB 모듈이 import 되며 환경변수가 검증되는데, CI 에 `DATABASE_URL` 이 없었음.
**진단**: GitHub Actions 로그 stack trace, `src/server/db/client.ts:12` 의 검증 라인 확인.
**수정**: 빌드 시점 검증을 lazy 화 (`getDb()` 호출 시 검증), CI 시크릿에 더미 `postgres://build:build@localhost/build` 추가.
**검증**: `pnpm build` 통과, `.next/standalone/server.js` 생성, runtime 에서는 진짜 URL 로 정상 부팅.

<!-- SCREENSHOT: app-d-step13-next-standalone-build-fail-fix -->
<!-- /SCREENSHOT -->

---

### 14. pnpm install 이 esbuild 빌드 스크립트로 멈춤 — Build & Dependency

<!-- SCREENSHOT: app-d-step14-pnpm-esbuild-hang-error -->
<!-- /SCREENSHOT -->

**증상**: CI 의 `pnpm install --frozen-lockfile` 이 10분 넘게 멈춤, 결국 timeout.
**원인**: pnpm 9 가 `esbuild` 의 postinstall 빌드 스크립트를 차단(`onlyBuiltDependencies` 미허용)하고 stdin 대기에 들어감.
**진단**: `pnpm install --reporter=ndjson` 으로 hung process 식별, `esbuild` postinstall 에서 정지.
**수정**: `package.json` 에 `"pnpm": { "onlyBuiltDependencies": ["esbuild", "@swc/core"] }` 추가.
**검증**: CI 90초 내 완료, esbuild 바이너리 정상 다운로드.

<!-- SCREENSHOT: app-d-step14-pnpm-esbuild-hang-fix -->
<!-- /SCREENSHOT -->

---

### 15. drizzle-kit generate 후 마이그레이션 SQL 이 비어있음 — Build & Dependency

<!-- SCREENSHOT: app-d-step15-drizzle-empty-migration-error -->
<!-- /SCREENSHOT -->

**증상**: 스키마를 변경했는데 `drizzle-kit generate` 가 만든 SQL 파일이 빈 주석만 포함.
**원인**: `drizzle.config.ts` 의 `schema` 경로가 잘못된 glob 이라 새 테이블 파일이 인식되지 않음.
**진단**: `drizzle-kit generate --verbose` 로 스캔된 파일 목록 확인, 새 파일 빠져 있음.
**수정**: `schema: './src/server/db/schema/**/*.ts'` 로 glob 수정.
**검증**: 다시 generate → SQL 에 `CREATE TABLE inspection_attachments` 정상 생성.

<!-- SCREENSHOT: app-d-step15-drizzle-empty-migration-fix -->
<!-- /SCREENSHOT -->

---

### 16. Tailwind 클래스가 적용 안 됨 — Build & Dependency

<!-- SCREENSHOT: app-d-step16-tailwind-content-path-error -->
<!-- /SCREENSHOT -->

**증상**: 새로 만든 컴포넌트에서 `bg-blue-600` 등 클래스가 무시됨.
**원인**: 컴포넌트가 `src/features/` 아래에 있는데 `tailwind.config.ts` 의 `content` 가 `./src/app/**` 만 포함.
**진단**: 빌드된 CSS 검색 → 해당 클래스 없음. `tailwindcss --watch --verbose` 로 스캔 경로 확인.
**수정**: `content: ['./src/**/*.{ts,tsx,mdx}']` 로 확장.
**검증**: HMR 후 클래스 즉시 적용, 프로덕션 빌드도 정상.

<!-- SCREENSHOT: app-d-step16-tailwind-content-path-fix -->
<!-- /SCREENSHOT -->

---

### 17. TypeScript 5.x 호환성 문제 — Build & Dependency

<!-- SCREENSHOT: app-d-step17-typescript-5x-incompat-error -->
<!-- /SCREENSHOT -->

**증상**: TS 5.6 업그레이드 후 `Type 'X' is not assignable to type 'Awaited<X>'` 다수 발생.
**원인**: 5.6 의 `--strictBuiltinIteratorReturn` 기본 활성화로 일부 generic infer 가 좁아짐.
**진단**: `tsc --noEmit --listFiles` + `--explainFiles`, 영향 파일 23개 식별.
**수정**: 영향 헬퍼들에 명시적 반환 타입 추가, `tsconfig` 의 `lib` 에서 `ES2024.Iterator` 명시.
**검증**: `pnpm typecheck` 0 errors, 단위 테스트 그린.

<!-- SCREENSHOT: app-d-step17-typescript-5x-incompat-fix -->
<!-- /SCREENSHOT -->

---

## Database

---

### 18. postgres 컨테이너 healthy 인데 connect 실패 — Database

<!-- SCREENSHOT: app-d-step18-postgres-healthy-but-refused-error -->
<!-- /SCREENSHOT -->

**증상**: `docker compose ps` 에 postgres healthy, 그런데 앱에서 `ECONNREFUSED 127.0.0.1:5432`.
**원인**: 컨테이너는 0.0.0.0 에 바인딩됐지만 호스트의 IPv4 loopback 이 아닌 IPv6 만 listen 하도록 설정됨.
**진단**: `ss -lntp | grep 5432` → `:::5432` 만 보임. `nc -4 -zv localhost 5432` 실패.
**수정**: `compose.yml` 의 ports 를 `"127.0.0.1:5432:5432"` 로 명시 (IPv4 강제).
**검증**: `psql -h 127.0.0.1` 접속 OK, 앱 부팅 성공.

<!-- SCREENSHOT: app-d-step18-postgres-healthy-but-refused-fix -->
<!-- /SCREENSHOT -->

---

### 19. tenant_id 누락된 query 가 통과되어 다른 기관 데이터 조회됨 — Database

<!-- SCREENSHOT: app-d-step19-tenant-id-missing-query-error -->
<!-- /SCREENSHOT -->

**증상**: QA 환경에서 한 기관 사용자가 다른 기관의 점검 기록 1건을 조회 가능.
**원인**: 새 query 에서 `where(eq(inspections.id, id))` 만 작성, `tenantId` 조건 누락.
**진단**: `pg_stat_statements` 에서 tenant 필터 없는 쿼리 grep, 3개 발견.
**수정**: `withTenant(qb, tenantId)` 헬퍼 강제 + ESLint 룰로 raw `where(eq(*.id, ...))` 차단.
**검증**: 통합 테스트 (5장 누수 테스트) 모든 라우트 통과, 정적 검사 깨끗.

<!-- SCREENSHOT: app-d-step19-tenant-id-missing-query-fix -->
<!-- /SCREENSHOT -->

---

### 20. 마이그레이션 적용 후 row 가 보이지 않음 — Database

<!-- SCREENSHOT: app-d-step20-search-path-rows-invisible-error -->
<!-- /SCREENSHOT -->

**증상**: 마이그레이션 후 신규 컬럼이 코드에서 항상 NULL 로 보임.
**원인**: 마이그레이션은 `app` 스키마에 적용됐지만 앱 connection 의 `search_path` 가 `public` 으로 고정.
**진단**: `SHOW search_path;` → `"$user", public`. `SELECT current_schema()` → `public`.
**수정**: `DATABASE_URL` 에 `?options=-c%20search_path%3Dapp,public` 추가, 또는 매 connection 시작 시 `SET search_path`.
**검증**: 신규 컬럼이 정상 read/write, 테이블 prefix 없이 query 동작.

<!-- SCREENSHOT: app-d-step20-search-path-rows-invisible-fix -->
<!-- /SCREENSHOT -->

---

### 21. JSONB 컬럼(items) 인덱싱 느림 — Database

<!-- SCREENSHOT: app-d-step21-jsonb-items-slow-error -->
<!-- /SCREENSHOT -->

**증상**: `WHERE items @> '[{"status":"fail"}]'` 쿼리가 800ms.
**원인**: `items` JSONB 에 인덱스 없음. 매 row scan.
**진단**: `EXPLAIN ANALYZE` → `Seq Scan on inspections`, rows=120k.
**수정**: `CREATE INDEX inspections_items_gin ON inspections USING GIN (items jsonb_path_ops);`
**검증**: 같은 쿼리 12ms, `Bitmap Index Scan` 사용 확인.

<!-- SCREENSHOT: app-d-step21-jsonb-items-slow-fix -->
<!-- /SCREENSHOT -->

---

### 22. 백업 복원 시 sequence/identity 충돌 — Database

<!-- SCREENSHOT: app-d-step22-restore-sequence-conflict-error -->
<!-- /SCREENSHOT -->

**증상**: `pg_restore` 후 첫 INSERT 가 `duplicate key value violates unique constraint`.
**원인**: 데이터는 복원됐지만 sequence 의 `last_value` 가 1로 리셋되어 기존 PK 와 충돌.
**진단**: `SELECT pg_get_serial_sequence('inspections', 'id'), currval(...)` 비교.
**수정**: 복원 후 `SELECT setval(pg_get_serial_sequence('inspections','id'), MAX(id)) FROM inspections;` 일괄 실행 스크립트.
**검증**: 신규 INSERT 즉시 성공, 모든 테이블 sequence currval ≥ MAX(id).

<!-- SCREENSHOT: app-d-step22-restore-sequence-conflict-fix -->
<!-- /SCREENSHOT -->

---

## Auth & Session

---

### 23. Magic Link 이메일이 안 옴 — Auth & Session

<!-- SCREENSHOT: app-d-step23-resend-quota-exceeded-error -->
<!-- /SCREENSHOT -->

**증상**: 신규 사용자 가입 후 매직링크 메일이 도착하지 않음.
**원인**: Resend 의 무료 플랜 일일 발송 한도 100건 초과 (월말 가입 폭증).
**진단**: Resend dashboard → API logs `429 quota_exceeded`, 앱 로그에 동일 코드.
**수정**: 유료 플랜 업그레이드 + 월별 발송량 모니터링 + 80% 도달 시 Slack alert.
**검증**: 다음 날 동일 시나리오 재현, 메일 1초 내 도착, dashboard 정상.

<!-- SCREENSHOT: app-d-step23-resend-quota-exceeded-fix -->
<!-- /SCREENSHOT -->

---

### 24. 로그인은 되는데 tenantId 가 세션에 안 들어감 — Auth & Session

<!-- SCREENSHOT: app-d-step24-session-tenant-missing-error -->
<!-- /SCREENSHOT -->

**증상**: 로그인 직후 `/dashboard` 에서 "기관을 선택하세요" 무한 루프.
**원인**: NextAuth `jwt` 콜백은 tenantId 를 넣었는데 `session` 콜백에서 누락.
**진단**: `console.log` 우회로 token vs session 비교 — token 에는 있고 session 에는 없음.
**수정**: `session({ session, token }) { session.user.tenantId = token.tenantId; return session; }`.
**검증**: 로그인 → `/dashboard` 정상 진입, e2e 테스트 그린.

<!-- SCREENSHOT: app-d-step24-session-tenant-missing-fix -->
<!-- /SCREENSHOT -->

---

### 25. JWT 만료 후 refresh 안 됨 — Auth & Session

<!-- SCREENSHOT: app-d-step25-jwt-refresh-broken-error -->
<!-- /SCREENSHOT -->

**증상**: 30분 자리 비운 사용자가 어떤 mutation 을 해도 401, 새로고침 시 로그아웃.
**원인**: `jwt.maxAge` 30분 + `updateAge` 미설정 → 토큰이 invalidate 되지만 silent refresh 동작 없음.
**진단**: 브라우저 cookie 의 `next-auth.session-token` 만료 시각 확인, 갱신 요청 트래픽 0.
**수정**: `jwt: { maxAge: 60*60*24, updateAge: 60*60 }`, 클라이언트에 `useSession({ refetchInterval: 60*5 })`.
**검증**: 8시간 자리 비운 후에도 mutation 정상, 로그에 silent refresh 로그 1건/시.

<!-- SCREENSHOT: app-d-step25-jwt-refresh-broken-fix -->
<!-- /SCREENSHOT -->

---

### 26. 다기관 사용자가 잘못된 기관에 로그인됨 — Auth & Session

<!-- SCREENSHOT: app-d-step26-multi-tenant-wrong-org-error -->
<!-- /SCREENSHOT -->

**증상**: 2개 기관 멤버십을 가진 사용자가 항상 첫 번째 기관으로만 로그인됨.
**원인**: 로그인 콜백이 `memberships[0]` 을 무조건 채택, 사용자의 기존 `lastActiveTenantId` 무시.
**진단**: DB 의 `user.last_active_tenant_id` 와 세션의 `tenantId` 다름을 확인.
**수정**: `signIn` 콜백에서 `lastActiveTenantId` 우선, 없으면 멤버십 선택 화면으로 리디렉트.
**검증**: 멀티 기관 계정 e2e 시나리오 추가, 마지막 사용 기관으로 자동 진입 확인.

<!-- SCREENSHOT: app-d-step26-multi-tenant-wrong-org-fix -->
<!-- /SCREENSHOT -->

---

## Cron & Notifications

---

### 27. 매월 1일 cron 이 돌지 않음 — Cron & Notifications

<!-- SCREENSHOT: app-d-step27-cron-timezone-missed-error -->
<!-- /SCREENSHOT -->

**증상**: 매월 1일 09:00 KST 발송돼야 할 점검 알림이 발송 안 됨.
**원인**: BullMQ repeat 표현 `0 9 1 * *` 가 컨테이너 timezone (UTC) 기준이라 KST 18:00 에 실행, 다음 1일이 한국 기준 2일.
**진단**: `worker.getRepeatableJobs()` 의 `next` 시각이 UTC 임을 확인.
**수정**: repeat 옵션에 `tz: 'Asia/Seoul'` 추가, 또는 컨테이너 `TZ=Asia/Seoul` 환경변수.
**검증**: 다음 달 1일 09:00 KST 정확히 트리거, 다음 5번 분 forecast 도 정확.

<!-- SCREENSHOT: app-d-step27-cron-timezone-missed-fix -->
<!-- /SCREENSHOT -->

---

### 28. 미점검 알림이 중복 발송됨 — Cron & Notifications

<!-- SCREENSHOT: app-d-step28-overdue-notice-duplicate-error -->
<!-- /SCREENSHOT -->

**증상**: 한 사용자에게 동일 미점검 알림이 3번 도착.
**원인**: 잡 ID 가 timestamp 기반이라 1초 내 중복 enqueue 시 충돌 회피되지 않음. 워커 재시작 직후 backlog 재처리.
**진단**: BullMQ `getJobs(['completed'])` 에 `notice:device-123:2026-04-28` 이 3개.
**수정**: jobId 를 `notice:${deviceId}:${dateBucket}` 결정적 키로 강제, `removeOnComplete: 1000`.
**검증**: 같은 시나리오 재시도 시 두 번째부터 enqueue 무시, 사용자 1통만 수신.

<!-- SCREENSHOT: app-d-step28-overdue-notice-duplicate-fix -->
<!-- /SCREENSHOT -->

---

### 29. cron worker 가 SIGKILL 받고 재시작 루프 — Cron & Notifications

<!-- SCREENSHOT: app-d-step29-cron-worker-sigkill-loop-error -->
<!-- /SCREENSHOT -->

**증상**: cron-worker 컨테이너가 5분마다 재시작, healthcheck never ready.
**원인**: 한 잡이 1.2GB 메모리를 잡고, compose 의 `mem_limit: 512m` 을 넘겨 OOMKiller (SIGKILL).
**진단**: `dmesg | grep -i kill` → `Killed process ... (node)`. `docker stats` 에서 RSS 폭증 확인.
**수정**: 큰 잡을 청크 단위 처리 (`chunk(rows, 500)`), 컨테이너 한도 1GB 로 상향, swap 활성화.
**검증**: 24시간 안정, RSS p95 280MB, OOMKill 0건.

<!-- SCREENSHOT: app-d-step29-cron-worker-sigkill-loop-fix -->
<!-- /SCREENSHOT -->

---

## R2 Storage

---

### 30. 서명 업로드 시 403 (CORS) — R2 Storage

<!-- SCREENSHOT: app-d-step30-r2-cors-upload-403-error -->
<!-- /SCREENSHOT -->

**증상**: 브라우저에서 PUT 시 403 + 브라우저 콘솔에 CORS 에러.
**원인**: R2 버킷 CORS 정책에 `https://app.example.com` 도메인 미등록.
**진단**: 브라우저 Network → preflight `OPTIONS` 가 403, response 에 Allow-Origin 없음.
**수정**: `wrangler r2 bucket cors put <bucket> --rules cors.json`, `AllowedOrigins` 와 `AllowedHeaders: ["Content-Type"]`.
**검증**: preflight 200, PUT 200, 새 객체 R2 콘솔에 노출.

<!-- SCREENSHOT: app-d-step30-r2-cors-upload-403-fix -->
<!-- /SCREENSHOT -->

---

### 31. signed URL 이 만료 직후 새로 못 받음 — R2 Storage

<!-- SCREENSHOT: app-d-step31-signed-url-expired-reissue-error -->
<!-- /SCREENSHOT -->

**증상**: 첨부파일 다운로드 링크 클릭 시 `Request has expired`, 새로고침해도 같은 링크.
**원인**: 클라이언트가 첫 응답을 5분간 캐싱, 만료 후에도 같은 URL 재사용.
**진단**: React Query devtools 에서 `staleTime: Infinity` 확인.
**수정**: signed URL fetch 에 `staleTime: expiresIn * 0.8`, 만료 임박 시 자동 refetch.
**검증**: 7분 후 다시 클릭 → 자동으로 새 URL 발급, 다운로드 즉시 시작.

<!-- SCREENSHOT: app-d-step31-signed-url-expired-reissue-fix -->
<!-- /SCREENSHOT -->

---

### 32. R2 버킷이 다른 region 으로 강제 라우팅됨 — R2 Storage

<!-- SCREENSHOT: app-d-step32-r2-region-misroute-error -->
<!-- /SCREENSHOT -->

**증상**: APAC 사용자 업로드 latency p95 가 갑자기 1.8s → 4.5s.
**원인**: R2 jurisdiction 설정 미지정으로 EU 로케이션에 신규 버킷 생성, 모든 업로드가 EU 경유.
**진단**: `wrangler r2 bucket info <name>` → `location: weur`. 클라이언트 trace 가 EU edge 거침.
**수정**: 버킷을 `--jurisdiction=apac` 으로 재생성 후 데이터 마이그레이션, 기존 버킷 read-only 30일 유지.
**검증**: 업로드 p95 1.6s 회복, R2 dashboard 의 region 통계 APAC 99%.

<!-- SCREENSHOT: app-d-step32-r2-region-misroute-fix -->
<!-- /SCREENSHOT -->

---

## Email (Resend)

---

### 33. DOCX/PDF 첨부가 누락 — Email (Resend)

<!-- SCREENSHOT: app-d-step33-resend-attachment-missing-error -->
<!-- /SCREENSHOT -->

**증상**: 점검 보고서 메일이 도착하지만 첨부파일 없이 본문만 옴.
**원인**: Resend `attachments` 의 `content` 가 Buffer 대신 빈 Uint8Array (스트리밍 미완료).
**진단**: 발송 직전 `attachment.content.length` 0, 그러나 R2 다운로드는 200.
**수정**: R2 stream 을 `await streamToBuffer()` 로 완전 수렴 후 base64 인코딩하여 전달.
**검증**: 다음 메일 첨부 정상, 파일 hash 가 R2 객체와 일치.

<!-- SCREENSHOT: app-d-step33-resend-attachment-missing-fix -->
<!-- /SCREENSHOT -->

---

### 34. Bounce 메시지 처리 미구현 — Email (Resend)

<!-- SCREENSHOT: app-d-step34-resend-bounce-not-handled-error -->
<!-- /SCREENSHOT -->

**증상**: 잘못된 주소로 보낸 메일이 bounce 되어도 시스템이 모름, 같은 주소로 매월 발송.
**원인**: Resend webhook 미구독, bounce 이벤트가 silent.
**진단**: Resend dashboard 의 bounce log 100건 vs 시스템 DB 의 bounce 플래그 0건.
**수정**: `/api/webhooks/resend` 엔드포인트 + `email.bounced` 이벤트 시 `users.email_status='bounced'` 마킹.
**검증**: 테스트로 잘못된 주소 발송 → 30초 내 webhook 도착, DB 갱신, 다음 발송 자동 skip.

<!-- SCREENSHOT: app-d-step34-resend-bounce-not-handled-fix -->
<!-- /SCREENSHOT -->

---

### 35. 한글 제목 깨짐 (UTF-8 인코딩) — Email (Resend)

<!-- SCREENSHOT: app-d-step35-email-subject-utf8-broken-error -->
<!-- /SCREENSHOT -->

**증상**: 일부 메일 클라이언트(Gmail iOS) 에서 제목이 `=?utf-8?Q?=EC=A0=90...` 로 깨져 보임.
**원인**: Resend SDK 가 RFC 2047 encoded-word 를 사용하지만 한글이 길면 일부 클라이언트 디코더가 끊긴 줄에서 실패.
**진단**: 메일 헤더 raw 보기에서 `Subject:` 라인이 75자에서 끊기고 다음 줄 정렬 어긋남.
**수정**: 제목 전체를 한 번에 base64 인코딩 (`=?utf-8?B?...?=`) 으로 강제, 75자 제한 회피하도록 SDK 옵션 사용.
**검증**: Gmail iOS / Outlook 365 / 네이버 메일 모두 한글 제목 정상.

<!-- SCREENSHOT: app-d-step35-email-subject-utf8-broken-fix -->
<!-- /SCREENSHOT -->

---

## Cloudflare Tunnel

---

### 36. Tunnel 은 Up 인데 502 — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step36-tunnel-up-but-502-error -->
<!-- /SCREENSHOT -->

**증상**: cloudflared 는 healthy/connected, 그런데 사이트는 502 Bad Gateway.
**원인**: 터널 타깃 서비스(`http://app:3000`) 컨테이너가 down. 터널은 살아있으나 backend 죽음.
**진단**: `docker compose ps app` → `restarting`. `docker compose logs app` 에 OOM.
**수정**: app 컨테이너 메모리 한도 상향 + Next.js standalone runtime 메모리 누수 라이브러리 업그레이드.
**검증**: app healthy 30분 안정, status page 200, 외부에서 정상 응답.

<!-- SCREENSHOT: app-d-step36-tunnel-up-but-502-fix -->
<!-- /SCREENSHOT -->

---

### 37. DNS 전파 안 됨 (10분 이상) — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step37-dns-propagation-stall-error -->
<!-- /SCREENSHOT -->

**증상**: 신규 서브도메인 `staging.example.com` 이 10분 넘게 NXDOMAIN.
<!-- /SCREENSHOT -->

**원인**: `cloudflared tunnel route dns` 만 실행, 실제 Cloudflare DNS 레코드는 만들어졌지만 zone proxy 가 일시적으로 묵음 처리됨.
**진단**: `dig +trace staging.example.com @1.1.1.1`, Cloudflare 까지 도달했으나 `;; AUTHORITY:` 만 있고 답 없음.
**수정**: dashboard 에서 해당 레코드를 한 번 toggle (proxy off → on), API 로 `purge_cache`.
**검증**: 30초 내 정상 응답, 글로벌 DNS checker (whatsmydns) 100% 그린.

<!-- SCREENSHOT: app-d-step37-dns-propagation-stall-fix -->
<!-- /SCREENSHOT -->

---

### 38. cloudflared 재시작 후 인증 실패 — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step38-cloudflared-restart-auth-error -->
<!-- /SCREENSHOT -->

**증상**: 정기 재시작 후 cloudflared 가 `Unauthorized: Failed to get tunnel` 로 부팅 실패.
**원인**: 토큰 파일 권한이 0644 → 컨테이너 내부 user (nobody) 가 읽지 못함.
**진단**: `docker compose exec cloudflared cat /etc/cloudflared/token` → permission denied.
**수정**: 호스트 파일 chmod 0600 후 마운트 옵션을 `:ro,uid=65532` 로 강제.
**검증**: 컨테이너 재시작 5회 연속 정상, healthcheck 즉시 ready.

<!-- SCREENSHOT: app-d-step38-cloudflared-restart-auth-fix -->
<!-- /SCREENSHOT -->

---

## Performance

---

### 39. /dashboard 첫 로드 5초 이상 — Performance

<!-- SCREENSHOT: app-d-step39-dashboard-cold-start-error -->
<!-- /SCREENSHOT -->

**증상**: 새벽 첫 사용자의 `/dashboard` TTFB 가 5.4s.
**원인**: DB 콘솔 스타트 (Hyperdrive 콜드 풀 + idle 5분 후 connection 재초기화) + Next.js standalone 의 cold dynamic import.
**진단**: server timing header 로 `db: 4.2s`, `render: 0.6s`. `pg_stat_activity` idle 0.
**수정**: cron 으로 매 4분 `/api/health/db` ping (warm-up), 핫 모듈 `import` 를 정적으로 강제.
**검증**: 새벽 5시 첫 진입 TTFB 480ms, p95 < 700ms.

<!-- SCREENSHOT: app-d-step39-dashboard-cold-start-fix -->
<!-- /SCREENSHOT -->

---

### 40. 대시보드 통계 쿼리 N+1 — Performance

<!-- SCREENSHOT: app-d-step40-dashboard-stat-n-plus-1-error -->
<!-- /SCREENSHOT -->

**증상**: 기관당 장비 200대 이상이면 `/dashboard` 가 9초.
**원인**: 장비별로 `getLastInspection(deviceId)` 가 별도 query → 200 round-trip.
**진단**: `pg_stat_statements` 에서 같은 query plan 200회, total time 7.8s.
**수정**: `LATERAL JOIN` 으로 한 번에 fetch, 또는 window function `ROW_NUMBER()`.
**검증**: 장비 500대 기관에서도 query 1회, p95 320ms.

<!-- SCREENSHOT: app-d-step40-dashboard-stat-n-plus-1-fix -->
<!-- /SCREENSHOT -->

---

## Security

---

### 41. SQL injection 시도 차단 검증 — Security

<!-- SCREENSHOT: app-d-step41-sql-injection-blocked-error -->
<!-- /SCREENSHOT -->

**증상**: pentest 에서 검색 query 에 `'; DROP TABLE inspections; --` 가 그대로 로그에 남음.
**원인**: 코드 자체는 Drizzle parameterized 사용으로 안전했지만 검증 로그가 없어 알람이 안 울림.
**진단**: WAF/앱 로그에서 의심 패턴 grep 시 hit 0, 그러나 DB log 에는 escape 된 형태로 남음.
**수정**: 입력 단에서 zod schema + Cloudflare WAF 룰 (`OWASP CRS` 활성화) + Sentry breadcrumb 에 의심 패턴 태그.
**검증**: 동일 페이로드 재시도 시 WAF 403, Sentry alert 1건, DB 에는 query 도 도달 안 함.

<!-- SCREENSHOT: app-d-step41-sql-injection-blocked-fix -->
<!-- /SCREENSHOT -->

---

### 42. CSRF 토큰 누락된 mutation — Security

<!-- SCREENSHOT: app-d-step42-csrf-missing-mutation-error -->
<!-- /SCREENSHOT -->

**증상**: 새로 추가한 `/api/devices/transfer` 가 CSRF 검사 없이 동작.
**원인**: Server Action 이 아닌 raw route handler 로 작성하면서 미들웨어 CSRF 검증 우회.
**진단**: `curl` 로 외부 origin 에서 POST → 200 OK (정상이라면 403 이어야 함).
**수정**: `withCsrf()` 래퍼 강제, 모든 mutation route 에 적용. ESLint 룰 추가 (`no-raw-mutation-route`).
**검증**: 동일 curl 403, 정상 브라우저 origin 200, 단위 테스트 추가.

<!-- SCREENSHOT: app-d-step42-csrf-missing-mutation-fix -->
<!-- /SCREENSHOT -->

---

## UI / UX

---

### 43. iOS Safari 에서 input focus 시 화면 줌 — UI / UX

<!-- SCREENSHOT: app-d-step43-ios-input-focus-zoom-error -->
<!-- /SCREENSHOT -->

**증상**: 점검 폼의 input 에 focus 하면 iOS Safari 가 자동으로 화면을 130% 줌, 사용자 혼란.
**원인**: input font-size 가 14px (iOS 는 16px 미만이면 zoom-on-focus 트리거).
**진단**: 실기기 테스트, computed font-size 14px 확인.
**수정**: 모든 form input `font-size: 16px`, 디자인적으로 작게 보여야 한다면 `transform: scale(0.875)` 사용.
**검증**: iPhone 13 / 15 Pro / SE 모두 focus 시 줌 없음, 폰트 시각적으로 동일.

<!-- SCREENSHOT: app-d-step43-ios-input-focus-zoom-fix -->
<!-- /SCREENSHOT -->

---

### 44. 서명 캔버스가 retina 에서 흐림 — UI / UX

<!-- SCREENSHOT: app-d-step44-signature-canvas-retina-blur-error -->
<!-- /SCREENSHOT -->

**증상**: retina iPad 에서 서명한 결과가 보고서에 흐릿하게 출력.
**원인**: `<canvas width=400 height=200>` 만 지정, devicePixelRatio (2x) 미반영.
**진단**: 캔버스 export `toDataURL()` 이미지 native size 400x200 인데 화면은 800x400 px 영역 차지.
**수정**: `canvas.width = cssWidth * dpr`, `ctx.scale(dpr, dpr)`, CSS 만 cssWidth 유지.
**검증**: iPad Pro 에서 서명 export 800x400, 보고서 PDF 100% 줌에서 또렷.

<!-- SCREENSHOT: app-d-step44-signature-canvas-retina-blur-fix -->
<!-- /SCREENSHOT -->

---

## 캡처 체크리스트

각 사례마다 에러/해결 2장씩 = 총 88장.

### 1차 12선

- [ ] D.1 cloudflared (2)
- [ ] D.2 postgres connections (2)
- [ ] D.3 magic link (2)
- [ ] D.4 r2 presign (2)
- [ ] D.5 docx (2)
- [ ] D.6 pdf font (2)
- [ ] D.7 resend bounce (2)
- [ ] D.8 cron deadlock (2)
- [ ] D.9 redis oom (2)
- [ ] D.10 migration (2)
- [ ] D.11 clock drift (2)
- [ ] D.12 tenant leak (2)

### Build & Dependency

- [ ] D.13 next standalone (2)
- [ ] D.14 pnpm esbuild (2)
- [ ] D.15 drizzle empty (2)
- [ ] D.16 tailwind content (2)
- [ ] D.17 typescript 5.x (2)

### Database

- [ ] D.18 postgres healthy refused (2)
- [ ] D.19 tenant_id missing (2)
- [ ] D.20 search_path (2)
- [ ] D.21 jsonb gin (2)
- [ ] D.22 sequence conflict (2)

### Auth & Session

- [ ] D.23 resend quota (2)
- [ ] D.24 session tenantId (2)
- [ ] D.25 jwt refresh (2)
- [ ] D.26 multi-tenant wrong org (2)

### Cron & Notifications

- [ ] D.27 cron timezone (2)
- [ ] D.28 overdue duplicate (2)
- [ ] D.29 worker SIGKILL (2)

### R2 Storage

- [ ] D.30 r2 cors (2)
- [ ] D.31 signed url reissue (2)
- [ ] D.32 r2 region (2)

### Email

- [ ] D.33 attachment missing (2)
- [ ] D.34 bounce webhook (2)
- [ ] D.35 utf-8 subject (2)

### Cloudflare Tunnel

- [ ] D.36 tunnel up 502 (2)
- [ ] D.37 dns propagation (2)
- [ ] D.38 restart auth (2)

### Performance

- [ ] D.39 dashboard cold start (2)
- [ ] D.40 dashboard N+1 (2)

### Security

- [ ] D.41 sql injection (2)
- [ ] D.42 csrf missing (2)

### UI / UX

- [ ] D.43 ios input zoom (2)
- [ ] D.44 signature retina (2)
