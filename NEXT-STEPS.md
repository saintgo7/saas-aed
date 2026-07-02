<!-- P1 우선순위 수정 계획 — saas-aed (AED 점검 관리 SaaS) 프로덕션 안전 점검 산출물 -->
# NEXT-STEPS — saas-aed

> 생성: 2026-07-02 · P1 프로덕션 안전 점검 (production aed.abada.kr).
> 현재 브랜치 `claude/maxburn-audit2-2026-06-14`. 이 문서는 검증된 사실만 기재한다.

## 현재 건강 상태 (검증됨)

- `pnpm test` (vitest) — **42/42 통과** (6개 파일: signature, storage, inspection items, documents i18n, tenant, admin-roles).
- `pnpm typecheck` (`tsc --noEmit`) — **에러 0, exit 0**.
- App Router 구조가 실제로 구현되어 있다: `(auth)/login`, `(app)/dashboard·devices·inspections·history·admin·hq`, API 라우트(`health`, `devices`, `inspections/[id]/report`, `hq/departments/[code]/export`, `local-storage/[...key]`).
- 외부 서비스 어댑터는 실제 구현 + 폴백 이중 구성이다(모의 전용 아님).
  - Email `src/lib/email/index.ts`: `resend.ts`(실제) / `console.ts`(DEMO·키 없음 시 폴백). 선택은 `DEMO_MODE`/`EMAIL_DRIVER`/`RESEND_API_KEY` 기준.
  - Storage `src/lib/storage/index.ts`: `r2.ts`(실제) / `local.ts`(DEMO·`R2_ACCOUNT_ID` 없음 시 폴백).

결론: 코드 레벨 P1 결함은 낮다. 남은 P1은 대부분 **배포/시크릿/브랜치 통합** 영역으로, 프로덕션 안전 규칙상 소유자 승인 후 진행해야 한다.

## 적용된 안전 수정 (이번 패스)

1. `tsconfig.tsbuildinfo`를 git 추적에서 제거(`git rm --cached`)하고 `.gitignore`에 `*.tsbuildinfo` 추가.
   - 근본 원인: TypeScript 증분 빌드 캐시가 커밋되어 있어 `typecheck`/빌드 때마다 워킹 트리가 계속 dirty로 남았다(매 실행마다 `M tsconfig.tsbuildinfo`). 런타임 영향 없는 순수 아티팩트라 추적 해제가 자명하게 안전하다.

## 남은 P1 작업 (우선순위)

### P1-A. 브랜치 통합 (heldForReview — push/merge 금지 규칙)
- `claude/maxburn-audit2-2026-06-14`가 `origin/main`보다 5커밋 앞서 있다(storage 하드닝, notifications, path-traversal 차단, i18n Link, graphify). 보안 하드닝 커밋을 포함하므로 **소유자 확인 후 main 병합 + 배포**가 필요하다. 자동 push/deploy는 규칙상 금지 — 여기 기록만 한다.

### P1-B. 프로덕션 실연 검증 (heldForReview — 시크릿/DB/네트워크 필요)
- 테스트는 단위 레벨만 커버한다. 실제 통합 경로(Postgres 마이그레이션 적용, Resend 발송, R2 업로드, Cloudflare 터널 `10370→3000` 헬스)는 실환경에서 스모크 미검증이다.
- 실행 절차는 `CLAUDE.md`의 "Production ops (abada-65)" 섹션 참조: `curl -I http://127.0.0.1:10370/api/health`, `curl -I https://aed.abada.kr/api/health`.
- 이 항목들은 `.env`/시크릿·DB·배포를 건드리므로 P1 패스 범위 밖(소유자 실행).

### P1-C. E2E 확인 (안전, 소유자 로컬)
- `pnpm test:e2e`(Playwright)와 `pnpm e2e:flow`(`scripts/e2e-inspection-flow.ts`)는 이번 패스에서 미실행(브라우저·DB 부팅 필요). 로컬 dev 스택 부팅 후 실행 권장 — 12항목 입력 → 서명 → DOCX/PDF → 발송 플로우 회귀 확인.

## 참고 (동작 영향 없음)
- `src/lib/db/index.ts`의 "placeholder DATABASE_URL" 경고는 의도된 개발 편의(런타임 실제 env 필수). 수정 불필요.
- 코드 내 다수 `placeholder=`는 UI input 힌트 텍스트로 결함 아님.
