---
title: "7장. Auth.js 매직링크 다기관 인증"
slug: "auth"
chapter: 7
words_target: 4000
screenshots:
  - ch07-step01-auth-config-file
  - ch07-step02-auth-callbacks-tenant-id
  - ch07-step03-magic-link-email
  - ch07-step04-session-token-jwt-decoded
  - ch07-step05-protected-route-middleware
  - ch07-step06-login-flow-browser
---

# 7장. Auth.js 매직링크 다기관 인증

## 학습 목표

- Auth.js v5 (NextAuth) 의 핵심 콜백 4종(jwt/session/signIn/redirect)을 이해한다
- 매직링크 흐름의 nonce·만료·재사용 방지 3중 가드를 구현한다
- `session.user.tenantId` 를 어디서 결정하고, 어디서 검증하는지 명확히 한다
- 미들웨어로 `/[tenantSlug]/...` 보호 라우트를 자동 차단한다
- 비밀번호 없는 인증의 운영 트레이드오프(이메일 도달성)를 정리한다

## 핵심 개념

본 SaaS 는 비밀번호를 사용하지 않는다. 점검자 다수가 일회성 위탁 인력이라
비밀번호 관리 부담이 너무 크기 때문이다. **이메일 매직링크 + Auth.js v5** 가
표준이고, 핵심은 한 줄 — `session.user.tenantId` — 를 정확히 박는 것이다.

<!-- SCREENSHOT: ch07-step01-auth-config-file -->
![Auth.js 설정 파일 — providers + adapter](../assets/screenshots/ch07-step01-auth-config-file.png)
*그림 7-1. src/lib/auth/auth.ts. EmailProvider + DrizzleAdapter 가 핵심 두 줄.*
<!-- /SCREENSHOT -->

## 7.1 매직링크 흐름

```
1. 사용자가 이메일 입력
2. 서버가 nonce 생성, redis 에 5분 TTL 저장
3. Resend 로 매직링크 이메일 발송 (https://aed.example.kr/auth/callback?token=...)
4. 사용자가 링크 클릭 → nonce 검증 → JWT 발급 → tenant 결정
5. /tenantSlug/dashboard 로 리다이렉트
```

<!-- SCREENSHOT: ch07-step03-magic-link-email -->
![매직링크 이메일 — Resend + React Email 템플릿 결과](../assets/screenshots/ch07-step03-magic-link-email.png)
*그림 7-2. 실제 수신함 (Gmail) 에서 본 매직링크 이메일. 5분 TTL 명시 + 시설명 표시 + 안전 안내 1줄.*
<!-- /SCREENSHOT -->

## 7.2 콜백 4종

### 7.2.1 jwt 콜백 — 토큰에 tenantId 박기

```ts
async jwt({ token, user }) {
  if (user) {
    const memberships = await getUserTenants(user.id)
    token.tenants = memberships.map(m => ({ id: m.tenantId, role: m.role }))
  }
  return token
}
```

### 7.2.2 session 콜백 — 클라이언트로 노출

```ts
async session({ session, token }) {
  session.user.tenants = token.tenants
  // tenantId 자체는 URL slug 가 결정 (5장 1계층)
  return session
}
```

<!-- SCREENSHOT: ch07-step02-auth-callbacks-tenant-id -->
![Auth.js callbacks — session.user.tenants 주입](../assets/screenshots/ch07-step02-auth-callbacks-tenant-id.png)
*그림 7-3. callbacks 정의 시점 VS Code 화면. session 안에는 tenants 배열만 들어간다 — 활성 tenantId 는 URL 이 결정한다.*
<!-- /SCREENSHOT -->

## 7.3 JWT 토큰 디코드

<!-- SCREENSHOT: ch07-step04-session-token-jwt-decoded -->
![jwt.io 에 붙여 본 세션 토큰 — tenants 배열 확인](../assets/screenshots/ch07-step04-session-token-jwt-decoded.png)
*그림 7-4. 개발 빌드의 JWT 를 jwt.io 에 붙여 봤을 때. 운영 빌드는 jwe(암호화) 사용 권장.*
<!-- /SCREENSHOT -->

## 7.4 미들웨어 — 보호 라우트

```ts
// middleware.ts
export default auth((req) => {
  if (!req.auth) return Response.redirect(new URL("/login", req.url))
  const slug = req.nextUrl.pathname.split("/")[1]
  const allowed = req.auth.user.tenants.some(t => t.id === slug)
  if (!allowed) return new Response("Not Found", { status: 404 })
})
```

<!-- SCREENSHOT: ch07-step05-protected-route-middleware -->
![middleware.ts — 1계층 + 인증 결합 가드](../assets/screenshots/ch07-step05-protected-route-middleware.png)
*그림 7-5. 미들웨어가 URL 의 tenantSlug 와 토큰의 tenants 배열을 교차 검증. 불일치 시 404 (5장 누수 테스트와 일관).*
<!-- /SCREENSHOT -->

## 7.5 매직링크 보안 3중 가드

| 가드 | 구현 |
|---|---|
| nonce 단일 사용 | redis `SETNX` + 사용 즉시 `DEL` |
| 만료 5분 | redis `EX 300` |
| 클릭 IP/UA 검증 | 발송 시점과 다르면 추가 확인 메일 발송 |

## 7.6 로그인 흐름 실측

<!-- SCREENSHOT: ch07-step06-login-flow-browser -->
![브라우저에서 본 로그인 흐름 — 이메일 입력 → 메일 → 클릭 → 대시보드](../assets/screenshots/ch07-step06-login-flow-browser.png)
*그림 7-6. Chrome 4분할 캡처. (1) 로그인 화면, (2) "메일 발송됨" 화면, (3) Gmail 의 매직링크, (4) 인증 후 대시보드.*
<!-- /SCREENSHOT -->

<!-- TODO: 실제 운영에서 측정한 메일 도달 시간 통계 추가 (P50/P95) -->

## 7.7 트레이드오프 — 이메일 도달성

매직링크의 진짜 운영 비용은 메일 도달성이다. SPF/DKIM/DMARC 셋업, Resend 평판
관리, 스팸 필터 회피 — 이것이 실패하면 로그인이 실패한다. 11장에서 자세히 다룬다.

## 요약

- Auth.js v5 + EmailProvider + DrizzleAdapter 가 본 SaaS 인증 코어
- 활성 tenantId 는 URL 이 결정, 토큰은 "허용 목록"만 갖는다
- 미들웨어가 URL × 토큰 교차 검증으로 5장 1계층과 자연스럽게 결합
- 매직링크 보안 3중 가드 + 이메일 도달성 운영이 안정성의 두 축

## 다음 장 미리보기

다음 장에서는 12항목 점검 폼의 자동기재 UX, 모바일 우선 레이아웃, 오프라인
큐잉 패턴을 차례로 살펴본다.

## 캡처 체크리스트

- [ ] `ch07-step01-auth-config-file.png`
- [ ] `ch07-step02-auth-callbacks-tenant-id.png`
- [ ] `ch07-step03-magic-link-email.png`
- [ ] `ch07-step04-session-token-jwt-decoded.png`
- [ ] `ch07-step05-protected-route-middleware.png`
- [ ] `ch07-step06-login-flow-browser.png`
