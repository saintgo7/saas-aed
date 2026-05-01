---
title: "Chapter 7. Multi-tenant Magic-Link Auth with Auth.js"
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

# Chapter 7. Multi-tenant Magic-Link Auth with Auth.js

## Learning Objectives

- Understand Auth.js v5 (NextAuth)'s four core callbacks: jwt, session, signIn, redirect
- Implement triple guards on the magic-link flow: nonce, expiry, single-use
- Decide where `session.user.tenantId` is determined and where it is verified
- Use middleware to automatically protect `/[tenantSlug]/...` routes
- Reckon with the operational trade-off of passwordless auth: email deliverability

## The Big Picture

We don't use passwords. Many inspectors are part-time outsourced staff for
whom password rotation is more risk than security. The standard is **email
magic links plus Auth.js v5**, and the heart of the implementation is one
line: getting `session.user.tenantId` exactly right.

<!-- SCREENSHOT: ch07-step01-auth-config-file -->
![Auth.js config — providers + adapter](../assets/screenshots/ch07-step01-auth-config-file.png)
*Figure 7-1. src/lib/auth/auth.ts. EmailProvider plus DrizzleAdapter is the two-line core.*
<!-- /SCREENSHOT -->

## 7.1 Magic-Link Flow

```
1. User enters email
2. Server creates a nonce, stores it in Redis with a 5-minute TTL
3. Resend sends a magic link (https://aed.example.kr/auth/callback?token=...)
4. User clicks → nonce verified → JWT issued → tenant resolved
5. Redirect to /tenantSlug/dashboard
```

<!-- SCREENSHOT: ch07-step03-magic-link-email -->
![Magic-link email — Resend + React Email rendering](../assets/screenshots/ch07-step03-magic-link-email.png)
*Figure 7-2. The actual email seen in Gmail. It states the 5-minute expiry, names the site, and includes a single safety line.*
<!-- /SCREENSHOT -->

## 7.2 Four Callbacks

### 7.2.1 jwt — embedding tenants on the token

```ts
async jwt({ token, user }) {
  if (user) {
    const memberships = await getUserTenants(user.id)
    token.tenants = memberships.map(m => ({ id: m.tenantId, role: m.role }))
  }
  return token
}
```

### 7.2.2 session — exposing to the client

```ts
async session({ session, token }) {
  session.user.tenants = token.tenants
  // The active tenantId itself is decided by the URL (chapter 5, layer 1)
  return session
}
```

<!-- SCREENSHOT: ch07-step02-auth-callbacks-tenant-id -->
![callbacks — injecting session.user.tenants](../assets/screenshots/ch07-step02-auth-callbacks-tenant-id.png)
*Figure 7-3. Authoring the callbacks in VS Code. The session carries an array of allowed tenants — the active one comes from the URL.*
<!-- /SCREENSHOT -->

## 7.3 Decoding the JWT

<!-- SCREENSHOT: ch07-step04-session-token-jwt-decoded -->
![Pasting the dev JWT into jwt.io to inspect the tenants array](../assets/screenshots/ch07-step04-session-token-jwt-decoded.png)
*Figure 7-4. A dev-build JWT inspected on jwt.io. Production should use JWE (encrypted JWT).*
<!-- /SCREENSHOT -->

## 7.4 Middleware — Protected Routes

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
![middleware.ts — combining layer 1 with auth](../assets/screenshots/ch07-step05-protected-route-middleware.png)
*Figure 7-5. The middleware cross-checks the URL's tenantSlug against the token's tenants list. On mismatch it returns 404, consistent with chapter 5's leak tests.*
<!-- /SCREENSHOT -->

## 7.5 Triple Guards on Magic Links

| Guard | Implementation |
|---|---|
| Single-use nonce | Redis `SETNX` plus `DEL` on use |
| 5-minute expiry | Redis `EX 300` |
| Click IP/UA verification | Send a confirmation email if these change |

## 7.6 Login Flow in Practice

<!-- SCREENSHOT: ch07-step06-login-flow-browser -->
![Browser walkthrough: enter email → "sent" → Gmail → dashboard](../assets/screenshots/ch07-step06-login-flow-browser.png)
*Figure 7-6. A four-pane Chrome capture. (1) Login screen, (2) "email sent" screen, (3) the magic link in Gmail, (4) the post-auth dashboard.*
<!-- /SCREENSHOT -->

<!-- TODO: Add measured email delivery time stats (P50/P95) -->

## 7.7 Trade-off — Email Deliverability

The real operational cost of magic links is deliverability. SPF/DKIM/DMARC,
Resend reputation, spam filter survival — fail any one and login fails.
Chapter 11 covers this.

## Summary

- Auth.js v5 + EmailProvider + DrizzleAdapter is the core of the SaaS's auth
- The active tenantId is set by the URL; the token holds an "allow list"
- The middleware combines URL × token verification, integrating naturally with chapter 5 layer 1
- Triple magic-link guards plus deliverability operations are the two pillars of stability

## Next Chapter

Next we cover the 12-item inspection form: auto-fill UX, mobile-first
layout, and the offline queue pattern.

## Capture Checklist

- [ ] `ch07-step01-auth-config-file.png`
- [ ] `ch07-step02-auth-callbacks-tenant-id.png`
- [ ] `ch07-step03-magic-link-email.png`
- [ ] `ch07-step04-session-token-jwt-decoded.png`
- [ ] `ch07-step05-protected-route-middleware.png`
- [ ] `ch07-step06-login-flow-browser.png`
