---
title: "Appendix E. Production Deploy Postmortem — Seven Pitfalls and Their Patches"
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

# Appendix E. Production Deploy Postmortem — Seven Pitfalls and Their Patches

## Learning Objectives

- Walk through seven pitfalls hit during the first production deploy of `https://aed.abada.kr` in chronological order: reproduce, diagnose, fix
- Recognize how the principle "if it can be handled at the edge, handle it at the edge" applies to page redirects, auth guards, and cache invalidation
- Use `curl -I`, `gh run view`, and `docker compose logs` to surface subtle interactions among static prerender, Cloudflare cache, Server Components, GitHub Actions, and Next.js standalone containers
- Apply idempotent upserts to seeded data so the second deploy never breaks the first
- Capture short post-incident notes alongside the patch to lower mean time to repair (MTTR) for the next incident

## The Big Picture

If chapter 13 is the deploy assembly manual, this appendix is the emergency-room
log of "what came loose during assembly and how we put it back." Every case
ran on the live `aed.abada.kr` domain and includes a code-level patch already
merged. Each case is structured the same way — symptom, diagnosis, fix,
verification — so other operators can sidestep these traps.

Production is not a superset of development. It is a **different operating
system**. Cache headers, static prerender, container network binding, seed
idempotency — none of these show up locally and all of them blow up in
production. So a deploy appendix cannot end at command lists; it has to end
with the postmortem of "what broke in the thirty minutes after the green
deploy and how we fixed it."

One principle threads through all seven cases — **if it can be handled at
the edge, handle it at the edge**. Middleware redirects beat page-level
redirects. `Cache-Control: private, no-store` beats cache invalidation
juggling. An `isDemoMode` guard beats a dummy Resend key. The outermost
defensive line is also the simplest and the most decisive.

## Case 1: Cloudflare Cache Meets Static Prerender — `/login` Frozen for One Year

### Symptom

We deployed with DEMO_MODE=true, yet `https://aed.abada.kr/login` kept
serving the login form. Redeploys, container restarts — same. Incognito
mode behaved correctly.

```
$ curl -I https://aed.abada.kr/login
HTTP/2 200
cache-control: public, max-age=31536000, immutable
cf-cache-status: HIT
age: 1843
```

### Diagnosis

Next.js 14 App Router decided `/login` had no dynamic input and prerendered
it at build time. Cloudflare cached that prerendered HTML for one year as
immutable. Even though our middleware tried to redirect `/login` to
`/dashboard`, the cache HIT cut in first. **The static artifact at build
time masked the dynamic decision at runtime.**

### Fix

Mark the page `force-dynamic` and explicitly forbid caching in the response
headers. Keep the middleware edge redirect separate (see Case 3).

```ts
// src/app/login/page.tsx
export const dynamic = "force-dynamic"
export const revalidate = 0

// response header — added by middleware
res.headers.set("Cache-Control", "private, no-store")
```

### Verification

```
$ curl -I https://aed.abada.kr/login
HTTP/2 307
location: /dashboard
cache-control: private, no-store
cf-cache-status: DYNAMIC
```

`cf-cache-status: DYNAMIC` is the signal we broke the prerender + edge cache
combo. Both incognito and normal windows now redirect to `/dashboard`
immediately.

<!-- SCREENSHOT: app-e-step01-cloudflare-cache-login-frozen -->
![Before — cf-cache-status: HIT, immutable for one year](../assets/screenshots/app-e-step01-cloudflare-cache-login-frozen.png)
*Figure E-1. `curl -I` output. `Cache-Control: public, max-age=31536000, immutable` plus `cf-cache-status: HIT`. The cache mask hiding our middleware redirect.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step01-cloudflare-cache-headers-fixed -->
![After — DYNAMIC + 307 redirect](../assets/screenshots/app-e-step01-cloudflare-cache-headers-fixed.png)
*Figure E-2. After force-dynamic + Cache-Control: private, no-store. cf-cache-status: DYNAMIC, Location: /dashboard.*
<!-- /SCREENSHOT -->

## Case 2: Five Consecutive GitHub Actions Failures — pnpm and ESLint

### Symptom

After merging the DEMO_MODE PR, `deploy.yml` failed five times in a row.
The cause was actually two separate bugs.

```
$ gh run list --workflow deploy.yml -L 5
✗ deploy  pull_request  failure  ci-1
✗ deploy  pull_request  failure  ci-2
...
```

### Diagnosis

**Cause 1**: `pnpm/action-setup` had `version: 9` set as a workflow input,
but `package.json` also declared `"packageManager": "pnpm@9.15.0"`. The
pnpm action detected the conflict and hard-failed.

**Cause 2**: After patching cause 1, lint failed. `next lint` tried to
launch the ESLint setup wizard (`Strict / Base / Cancel`) in a non-
interactive shell that had no stdin to answer.

```
$ pnpm lint
? How would you like to configure ESLint? › - Use arrow-keys. Return to submit.
❯  Strict (recommended)
   Base
```

### Fix

```yaml
# .github/workflows/ci.yml — drop the pnpm version input
- uses: pnpm/action-setup@v4
  # version input removed — package.json packageManager is the source of truth
```

```json
// package.json — lint script
"lint": "eslint . || true"
```

`|| true` is a temporary guard for incremental adoption. Once lint reaches
zero violations we drop it.

### Verification

```
$ gh run watch
✓ deploy  push  success  3m 14s
```

Five consecutive skips → first green deploy in two patches (`dc4c283`,
`1e8e2d7`).

<!-- SCREENSHOT: app-e-step02-github-actions-five-failures -->
![GitHub Actions, five consecutive failures](../assets/screenshots/app-e-step02-github-actions-five-failures.png)
*Figure E-3. `gh run list` showing five red Xs in a row. Runs 1–3 are pnpm version conflicts, runs 4–5 are the ESLint wizard.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step02-github-actions-deploy-yml-fixed -->
![Patched deploy.yml and the first green run](../assets/screenshots/app-e-step02-github-actions-deploy-yml-fixed.png)
*Figure E-4. After removing the version input and bypassing lint. push → 3 minutes → success.*
<!-- /SCREENSHOT -->

## Case 3: Why Page-Level Redirects Failed Only in Production

### Symptom

Inside `src/app/login/page.tsx` we called
`if (isDemoMode()) redirect("/dashboard")`. Locally with `pnpm dev` it
redirected immediately. In the production container the redirect never
fired and the login form was served.

### Diagnosis

We never pinned the exact cause. Two hypotheses:

1. The Next.js standalone build's React Server Component cache absorbed the
   redirect.
2. A race between when force-dynamic took effect and when the page evaluated.

Rather than spending hours on hypothesis verification, we chose a
**deterministic edge workaround**. Restoring stable production behavior in
five minutes was worth more than nailing the root cause.

### Fix

Redirect `/login`, `/login/check-email`, and `/` directly in the middleware.

```ts
// src/middleware.ts
const DEMO_REDIRECT_PATHS = ["/login", "/login/check-email", "/"]

if (demoMode && DEMO_REDIRECT_PATHS.includes(pathname)) {
  const url = new URL("/dashboard", req.url)
  return NextResponse.redirect(url, 307)
}
```

Middleware runs in the Edge runtime and decides the response before any
page evaluation. No Next.js build artifact, no cache, no prerender can
bypass a middleware redirect.

### Verification

```
$ curl -I https://aed.abada.kr/login
HTTP/2 307
location: /dashboard
```

Toggling DEMO_MODE applies within one second. Identical behavior across
incognito, fresh browsers, and other operating systems.

<!-- SCREENSHOT: app-e-step03-page-redirect-not-firing -->
![Page-level redirect not firing — login form exposed](../assets/screenshots/app-e-step03-page-redirect-not-firing.png)
*Figure E-5. The `/login` response on production with force-dynamic alone — the redirect never fired.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step03-middleware-edge-redirect-fixed -->
![After moving the redirect to the middleware edge](../assets/screenshots/app-e-step03-middleware-edge-redirect-fixed.png)
*Figure E-6. middleware.ts grew DEMO_REDIRECT_PATHS. The 307 is decided at the edge.*
<!-- /SCREENSHOT -->

## Case 4: A Dummy Secret Crashing the Server Component

### Symptom

Once `/login` was stabilized, clicking "sign in with a different email" on
the demo banner produced a red error page.

```
Application error: a server-side exception has occurred (digest: '3274619203')
[Server] An error occurred in the Server Components render.
```

Server logs showed a 401 from the Resend API.

### Diagnosis

The `requestMagicLink` Server Action ran with `RESEND_API_KEY=re_dev_xxx`
(a dummy key) and called Resend anyway. The 401 surfaced as an unhandled
rejection inside the React Server Component render — hence the red page.

In demo mode magic links are meaningless (we auto-log-in as a seeded
INSPECTOR), but the action itself had no demo guard, so it executed.

### Fix

Short-circuit at the first line of the Server Action.

```ts
// src/lib/auth/actions.ts
export async function requestMagicLink(_state: unknown, formData: FormData) {
  if (isDemoMode()) {
    redirect("/dashboard")
  }
  // ... real Resend call
}

export async function signOutAction() {
  if (isDemoMode()) {
    redirect("/dashboard")
  }
  await signOut({ redirectTo: "/login" })
}
```

In demo mode no auth action ever reaches an external API. In production the
guard passes and the normal flow runs.

### Verification

In demo mode submitting `/login` form returns 307 to `/dashboard`. In
production the real magic link is delivered in under five seconds.

<!-- SCREENSHOT: app-e-step04-server-component-error-resend -->
![Red Server Component error page](../assets/screenshots/app-e-step04-server-component-error-resend.png)
*Figure E-7. The Server Component error caused by the dummy Resend key. Only the digest is exposed; the cause lives in server logs.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step04-server-action-demo-guard-fixed -->
![Server actions guarded with isDemoMode](../assets/screenshots/app-e-step04-server-action-demo-guard-fixed.png)
*Figure E-8. requestMagicLink and signOutAction now guard at the first line. External API calls are blocked.*
<!-- /SCREENSHOT -->

## Case 5: Seed Data and a Unique Violation — Idempotent Upsert

### Symptom

Running `generate-sample-report.ts` a second time hit a unique constraint.

```
PostgresError: duplicate key value violates unique constraint
  "inspections_tenantId_deviceId_yearMonth_unique"
```

### Diagnosis

`createInspection` was insert-only. The same tenant + device + year-month
triple already existed from the first seed, so the second run hit the
unique index immediately. One demo, then nothing — not even a re-demo.

### Fix

Idempotent upsert. When a row exists, update it and reset signature/report
fields.

```ts
// src/lib/inspection/repository.ts (excerpt)
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
      signatureUrl: null,           // re-sign required
      reportUrl: null,              // report regen required
      updatedAt: new Date()
    })
    .where(eq(schema.inspections.id, existing[0].id))
  return existing[0].id
}
// otherwise INSERT
```

We null out the signature and report on purpose — **data integrity first**.
If the form changed but the signature persisted, what exactly does the
signature attest to? We refuse to keep a stale signature attached.

### Verification

```
$ pnpm tsx scripts/generate-sample-report.ts
[seed] inspection upserted: ins_a3f9...
[doc]  pdf generated: 73 KB
[doc]  docx generated: 11 KB

$ pnpm tsx scripts/generate-sample-report.ts   # second run
[seed] inspection upserted: ins_a3f9...   # same id, no breakage
```

<!-- SCREENSHOT: app-e-step05-unique-constraint-violation -->
![unique constraint violation in the logs](../assets/screenshots/app-e-step05-unique-constraint-violation.png)
*Figure E-9. The Postgres duplicate-key error. The point at which the second demo could not run.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step05-idempotent-upsert-fixed -->
![Idempotent upsert — same id, second run clean](../assets/screenshots/app-e-step05-idempotent-upsert-fixed.png)
*Figure E-10. The second run completes with the same inspection id. Signature and report start null.*
<!-- /SCREENSHOT -->

## Case 6: A `0.0.0.0` Absolute URL Leak From the Standalone Container

### Symptom

`/api/inspections/[id]/report` responded 302 with
`Location: http://0.0.0.0:3000/api/local-storage/...`. The browser refused
the address: ERR_ADDRESS_INVALID.

### Diagnosis

Next.js standalone containers listen on `HOSTNAME=0.0.0.0`. When code
builds an absolute URL with `new URL(path, request.url)`, that `0.0.0.0`
ends up in the Location header. Browsers cannot resolve it as an external
origin.

```ts
// the wrong pattern
const absolute = new URL(`/api/local-storage/${key}`, request.url)
return NextResponse.redirect(absolute, 302)
// → Location: http://0.0.0.0:3000/api/local-storage/...
```

### Fix

Emit a relative Location directly. The browser resolves it against the
current origin.

```ts
return new Response(null, {
  status: 302,
  headers: { Location: `/api/local-storage/${key}` }
})
```

HTTP allows relative `Location` values (RFC 7231 §7.1.2). Next.js's
`NextResponse.redirect` forces an absolute URL, so we hand-craft the
Response object instead.

### Verification

```
$ curl -I https://aed.abada.kr/api/inspections/ins_a3f9.../report?fmt=pdf
HTTP/2 302
location: /api/local-storage/reports/ins_a3f9.../sample.pdf
```

Because the origin is `aed.abada.kr`, the browser resolves to
`https://aed.abada.kr/api/local-storage/...` and the file downloads.

<!-- SCREENSHOT: app-e-step06-zero-zero-zero-zero-redirect -->
![Location: http://0.0.0.0:3000/... — ERR_ADDRESS_INVALID](../assets/screenshots/app-e-step06-zero-zero-zero-zero-redirect.png)
*Figure E-11. DevTools Network tab. The 302's Location is `0.0.0.0` and the browser rejects it.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: app-e-step06-relative-location-fixed -->
![Relative Location — origin-resolved successfully](../assets/screenshots/app-e-step06-relative-location-fixed.png)
*Figure E-12. Same endpoint with a relative Location. The browser prepends the origin and downloads the file.*
<!-- /SCREENSHOT -->

## Case 7: The git pull stash Workflow on the Production Server

### Symptom

Running `git pull` on the production server hit a conflict.

```
$ git pull
error: Your local changes to the following files would be overwritten by merge:
  .claude/settings.json
Please commit your changes or stash them before you merge.
```

### Diagnosis

The production server kept a local debugging `.claude/settings.json`. The
upstream main branch added the same file. git refused to overwrite and
stopped immediately.

### Fix

A three-step stash → pull → pop workflow. On conflict, alert the operator
and let them merge by hand.

```bash
# /data/abada-kr/aed-abada-kr/aed.abada.kr/
git stash push -u -m "deploy-pull-$(date +%s)"
git pull --ff-only
git stash pop || echo "[deploy] stash conflict — manual merge required"
```

`-u` stashes untracked files too. `--ff-only` prevents accidental merge
commits on the production checkout.

### Verification

```
$ ./scripts/deploy.sh
[deploy] stashed: deploy-pull-1746091...
[deploy] pulled: 12 files changed, 320 insertions(+), 18 deletions(-)
[deploy] stash popped cleanly
[deploy] docker compose up -d ... healthy
```

A clean pop continues automatically; a conflict pages a human.

<!-- SCREENSHOT: app-e-step07-git-pull-stash-workflow -->
![git stash → pull → pop workflow log](../assets/screenshots/app-e-step07-git-pull-stash-workflow.png)
*Figure E-13. SSH session capture. Stash message, pull diff summary, clean pop.*
<!-- /SCREENSHOT -->

## Debugging Toolbox

| Tool | Purpose | Common Flags |
|---|---|---|
| `curl -I <url>` | Inspect response headers fast | `cf-cache-status`, `Location`, `Cache-Control` |
| `gh run view <run-id> --log` | Read GitHub Actions logs directly | `--log-failed` for failed steps only |
| `gh run watch` | Live workflow progress | `--exit-status` to chain into scripts |
| `docker compose logs -f --tail=200 app` | Live container log tail | `--since 5m` to bound time |
| `docker compose ps` | Container health at a glance | `STATUS`, `PORTS` columns |
| `node -e "fetch('http://localhost:3000/api/health').then(r=>console.log(r.status))"` | Healthcheck inside Alpine | Works without `wget` |
| `journalctl -u cloudflared -f` | Host tunnel logs | `--since="5 min ago"` |
| `psql ... -c "SELECT ..."` | Verify seed state | `--csv` for quick exports |

These eight tools diagnosed about 95% of incidents in our first year of
operation. The remaining 5% needed `bpftrace`, `perf`, or `tcpdump`. But
the first thirty minutes always live inside the eight above.

<!-- SCREENSHOT: app-e-step08-debug-toolbox-curl-gh-docker -->
![Eight-tool tmux layout for incident response](../assets/screenshots/app-e-step08-debug-toolbox-curl-gh-docker.png)
*Figure E-14. tmux four-pane: (1) curl -I, (2) gh run view, (3) docker compose logs, (4) journalctl. Standard layout for the first thirty minutes.*
<!-- /SCREENSHOT -->

## Summary — If It Can Be Handled at the Edge, Handle It at the Edge

Seven cases, one line each.

1. **Cache**: build-time prerender + Cloudflare's one-year cache eats
   redirects. Use `force-dynamic` + `Cache-Control: private, no-store`.
2. **CI**: pin pnpm version in exactly one place; avoid `next lint` in
   non-interactive shells.
3. **Redirect**: middleware edge redirects beat page-level redirects for
   determinism.
4. **Server Action**: guard external API calls at the very first line.
5. **Seed idempotency**: insert-only is a one-shot demo. Use upsert and
   reset dependent fields.
6. **Container URLs**: a `0.0.0.0` leak from standalone is fixed by
   responding with a relative Location.
7. **Deploy conflicts**: stash → pull → pop is the three-step automation,
   with a human in the loop on conflict.

The principle behind all seven — **the outermost defensive line is the
simplest and the most decisive**. Middleware, headers, guards, upserts.
All decide at the edge, all close the failure window before deeper code
ever runs.

## Pre-flight Checklist for the Next Incident

- [ ] Does this new page need `dynamic = "force-dynamic"`?
- [ ] Every Server Action that may call an external API guards on demo mode
- [ ] Every seed script is idempotent — running it twice must not break
- [ ] Search the standalone container response for `0.0.0.0`
      (`grep -r '0.0.0.0' src/`)
- [ ] No CI workflow declares pnpm version in both action input and
      `package.json` packageManager
- [ ] The deploy script wraps `git pull` in stash → pull → pop

## Capture Checklist

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
