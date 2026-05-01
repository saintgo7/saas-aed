---
title: "부록 D. 트러블슈팅 사례 12선"
slug: "appendix-troubleshooting"
appendix: "D"
words_target: 4000
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
---

# 부록 D. 트러블슈팅 사례 12선

## 학습 목표

- 본 SaaS 운영 1년간 실제 마주친 12개 사고 패턴을 학습한다
- 각 사고의 증상·근본 원인·즉시 조치·재발 방지를 4단으로 정리한다
- 에러 화면과 해결 후 화면을 쌍으로 시각 비교한다

## 핵심 개념

운영의 깊이는 **사고를 기록한 양**에 비례한다. 다음 12개는 한 번씩 일어났고,
한 번 더 일어나지 않게 만든 패턴이다.

---

## D.1 cloudflared 터널 down

증상: status page 502, Kuma 외부 모니터 critical.

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-error -->
![에러 — cloudflared 컨테이너 exited(1)](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-error.png)
*그림 D-1a. docker compose ps. cloudflared 만 빨간색.*
<!-- /SCREENSHOT -->

근본 원인: 토큰 만료. 해결: 새 토큰 발급 → `.env.production` 갱신 → `docker compose up -d cloudflared`.

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-fix -->
![해결 — cloudflared healthy 복귀](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-fix.png)
*그림 D-1b. 30초 만에 healthy. 재발 방지: 토큰 만료 30일 전 알람.*
<!-- /SCREENSHOT -->

---

## D.2 Postgres "too many connections"

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-error -->
![에러 — FATAL: sorry, too many clients already](../assets/screenshots/app-d-step02-postgres-too-many-connections-error.png)
*그림 D-2a. 100대 시점에 발생.*
<!-- /SCREENSHOT -->

해결: pgbouncer 도입 (17장).

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-fix -->
![해결 — pgbouncer 추가 후 활성 커넥션 25 안정](../assets/screenshots/app-d-step02-postgres-too-many-connections-fix.png)
*그림 D-2b.*
<!-- /SCREENSHOT -->

---

## D.3 매직링크 "expired"

<!-- SCREENSHOT: app-d-step03-magic-link-expired-error -->
![에러 — 5분 지나 만료](../assets/screenshots/app-d-step03-magic-link-expired-error.png)
*그림 D-3a. 사용자가 메일 늦게 확인.*
<!-- /SCREENSHOT -->

해결: 만료 화면에 "다시 받기" 버튼 1클릭 추가.

<!-- SCREENSHOT: app-d-step03-magic-link-expired-fix -->
![해결 — 다시 받기 버튼 + 친절 메시지](../assets/screenshots/app-d-step03-magic-link-expired-fix.png)
*그림 D-3b.*
<!-- /SCREENSHOT -->

---

## D.4 R2 presigned URL 403

<!-- SCREENSHOT: app-d-step04-r2-presign-403-error -->
![에러 — presigned PUT 403 SignatureDoesNotMatch](../assets/screenshots/app-d-step04-r2-presign-403-error.png)
*그림 D-4a. Content-Type 헤더 누락.*
<!-- /SCREENSHOT -->

해결: presign 시점과 PUT 시점의 Content-Type 동기화.

<!-- SCREENSHOT: app-d-step04-r2-presign-403-fix -->
![해결 — Content-Type: image/png 명시 후 200](../assets/screenshots/app-d-step04-r2-presign-403-fix.png)
*그림 D-4b.*
<!-- /SCREENSHOT -->

---

## D.5 DOCX 템플릿 렌더 실패

<!-- SCREENSHOT: app-d-step05-docx-template-render-error -->
![에러 — docxtemplater unclosed loop](../assets/screenshots/app-d-step05-docx-template-render-error.png)
*그림 D-5a. 표 안 placeholder 깨짐.*
<!-- /SCREENSHOT -->

해결: paragraphLoop:true + 표 안 placeholder를 별도 paragraph 로 분리.

<!-- SCREENSHOT: app-d-step05-docx-template-render-fix -->
![해결 — 정상 렌더](../assets/screenshots/app-d-step05-docx-template-render-fix.png)
*그림 D-5b.*
<!-- /SCREENSHOT -->

---

## D.6 PDF 한글 폰트 깨짐 (네모)

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-error -->
![에러 — PDF에 □□□ 출력](../assets/screenshots/app-d-step06-pdf-korean-font-broken-error.png)
*그림 D-6a. 폰트 임베드 실패.*
<!-- /SCREENSHOT -->

해결: Pretendard ttf 임베드 + Font.register 명시.

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-fix -->
![해결 — 한글 정상 출력](../assets/screenshots/app-d-step06-pdf-korean-font-broken-fix.png)
*그림 D-6b.*
<!-- /SCREENSHOT -->

---

## D.7 Resend 반송률 급등

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-error -->
![에러 — 반송률 15% 알람](../assets/screenshots/app-d-step07-resend-bounce-spike-error.png)
*그림 D-7a. SPF 레코드 조정 후 propagation 지연.*
<!-- /SCREENSHOT -->

해결: SPF flat-include → ip4 로 단순화.

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-fix -->
![해결 — 24시간 후 반송률 0.5%로 회복](../assets/screenshots/app-d-step07-resend-bounce-spike-fix.png)
*그림 D-7b.*
<!-- /SCREENSHOT -->

---

## D.8 cron 잡 deadlock

<!-- SCREENSHOT: app-d-step08-cron-deadlock-error -->
![에러 — backup-daily 잡이 영원히 끝나지 않음](../assets/screenshots/app-d-step08-cron-deadlock-error.png)
*그림 D-8a. Redis 락이 풀리지 않은 채 컨테이너 OOM.*
<!-- /SCREENSHOT -->

해결: TTL 강제 + try/finally 정리.

<!-- SCREENSHOT: app-d-step08-cron-deadlock-fix -->
![해결 — 락 자동 해제 보장](../assets/screenshots/app-d-step08-cron-deadlock-fix.png)
*그림 D-8b.*
<!-- /SCREENSHOT -->

---

## D.9 Redis OOM

<!-- SCREENSHOT: app-d-step09-redis-oom-error -->
![에러 — OOM command not allowed when used memory > 'maxmemory'](../assets/screenshots/app-d-step09-redis-oom-error.png)
*그림 D-9a. nonce TTL 누락 누적.*
<!-- /SCREENSHOT -->

해결: maxmemory-policy allkeys-lru + nonce 모두 명시 EX.

<!-- SCREENSHOT: app-d-step09-redis-oom-fix -->
![해결 — 메모리 안정](../assets/screenshots/app-d-step09-redis-oom-fix.png)
*그림 D-9b.*
<!-- /SCREENSHOT -->

---

## D.10 drizzle migration 실패

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-error -->
![에러 — column "deleted_at" already exists](../assets/screenshots/app-d-step10-drizzle-migration-fail-error.png)
*그림 D-10a. 부분 실패 후 재시도.*
<!-- /SCREENSHOT -->

해결: 부분 실패 마이그레이션 idempotent 화 (IF NOT EXISTS).

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-fix -->
![해결 — 재실행 통과](../assets/screenshots/app-d-step10-drizzle-migration-fail-fix.png)
*그림 D-10b.*
<!-- /SCREENSHOT -->

---

## D.11 시계 드리프트

<!-- SCREENSHOT: app-d-step11-clock-drift-error -->
![에러 — JWT not valid yet (clock skew)](../assets/screenshots/app-d-step11-clock-drift-error.png)
*그림 D-11a. 호스트 ntp 미설정.*
<!-- /SCREENSHOT -->

해결: chrony 설치 + Cloudflare ntp 사용.

<!-- SCREENSHOT: app-d-step11-clock-drift-fix -->
![해결 — chronyc tracking 안정](../assets/screenshots/app-d-step11-clock-drift-fix.png)
*그림 D-11b.*
<!-- /SCREENSHOT -->

---

## D.12 테넌트 누수 의심

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-error -->
![에러 — 통합 테스트가 누수 가능성 시나리오 발견](../assets/screenshots/app-d-step12-tenant-leak-suspect-error.png)
*그림 D-12a. 새 라우트 추가 후 5장 테스트 누락.*
<!-- /SCREENSHOT -->

해결: 라우트 enum 자동 수집으로 새 라우트가 추가되면 테스트가 자동으로 늘어나도록.

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-fix -->
![해결 — 모든 라우트 누수 테스트 통과](../assets/screenshots/app-d-step12-tenant-leak-suspect-fix.png)
*그림 D-12b.*
<!-- /SCREENSHOT -->

---

## 캡처 체크리스트

각 사례마다 에러/해결 2장씩 = 24장.

- [ ] D.1 cloudflared 2장
- [ ] D.2 postgres 2장
- [ ] D.3 magic link 2장
- [ ] D.4 r2 presign 2장
- [ ] D.5 docx 2장
- [ ] D.6 pdf font 2장
- [ ] D.7 resend bounce 2장
- [ ] D.8 cron deadlock 2장
- [ ] D.9 redis oom 2장
- [ ] D.10 migration 2장
- [ ] D.11 clock drift 2장
- [ ] D.12 tenant leak 2장
