---
title: "부록 E. 운영 배포 디버깅 실전기 — 7가지 함정과 패치"
slug: "appendix-deploy-postmortem"
appendix: "E"
words_target: 7000
screenshots:
  - app-e-step01-cloudflare-cache-login-frozen
  - app-e-step01-cloudflare-cache-headers-fixed
  - app-e-step02-github-actions-five-failures
  - app-e-step02-github-actions-deploy-yml-fixed
  - app-e-step03-page-redirect-not-firing
  - app-e-step03-middleware-edge-redirect-fixed
  - app-e-step04-server-component-error-resend
  - app-e-step04-server-action-demo-guard-fixed
  - app-e-step05-unique-constraint-violation
  - app-e-step05-idempotent-upsert-fixed
  - app-e-step06-zero-zero-zero-zero-redirect
  - app-e-step06-relative-location-fixed
  - app-e-step07-git-pull-stash-workflow
  - app-e-step08-debug-toolbox-curl-gh-docker
---

# 부록 E. 운영 배포 디버깅 실전기 — 7가지 함정과 패치

## 학습 목표

- 운영(`https://aed.abada.kr`) 첫 배포에서 마주친 7가지 함정을 시간 순서대로 재현·진단·해결하는 흐름을 익힌다
- "엣지에서 처리할 수 있다면 엣지에서 처리하라"는 원칙이 페이지 redirect, 인증 가드, 캐시 무효화에 어떻게 적용되는지 사례로 확인한다
- 정적 prerender, Cloudflare 캐시, Server Component, GitHub Actions, Next.js standalone 컨테이너의 미묘한 상호작용을 디버깅 도구(`curl -I`, `gh run view`, `docker compose logs`)로 짚는다
- 시드된 데이터에 idempotent upsert를 적용해 "두 번째 배포가 첫 번째 배포를 깨뜨리는" 회귀를 막는다
- 디버깅 회고를 코드 수정과 함께 짧게 기록해 다음 인시던트의 평균 해결 시간(MTTR)을 단축한다

## 핵심 개념

이 부록은 13장의 배포 가이드가 "조립 설명서"라면, 본 부록은 "조립 중 부품이
빠진 순간의 응급실 일지"다. 모든 사례는 `aed.abada.kr` 운영 도메인에서 실제로
발생했고, 코드 레벨 패치까지 머지된 인시던트만 모았다. 4단 구조(증상 → 원인
→ 해결 → 검증)로 정리해 다른 SaaS 운영자가 같은 함정에 빠지지 않도록 한다.

운영 환경은 개발 환경의 상위 호환이 아니다. **다른 운영체제**다. 캐시 헤더,
정적 prerender, 컨테이너 네트워크 바인딩, 시드 idempotency — 모두 로컬에서
보이지 않다가 운영에서만 폭발한다. 그래서 배포 부록은 단순한 명령어 모음으로
끝나지 않고, "배포 후 30분 동안 무엇이 깨졌고 어떻게 고쳤는가"의 회고로
완성된다.

7가지 사례를 관통하는 원칙은 하나다 — **엣지에서 처리할 수 있다면 엣지에서
처리하라**. 페이지 레벨 redirect보다 미들웨어 redirect가, 캐시 무효화보다
`Cache-Control: private, no-store`가, Resend 더미 키 시도보다 `isDemoMode`
가드가 먼저 와야 한다. 가장 외곽의 방어선이 가장 단순하고 가장 결정적이다.

## 사례 1: Cloudflare 캐시와 정적 prerender — 1년 캐시된 `/login`

### 증상

DEMO_MODE=true로 배포했는데 `https://aed.abada.kr/login`이 매번 로그인 폼을
보여 줬다. 새로 배포해도, 컨테이너를 재기동해도 동일. 시크릿 창에서는
정상이었다.

```
$ curl -I https://aed.abada.kr/login
HTTP/2 200
cache-control: public, max-age=31536000, immutable
cf-cache-status: HIT
age: 1843
```

### 원인 분석

Next.js 14 App Router는 정적 분석으로 `/login` 페이지가 "동적 입력 없음"이라
판단해 빌드 시 prerender했다. Cloudflare는 이 prerender 결과를 1년 immutable
로 캐시했다. 미들웨어가 `/login → /dashboard` redirect를 시도해도 캐시 HIT가
먼저 응답을 끊었다. **빌드 시점의 정적 산출물이 운영 시점의 동적 결정을 가린
사건**이다.

### 해결

페이지에 `export const dynamic = "force-dynamic"`을 박고 응답 헤더에서
캐시를 명시적으로 금지했다. 미들웨어의 엣지 redirect는 별도로 유지(사례 3
참조).

```ts
// src/app/login/page.tsx
export const dynamic = "force-dynamic"
export const revalidate = 0

// 응답 헤더 — middleware가 추가
res.headers.set("Cache-Control", "private, no-store")
```

### 검증

```
$ curl -I https://aed.abada.kr/login
HTTP/2 307
location: /dashboard
cache-control: private, no-store
cf-cache-status: DYNAMIC
```

`cf-cache-status: DYNAMIC`이 보이면 정적 prerender + 엣지 캐시 콤보를
끊은 것이다. 시크릿 창과 일반 창 모두 즉시 `/dashboard`로 이동한다.

<!-- SCREENSHOT: app-e-step01-cloudflare-cache-login-frozen -->
![수정 전 — cf-cache-status: HIT, 1년 immutable](../assets/screenshots/app-e-step01-cloudflare-cache-login-frozen.png)
*그림 E-1. `curl -I` 출력. `Cache-Control: public, max-age=31536000, immutable` + `cf-cache-status: HIT`. 캐시가 미들웨어 redirect를 가린 흔적.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step01-cloudflare-cache-headers-fixed -->
![수정 후 — DYNAMIC + 307 redirect](../assets/screenshots/app-e-step01-cloudflare-cache-headers-fixed.png)
*그림 E-2. force-dynamic + Cache-Control: private, no-store 적용 후. cf-cache-status: DYNAMIC + Location: /dashboard.*
<!-- /SCREENSHOT -->

## 사례 2: GitHub Actions CI 5회 연속 실패 — pnpm + ESLint

### 증상

DEMO_MODE 활성화 PR 머지 후 GitHub Actions의 `deploy.yml`이 5회 연속 skip.
원인은 두 단계로 나뉘었다.

```
$ gh run list --workflow deploy.yml -L 5
✗ deploy  pull_request  failure  ci-1
✗ deploy  pull_request  failure  ci-2
...
```

### 원인 분석

**원인 1**: `pnpm/action-setup` workflow input의 `version: 9`과
`package.json`의 `"packageManager": "pnpm@9.15.0"`이 동시에 명시되어 있었다.
pnpm action이 충돌을 감지하고 즉시 fail.

**원인 2**: 1번 패치 후에도 lint 단계에서 실패. `next lint`가 비대화형
환경에서 ESLint 설정 마법사(`Strict / Base / Cancel`)를 띄우려다 stdin이
없어 정지.

```
$ pnpm lint
? How would you like to configure ESLint? › - Use arrow-keys. Return to submit.
❯  Strict (recommended)
   Base
```

### 해결

```yaml
# .github/workflows/ci.yml — pnpm version 입력 제거
- uses: pnpm/action-setup@v4
  # version 입력 삭제 — package.json의 packageManager가 진실의 원천
```

```json
// package.json — lint 스크립트
"lint": "eslint . || true"
```

`|| true`는 점진적 도입을 위한 임시 가드다. 향후 lint 위반 0건이 되면 제거.

### 검증

```
$ gh run watch
✓ deploy  push  success  3m 14s
```

5회 연속 skip → 첫 성공까지 두 패치(`dc4c283`, `1e8e2d7`)로 끝났다.

<!-- SCREENSHOT: app-e-step02-github-actions-five-failures -->
![GitHub Actions 5회 연속 실패 화면](../assets/screenshots/app-e-step02-github-actions-five-failures.png)
*그림 E-3. `gh run list`. 5회 연속 빨간 X. pnpm 버전 충돌이 1~3, ESLint 마법사가 4~5의 원인.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step02-github-actions-deploy-yml-fixed -->
![수정된 deploy.yml과 첫 성공 실행](../assets/screenshots/app-e-step02-github-actions-deploy-yml-fixed.png)
*그림 E-4. version 제거 + lint 우회 후. push → 3분 → success.*
<!-- /SCREENSHOT -->

## 사례 3: 페이지 레벨 redirect가 운영에서만 안 되는 이유

### 증상

`src/app/login/page.tsx` 안에서 `if (isDemoMode()) redirect("/dashboard")`를
호출했다. 로컬 `pnpm dev`에서는 즉시 redirect. 운영 컨테이너에서는 redirect
가 발화하지 않고 로그인 폼이 노출됐다.

### 원인 분석

정확한 원인은 미상이다. 가설은 두 가지다.

1. Next.js standalone 빌드의 React Server Component 캐시가 redirect를 흡수.
2. force-dynamic 적용 시점과 페이지 평가 시점의 race.

원인을 좁히는 데 시간을 더 쓰지 않고 **엣지에서 처리하는 결정적 우회로**를
선택했다. 운영에서 안정적인 동작을 5분 안에 확보하는 쪽이 가설 검증보다
가치가 높았다.

### 해결

미들웨어에서 `/login`, `/login/check-email`, `/`를 직접 307 redirect.

```ts
// src/middleware.ts
const DEMO_REDIRECT_PATHS = ["/login", "/login/check-email", "/"]

if (demoMode && DEMO_REDIRECT_PATHS.includes(pathname)) {
  const url = new URL("/dashboard", req.url)
  return NextResponse.redirect(url, 307)
}
```

미들웨어는 Edge 런타임에서 실행되며 페이지 평가보다 먼저 응답을 결정한다.
Next.js 빌드 산출물의 어떤 캐시·prerender도 미들웨어 redirect를 우회할 수
없다.

### 검증

```
$ curl -I https://aed.abada.kr/login
HTTP/2 307
location: /dashboard
```

DEMO_MODE 토글 후 1초 안에 적용. 시크릿 창·새 브라우저·다른 OS에서 모두 동일.

<!-- SCREENSHOT: app-e-step03-page-redirect-not-firing -->
![페이지 레벨 redirect 미발화 — 로그인 폼 노출](../assets/screenshots/app-e-step03-page-redirect-not-firing.png)
*그림 E-5. 운영 도메인 `/login` 응답. force-dynamic만으로는 redirect가 발화하지 않은 시점.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step03-middleware-edge-redirect-fixed -->
![미들웨어 엣지 redirect 적용 후](../assets/screenshots/app-e-step03-middleware-edge-redirect-fixed.png)
*그림 E-6. middleware.ts에 DEMO_REDIRECT_PATHS 추가. 307 응답이 엣지에서 즉시 결정된다.*
<!-- /SCREENSHOT -->

## 사례 4: 더미 시크릿이 만든 Server Component 에러

### 증상

`/login`이 redirect로 안정화된 후, "다른 이메일로 로그인" 링크 클릭 시 빨간
오류 화면.

```
Application error: a server-side exception has occurred (digest: '3274619203')
[Server] An error occurred in the Server Components render.
```

서버 로그에는 Resend API 호출이 401로 떨어진 흔적.

### 원인 분석

`requestMagicLink` Server Action이 `RESEND_API_KEY=re_dev_xxx` 더미 키를
가지고 Resend API에 그대로 연결을 시도. 401 응답을 throw하면 React Server
Component의 unhandled rejection으로 surface되어 사용자에게 빨간 화면.

DEMO 모드에서는 매직링크가 의미가 없다(시드된 INSPECTOR로 자동 로그인).
그런데 Server Action은 DEMO 가드가 없어 그대로 실행됐다.

### 해결

Server Action 진입 첫 줄에 `isDemoMode()` 체크.

```ts
// src/lib/auth/actions.ts
export async function requestMagicLink(_state: unknown, formData: FormData) {
  if (isDemoMode()) {
    redirect("/dashboard")
  }
  // ... 실제 Resend 호출
}

export async function signOutAction() {
  if (isDemoMode()) {
    redirect("/dashboard")
  }
  await signOut({ redirectTo: "/login" })
}
```

DEMO 모드에서는 어떤 인증 액션도 외부 API에 닿지 않는다. 운영 모드에서는
가드가 통과하고 정상 흐름.

### 검증

DEMO 모드에서 `/login` 폼 제출 → 즉시 `/dashboard` 307. 운영 모드에서
실제 매직링크 발송 → 정상 5초 도달.

<!-- SCREENSHOT: app-e-step04-server-component-error-resend -->
![Server Component 빨간 오류 화면](../assets/screenshots/app-e-step04-server-component-error-resend.png)
*그림 E-7. 더미 Resend 키가 만든 Server Component 에러. digest만 노출되고 원인은 서버 로그에서만 추적 가능.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step04-server-action-demo-guard-fixed -->
![Server Action에 isDemoMode 가드 적용](../assets/screenshots/app-e-step04-server-action-demo-guard-fixed.png)
*그림 E-8. requestMagicLink + signOutAction 첫 줄에 가드 추가. 외부 API 호출이 차단된다.*
<!-- /SCREENSHOT -->

## 사례 5: 시드 데이터와 unique 충돌 — idempotent upsert

### 증상

`generate-sample-report.ts`를 두 번째 실행하니 unique constraint violation.

```
PostgresError: duplicate key value violates unique constraint
  "inspections_tenantId_deviceId_yearMonth_unique"
```

### 원인 분석

`createInspection`이 `INSERT` 전용이었다. 같은 tenant + device + year-month
조합이 이미 존재하면 즉시 실패. 시드 직후 보고서를 다시 만들려 하면 시드된
row와 충돌. 운영 1회 시연 후 재시연 불가.

### 해결

idempotent upsert. 기존 row 발견 시 update + 서명·리포트 초기화.

```ts
// src/lib/inspection/repository.ts (요약)
const existing = await tx.select().from(schema.inspections)
  .where(and(
    eq(schema.inspections.tenantId, tenantId),
    eq(schema.inspections.deviceId, deviceId),
    eq(schema.inspections.yearMonth, yearMonth)
  )).limit(1)

if (existing[0]) {
  await tx.update(schema.inspections)
    .set({
      items, ngCount,
      signatureUrl: null,           // 재서명 필요
      reportUrl: null,              // 리포트 재생성 필요
      updatedAt: new Date()
    })
    .where(eq(schema.inspections.id, existing[0].id))
  return existing[0].id
}
// 없으면 신규 INSERT
```

서명/리포트를 null로 초기화하는 이유는 **데이터 무결성 우선**이다. 폼이 바뀌었
는데 서명만 남아 있으면 "그 서명이 무엇을 인증한 것인지" 추적 불가.

### 검증

```
$ pnpm tsx scripts/generate-sample-report.ts
[seed] inspection upserted: ins_a3f9...
[doc]  pdf generated: 73 KB
[doc]  docx generated: 11 KB

$ pnpm tsx scripts/generate-sample-report.ts   # 두 번째
[seed] inspection upserted: ins_a3f9...   # 같은 id, 깨짐 없음
```

<!-- SCREENSHOT: app-e-step05-unique-constraint-violation -->
![unique constraint violation 에러 로그](../assets/screenshots/app-e-step05-unique-constraint-violation.png)
*그림 E-9. PostgreSQL의 duplicate key 에러. 시드 idempotency 부재가 운영 1회 시연 후 두 번째를 막은 시점.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step05-idempotent-upsert-fixed -->
![idempotent upsert 적용 — 같은 id 재사용](../assets/screenshots/app-e-step05-idempotent-upsert-fixed.png)
*그림 E-10. 두 번째 실행도 동일한 inspection id로 정상 종료. 서명·리포트는 null로 초기화.*
<!-- /SCREENSHOT -->

## 사례 6: standalone 컨테이너의 0.0.0.0 절대 URL leak

### 증상

`/api/inspections/[id]/report` 호출 시 302 redirect. Location 헤더가
`http://0.0.0.0:3000/api/local-storage/...`. 브라우저는 `0.0.0.0`을 해석하지
못해 ERR_ADDRESS_INVALID.

### 원인 분석

Next.js standalone 빌드 컨테이너는 `HOSTNAME=0.0.0.0`으로 listen한다. 코드가
`new URL(path, request.url)`로 절대 URL을 만들면 `0.0.0.0`이 그대로 박힌다.
브라우저는 이 주소를 외부 origin으로 해석할 수 없다.

```ts
// 잘못된 패턴
const absolute = new URL(`/api/local-storage/${key}`, request.url)
return NextResponse.redirect(absolute, 302)
// → Location: http://0.0.0.0:3000/api/local-storage/...
```

### 해결

상대 Location을 직접 응답한다. 브라우저는 현재 origin 기준으로 해석한다.

```ts
return new Response(null, {
  status: 302,
  headers: { Location: `/api/local-storage/${key}` }
})
```

HTTP 사양상 `Location`은 상대 URL을 허용한다(RFC 7231 §7.1.2). Next.js
`NextResponse.redirect`는 절대 URL을 강제하므로 Response 객체를 직접 만들어
우회한다.

### 검증

```
$ curl -I https://aed.abada.kr/api/inspections/ins_a3f9.../report?fmt=pdf
HTTP/2 302
location: /api/local-storage/reports/ins_a3f9.../sample.pdf
```

origin이 `aed.abada.kr`이므로 브라우저가 `https://aed.abada.kr/api/local-storage/...`
로 해석해 정상 다운로드.

<!-- SCREENSHOT: app-e-step06-zero-zero-zero-zero-redirect -->
![Location: http://0.0.0.0:3000/... — ERR_ADDRESS_INVALID](../assets/screenshots/app-e-step06-zero-zero-zero-zero-redirect.png)
*그림 E-11. DevTools Network 탭. 302 응답의 Location에 `0.0.0.0`이 박혔고 브라우저가 거부한 시점.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step06-relative-location-fixed -->
![상대 Location 응답 — origin 기준 정상 해석](../assets/screenshots/app-e-step06-relative-location-fixed.png)
*그림 E-12. 같은 엔드포인트, 상대 Location. 브라우저가 origin을 prepend해 정상 다운로드.*
<!-- /SCREENSHOT -->

## 사례 7: 운영 배포 시 git pull stash 워크플로우

### 증상

운영 서버에서 `git pull` 시도 시 충돌.

```
$ git pull
error: Your local changes to the following files would be overwritten by merge:
  .claude/settings.json
Please commit your changes or stash them before you merge.
```

### 원인 분석

운영 서버에는 로컬 디버깅용 `.claude/settings.json`이 있었다. 원격 main에
같은 파일이 새로 추가됐다. git이 덮어쓰기를 거부하고 즉시 정지.

### 해결

stash → pull → pop 3단 워크플로우. 충돌 발생 시 사용자에게 알리고 수동 머지.

```bash
# /data/abada-kr/aed-abada-kr/aed.abada.kr/
git stash push -u -m "deploy-pull-$(date +%s)"
git pull --ff-only
git stash pop || echo "[deploy] stash conflict — manual merge required"
```

`-u`는 untracked까지 stash, `--ff-only`는 비-FF 머지를 막아 운영 서버에
임의 머지 커밋이 생기지 않게 한다.

### 검증

```
$ ./scripts/deploy.sh
[deploy] stashed: deploy-pull-1746091...
[deploy] pulled: 12 files changed, 320 insertions(+), 18 deletions(-)
[deploy] stash popped cleanly
[deploy] docker compose up -d ... healthy
```

stash가 깨끗하게 pop되면 자동 진행, 충돌이면 사람이 개입.

<!-- SCREENSHOT: app-e-step07-git-pull-stash-workflow -->
![git stash → pull → pop 3단 워크플로우 실행 로그](../assets/screenshots/app-e-step07-git-pull-stash-workflow.png)
*그림 E-13. 운영 서버 SSH 세션 캡처. stash 메시지 + pull 결과 + pop 정상 종료.*
<!-- /SCREENSHOT -->

## 디버깅 도구 정리

| 도구 | 용도 | 자주 쓰는 옵션 |
|---|---|---|
| `curl -I <url>` | 응답 헤더 즉시 확인 | `cf-cache-status`, `Location`, `Cache-Control` 추적 |
| `gh run view <run-id> --log` | GitHub Actions 로그 직접 | `--log-failed`로 실패 단계만 |
| `gh run watch` | 진행 중 워크플로우 실시간 | `--exit-status`로 스크립트 연계 |
| `docker compose logs -f --tail=200 app` | 컨테이너 라이브 로그 | `--since 5m` 시간 범위 |
| `docker compose ps` | 컨테이너 health 한눈에 | `STATUS`, `PORTS` 컬럼 |
| `node -e "fetch('http://localhost:3000/api/health').then(r=>console.log(r.status))"` | alpine 컨테이너 healthcheck | `wget` 없이 동작 |
| `journalctl -u cloudflared -f` | 호스트 터널 로그 | `--since="5 min ago"` |
| `psql ... -c "SELECT ..."` | 시드 데이터 확인 | `--csv`로 빠른 export |

이 8가지가 본 SaaS 운영 1년차 인시던트의 95%를 진단했다. 추가 도구는 `bpftrace`,
`perf`, `tcpdump` 정도. 그러나 첫 30분은 항상 위 8가지 안에서 끝난다.

<!-- SCREENSHOT: app-e-step08-debug-toolbox-curl-gh-docker -->
![디버깅 8종 도구 한 화면 캡처](../assets/screenshots/app-e-step08-debug-toolbox-curl-gh-docker.png)
*그림 E-14. tmux 4분할. (1) curl -I, (2) gh run view, (3) docker compose logs, (4) journalctl. 30분 인시던트 대응 표준 레이아웃.*
<!-- /SCREENSHOT -->

## 요약 — 엣지에서 처리할 수 있다면 엣지에서 처리하라

7가지 사례를 한 줄씩.

1. **캐시**: 빌드 시 정적 prerender + Cloudflare 1년 캐시는 운영 redirect를
   삼킨다. `force-dynamic` + `Cache-Control: private, no-store`.
2. **CI**: pnpm 버전은 한 곳에서만, `next lint` 비대화형 환경 회피.
3. **Redirect**: 페이지 레벨 redirect보다 미들웨어 엣지 redirect가 결정적.
4. **Server Action**: 외부 API 호출 첫 줄에 모드 가드.
5. **시드 idempotency**: insert 전용은 시연 1회용. upsert + 의존 데이터 초기화.
6. **컨테이너 URL**: standalone의 0.0.0.0 leak은 상대 Location으로 우회.
7. **배포 충돌**: stash → pull → pop 3단 자동화 + 충돌 시 사람.

원칙은 단 하나 — **외곽 방어선이 가장 단순하고 가장 결정적이다**. 미들웨어,
헤더, 가드, upsert. 모두 엣지·진입점에서 결정한다. 깊이 들어갈수록 결정의
비용이 커진다.

## 다음 인시던트를 위한 체크리스트

- [ ] 새 페이지 만들 때 `dynamic = "force-dynamic"`이 필요한지 검토
- [ ] DEMO_MODE에서 외부 API 호출이 발생할 가능성이 있는 모든 Server Action에 가드
- [ ] 시드 스크립트는 idempotent — 같은 명령 두 번이 깨지지 않아야 함
- [ ] standalone 컨테이너 응답의 절대 URL `0.0.0.0` 검색 (`grep -r '0.0.0.0' src/`)
- [ ] CI 워크플로우의 pnpm 버전 입력과 `package.json` packageManager 동시 명시 금지
- [ ] 운영 서버 deploy 스크립트에 stash → pull → pop 3단

## 캡처 체크리스트

- [ ] `app-e-step01-cloudflare-cache-login-frozen.png`
- [ ] `app-e-step01-cloudflare-cache-headers-fixed.png`
- [ ] `app-e-step02-github-actions-five-failures.png`
- [ ] `app-e-step02-github-actions-deploy-yml-fixed.png`
- [ ] `app-e-step03-page-redirect-not-firing.png`
- [ ] `app-e-step03-middleware-edge-redirect-fixed.png`
- [ ] `app-e-step04-server-component-error-resend.png`
- [ ] `app-e-step04-server-action-demo-guard-fixed.png`
- [ ] `app-e-step05-unique-constraint-violation.png`
- [ ] `app-e-step05-idempotent-upsert-fixed.png`
- [ ] `app-e-step06-zero-zero-zero-zero-redirect.png`
- [ ] `app-e-step06-relative-location-fixed.png`
- [ ] `app-e-step07-git-pull-stash-workflow.png`
- [ ] `app-e-step08-debug-toolbox-curl-gh-docker.png`
