---
title: "Appendix D. Thirty-Two Troubleshooting Cases"
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

# Appendix D. Thirty-Two Troubleshooting Cases

## Learning Objectives

- Learn from thirty-two real incident patterns from two years of operating this SaaS
- Read each case in five parts: symptoms, cause, diagnosis, fix, verification
- Compare error and resolution captures side by side
- Group by category so the next similar incident matches in seconds

## The Big Picture

Operational depth is proportional to **the number of incidents you have
recorded**. The first twelve were the result of year one. These thirty-two
are the cumulative log through year two, grouped as follows:

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

Each case follows this five-line structure:

- **Symptom**: what the user sees
- **Cause**: the actual technical root cause
- **Diagnosis**: which command or log surfaced it
- **Fix**: the exact code or command that resolved it
- **Verification**: how we confirmed the fix held

---

## Year One: The Original Twelve

---

### 1. cloudflared Tunnel Down — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-error -->
![Error — cloudflared container exited(1)](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-error.png)
*Figure D-1a. docker compose ps. Only cloudflared in red.*
<!-- /SCREENSHOT -->

**Symptom**: status page 502, Kuma external monitor critical, full user outage.
**Cause**: Cloudflare Tunnel token expired. The 30-day token had not been rotated.
**Diagnosis**: `docker compose logs cloudflared --tail=50` → `failed to authenticate: token expired`.
**Fix**: issue a new token in the dashboard, update `CLOUDFLARE_TUNNEL_TOKEN` in `.env.production`, run `docker compose up -d cloudflared`.
**Verification**: `cloudflared tunnel info` returns 200; status page back to 200.

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-fix -->
![Fixed — cloudflared healthy again](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-fix.png)
*Figure D-1b. Healthy in 30 seconds. Prevention: alarm 30 days before token expiry.*
<!-- /SCREENSHOT -->

---

### 2. Postgres "too many connections" — Database

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-error -->
![Error — FATAL: sorry, too many clients already](../assets/screenshots/app-d-step02-postgres-too-many-connections-error.png)
*Figure D-2a. Hit at the 100-device mark.*
<!-- /SCREENSHOT -->

**Symptom**: at ~100 concurrent users every API turned 503; logs read `too many clients already`.
**Cause**: a Next.js hot path created a new connection per request; pool ceiling was crossed.
**Diagnosis**: `SELECT count(*) FROM pg_stat_activity` = 95, `max_connections` = 100.
**Fix**: introduce pgbouncer in transaction pool mode; point `DATABASE_URL` at port 6432.
**Verification**: load test at 200 RPS held active connections steady at 25.

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-fix -->
![Fixed — active connections steady at 25](../assets/screenshots/app-d-step02-postgres-too-many-connections-fix.png)
*Figure D-2b. Detailed config in chapter 17.*
<!-- /SCREENSHOT -->

---

### 3. Magic-Link "expired" — Auth & Session

<!-- SCREENSHOT: app-d-step03-magic-link-expired-error -->
![Error — link expired after 5 minutes](../assets/screenshots/app-d-step03-magic-link-expired-error.png)
*Figure D-3a. User checked email late.*
<!-- /SCREENSHOT -->

**Symptom**: users who clicked the link late only saw an "expired" screen.
**Cause**: a 5-minute TTL was too short and there was no resend path on the expired screen.
**Diagnosis**: 23% of expired clicks happened between 5 and 15 minutes after issue.
**Fix**: a one-click "resend" button on the expired screen with a 60-second rate limit.
**Verification**: 81% of expired clicks converted via resend the following week; zero CS tickets.

<!-- SCREENSHOT: app-d-step03-magic-link-expired-fix -->
![Fixed — friendly resend button](../assets/screenshots/app-d-step03-magic-link-expired-fix.png)
*Figure D-3b.*
<!-- /SCREENSHOT -->

---

### 4. R2 Presigned URL 403 — R2 Storage

<!-- SCREENSHOT: app-d-step04-r2-presign-403-error -->
![Error — 403 SignatureDoesNotMatch on PUT](../assets/screenshots/app-d-step04-r2-presign-403-error.png)
*Figure D-4a. Content-Type header missing.*
<!-- /SCREENSHOT -->

**Symptom**: client PUT returned 403 `SignatureDoesNotMatch`.
**Cause**: the `Content-Type` set at presign time did not match the header sent at PUT time.
**Diagnosis**: compared the presign payload with the PUT request header in browser DevTools.
**Fix**: return the chosen `contentType` from the presign endpoint; client must use the same value on PUT.
**Verification**: 200 OK; the object appears correctly in the R2 console.

<!-- SCREENSHOT: app-d-step04-r2-presign-403-fix -->
![Fixed — explicit Content-Type, 200](../assets/screenshots/app-d-step04-r2-presign-403-fix.png)
*Figure D-4b.*
<!-- /SCREENSHOT -->

---

### 5. DOCX Template Render Failure — Build & Dependency

<!-- SCREENSHOT: app-d-step05-docx-template-render-error -->
![Error — docxtemplater unclosed loop](../assets/screenshots/app-d-step05-docx-template-render-error.png)
*Figure D-5a. Placeholder broken inside a table.*
<!-- /SCREENSHOT -->

**Symptom**: docxtemplater threw `unclosed loop` and report generation failed.
**Cause**: `{#items}` was placed inside a table cell without its own paragraph; the loop spanned a paragraph boundary.
**Diagnosis**: enabled `parser:1` in docxtemplater to find the offending cell coordinates.
**Fix**: enable `paragraphLoop:true` and split table placeholders into their own `<w:p>` elements.
**Verification**: a 12-item report rendered cleanly; a regression fixture was added.

<!-- SCREENSHOT: app-d-step05-docx-template-render-fix -->
![Fixed — clean render](../assets/screenshots/app-d-step05-docx-template-render-fix.png)
*Figure D-5b.*
<!-- /SCREENSHOT -->

---

### 6. PDF Korean Font Boxed Out — Build & Dependency

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-error -->
![Error — PDF rendered as □□□](../assets/screenshots/app-d-step06-pdf-korean-font-broken-error.png)
*Figure D-6a. Font embed failed.*
<!-- /SCREENSHOT -->

**Symptom**: Korean text in PDF reports rendered as `□□□`.
**Cause**: `@react-pdf/renderer` ships only Helvetica; no Korean glyph coverage.
**Diagnosis**: opened the PDF in macOS Preview and confirmed no Korean font was embedded.
**Fix**: ship `Pretendard-Regular.ttf` and call `Font.register({ family, src })` explicitly.
**Verification**: Korean body and headings render cleanly; +600KB file size is acceptable.

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-fix -->
![Fixed — Korean characters render correctly](../assets/screenshots/app-d-step06-pdf-korean-font-broken-fix.png)
*Figure D-6b.*
<!-- /SCREENSHOT -->

---

### 7. Resend Bounce Spike — Email (Resend)

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-error -->
![Error — bounce rate alarmed at 15%](../assets/screenshots/app-d-step07-resend-bounce-spike-error.png)
*Figure D-7a. SPF record propagation delay after a change.*
<!-- /SCREENSHOT -->

**Symptom**: Resend dashboard alarmed with bounce rate at 15%.
**Cause**: SPF propagation lag after a record change; some RBLs rejected mail.
**Diagnosis**: `dig +short TXT example.com` showed the old record from some resolvers.
**Fix**: simplified SPF flat-include into ip4 ranges and dropped TTL from 300 to 60.
**Verification**: bounce rate returned to 0.5% within 24 hours; Postmaster Tools went green.

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-fix -->
![Fixed — bounce rate back to 0.5% within 24h](../assets/screenshots/app-d-step07-resend-bounce-spike-fix.png)
*Figure D-7b.*
<!-- /SCREENSHOT -->

---

### 8. Cron Job Deadlock — Cron & Notifications

<!-- SCREENSHOT: app-d-step08-cron-deadlock-error -->
![Error — backup-daily never finishes](../assets/screenshots/app-d-step08-cron-deadlock-error.png)
*Figure D-8a. Redis lock held while the container OOMed.*
<!-- /SCREENSHOT -->

**Symptom**: BullMQ `backup-daily` ran for four hours and stalled the queue.
**Cause**: the worker OOM'd; on restart the Redis lock was still held with no TTL.
**Diagnosis**: `redis-cli KEYS 'bull:*lock'` returned the key with TTL `-1`.
**Fix**: enforce `acquireLock(key, ttl=600)` and wrap with `try/finally` to guarantee release.
**Verification**: forcing `kill -9` on the worker still let the next minute pick up the job cleanly.

<!-- SCREENSHOT: app-d-step08-cron-deadlock-fix -->
![Fixed — locks always release](../assets/screenshots/app-d-step08-cron-deadlock-fix.png)
*Figure D-8b.*
<!-- /SCREENSHOT -->

---

### 9. Redis OOM — Database

<!-- SCREENSHOT: app-d-step09-redis-oom-error -->
![Error — OOM command not allowed when used memory > 'maxmemory'](../assets/screenshots/app-d-step09-redis-oom-error.png)
*Figure D-9a. Nonces missing TTL accumulated.*
<!-- /SCREENSHOT -->

**Symptom**: every SET failed with `OOM command not allowed when used memory > 'maxmemory'`.
**Cause**: a subset of magic-link nonces had been written without an expiry and accumulated.
**Diagnosis**: `INFO memory` plus `SCAN 0 MATCH 'nonce:*'` showed about a million keys.
**Fix**: set `maxmemory-policy allkeys-lru` and made `EX 600` mandatory at every nonce write site.
**Verification**: memory holds steady at ~60 MB; no OOM alarm in 30 days.

<!-- SCREENSHOT: app-d-step09-redis-oom-fix -->
![Fixed — memory steady](../assets/screenshots/app-d-step09-redis-oom-fix.png)
*Figure D-9b.*
<!-- /SCREENSHOT -->

---

### 10. Drizzle Migration Failure — Database

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-error -->
![Error — column "deleted_at" already exists](../assets/screenshots/app-d-step10-drizzle-migration-fail-error.png)
*Figure D-10a. Retried after a partial failure.*
<!-- /SCREENSHOT -->

**Symptom**: `drizzle-kit migrate` failed with `column "deleted_at" already exists`.
**Cause**: the previous run added the column but failed at the index step; the rerun saw the column already.
**Diagnosis**: read the failed step from `drizzle.__drizzle_migrations`.
**Fix**: rewrote the migration with `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` to make it idempotent.
**Verification**: the rerun passed; the schema-drift check came up clean.

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-fix -->
![Fixed — re-run passes](../assets/screenshots/app-d-step10-drizzle-migration-fail-fix.png)
*Figure D-10b.*
<!-- /SCREENSHOT -->

---

### 11. Clock Drift — Auth & Session

<!-- SCREENSHOT: app-d-step11-clock-drift-error -->
![Error — JWT not valid yet (clock skew)](../assets/screenshots/app-d-step11-clock-drift-error.png)
*Figure D-11a. Host NTP not configured.*
<!-- /SCREENSHOT -->

**Symptom**: a subset of users hit `JWT not valid yet` immediately after login.
**Cause**: host clock was 47 seconds ahead, so `nbf` looked like the future.
**Diagnosis**: `timedatectl status` showed `System clock synchronized: no`.
**Fix**: installed `chrony` and pointed it at the Cloudflare time service.
**Verification**: `chronyc tracking` shows offset under 5ms; `nbf` rejections dropped to zero.

<!-- SCREENSHOT: app-d-step11-clock-drift-fix -->
![Fixed — chronyc tracking stable](../assets/screenshots/app-d-step11-clock-drift-fix.png)
*Figure D-11b.*
<!-- /SCREENSHOT -->

---

### 12. Suspected Tenant Leak — Security

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-error -->
![Error — integration test surfaces a leak path](../assets/screenshots/app-d-step12-tenant-leak-suspect-error.png)
*Figure D-12a. New route added without the chapter 5 test pattern.*
<!-- /SCREENSHOT -->

**Symptom**: an integration test flagged that a new route could expose another tenant's data.
**Cause**: the leak-test matrix was built once; new routes did not automatically appear in it.
**Diagnosis**: diff'd the routes enum against the test matrix and found four uncovered routes.
**Fix**: enumerated routes at runtime so the test set grows automatically with the route enum.
**Verification**: every route now passes the leak test, and PR CI fails for any new uncovered route.

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-fix -->
![Fixed — every route passes the leak test](../assets/screenshots/app-d-step12-tenant-leak-suspect-fix.png)
*Figure D-12b.*
<!-- /SCREENSHOT -->

---

## Year Two: Twenty More

---

## Build & Dependency

---

### 13. Next.js Standalone Build Fails — Build & Dependency

<!-- SCREENSHOT: app-d-step13-next-standalone-build-fail-error -->
<!-- /SCREENSHOT -->

**Symptom**: `next build` exited with `Error: DATABASE_URL is required`; no standalone output.
**Cause**: a DB module was imported during build and it validated env on import; CI had no `DATABASE_URL`.
**Diagnosis**: GitHub Actions stack trace pointed at `src/server/db/client.ts:12`.
**Fix**: made env validation lazy (run on first `getDb()` call) and added a dummy `postgres://build:build@localhost/build` to CI secrets.
**Verification**: `pnpm build` passes, `.next/standalone/server.js` is produced, runtime boots with the real URL.

<!-- SCREENSHOT: app-d-step13-next-standalone-build-fail-fix -->
<!-- /SCREENSHOT -->

---

### 14. pnpm Install Hangs on esbuild Build Script — Build & Dependency

<!-- SCREENSHOT: app-d-step14-pnpm-esbuild-hang-error -->
<!-- /SCREENSHOT -->

**Symptom**: CI `pnpm install --frozen-lockfile` stalled past 10 minutes and timed out.
**Cause**: pnpm 9 blocks postinstall scripts unless allow-listed; `esbuild` waits on stdin until allowed.
**Diagnosis**: `pnpm install --reporter=ndjson` revealed the hung postinstall on `esbuild`.
**Fix**: added `"pnpm": { "onlyBuiltDependencies": ["esbuild", "@swc/core"] }` to `package.json`.
**Verification**: CI completes in under 90 seconds; the esbuild native binary downloads cleanly.

<!-- SCREENSHOT: app-d-step14-pnpm-esbuild-hang-fix -->
<!-- /SCREENSHOT -->

---

### 15. drizzle-kit generate Produces an Empty Migration — Build & Dependency

<!-- SCREENSHOT: app-d-step15-drizzle-empty-migration-error -->
<!-- /SCREENSHOT -->

**Symptom**: schema changed, but `drizzle-kit generate` emitted a migration file with only comments.
**Cause**: `schema` glob in `drizzle.config.ts` did not match the new schema files.
**Diagnosis**: `drizzle-kit generate --verbose` listed only the old files in scope.
**Fix**: widened the glob to `'./src/server/db/schema/**/*.ts'`.
**Verification**: regeneration produced `CREATE TABLE inspection_attachments` as expected.

<!-- SCREENSHOT: app-d-step15-drizzle-empty-migration-fix -->
<!-- /SCREENSHOT -->

---

### 16. Tailwind Classes Not Applied — Build & Dependency

<!-- SCREENSHOT: app-d-step16-tailwind-content-path-error -->
<!-- /SCREENSHOT -->

**Symptom**: classes like `bg-blue-600` had no effect on a new component.
**Cause**: the component lived under `src/features/`, but `tailwind.config.ts` only scanned `./src/app/**`.
**Diagnosis**: searched the built CSS — the class was missing; verified by `tailwindcss --watch --verbose`.
**Fix**: widened `content` to `['./src/**/*.{ts,tsx,mdx}']`.
**Verification**: HMR applied the class instantly; production build also includes it.

<!-- SCREENSHOT: app-d-step16-tailwind-content-path-fix -->
<!-- /SCREENSHOT -->

---

### 17. TypeScript 5.x Compatibility Regression — Build & Dependency

<!-- SCREENSHOT: app-d-step17-typescript-5x-incompat-error -->
<!-- /SCREENSHOT -->

**Symptom**: after upgrading to TS 5.6, multiple `Type 'X' is not assignable to type 'Awaited<X>'` errors appeared.
**Cause**: 5.6 enables `--strictBuiltinIteratorReturn` by default, narrowing some generic inference.
**Diagnosis**: `tsc --noEmit --listFiles --explainFiles` identified 23 affected files.
**Fix**: added explicit return types to the affected helpers and added `ES2024.Iterator` to `tsconfig.lib`.
**Verification**: `pnpm typecheck` returns 0 errors; unit tests stay green.

<!-- SCREENSHOT: app-d-step17-typescript-5x-incompat-fix -->
<!-- /SCREENSHOT -->

---

## Database

---

### 18. Postgres Container Healthy but Connection Refused — Database

<!-- SCREENSHOT: app-d-step18-postgres-healthy-but-refused-error -->
<!-- /SCREENSHOT -->

**Symptom**: `docker compose ps` shows postgres healthy, but the app gets `ECONNREFUSED 127.0.0.1:5432`.
**Cause**: the container bound to all interfaces but the host listened only on IPv6 by default.
**Diagnosis**: `ss -lntp | grep 5432` showed `:::5432` only; `nc -4 -zv localhost 5432` failed.
**Fix**: pinned the compose port mapping to `"127.0.0.1:5432:5432"` to force IPv4.
**Verification**: `psql -h 127.0.0.1` connects, app boots successfully.

<!-- SCREENSHOT: app-d-step18-postgres-healthy-but-refused-fix -->
<!-- /SCREENSHOT -->

---

### 19. Tenant_id Missing in a Query Lets Cross-Tenant Reads Through — Database

<!-- SCREENSHOT: app-d-step19-tenant-id-missing-query-error -->
<!-- /SCREENSHOT -->

**Symptom**: in QA, a user could fetch one inspection from another organization.
**Cause**: a new query used `where(eq(inspections.id, id))` without the `tenantId` predicate.
**Diagnosis**: grepped `pg_stat_statements` for queries lacking a tenant filter; found three.
**Fix**: enforced a `withTenant(qb, tenantId)` helper and added an ESLint rule banning raw `where(eq(*.id, ...))` outside that helper.
**Verification**: the chapter 5 leak test passes for all routes; static analysis is clean.

<!-- SCREENSHOT: app-d-step19-tenant-id-missing-query-fix -->
<!-- /SCREENSHOT -->

---

### 20. Rows Invisible After Migration — Database

<!-- SCREENSHOT: app-d-step20-search-path-rows-invisible-error -->
<!-- /SCREENSHOT -->

**Symptom**: a new column always read as NULL from the app despite migration success.
**Cause**: migration ran in the `app` schema, but the connection's `search_path` was pinned to `public`.
**Diagnosis**: `SHOW search_path;` returned `"$user", public`; `current_schema()` was `public`.
**Fix**: appended `?options=-c%20search_path%3Dapp,public` to `DATABASE_URL` (or `SET search_path` per connection).
**Verification**: the new column reads and writes correctly without table prefixes.

<!-- SCREENSHOT: app-d-step20-search-path-rows-invisible-fix -->
<!-- /SCREENSHOT -->

---

### 21. JSONB items Column Slow to Filter — Database

<!-- SCREENSHOT: app-d-step21-jsonb-items-slow-error -->
<!-- /SCREENSHOT -->

**Symptom**: `WHERE items @> '[{"status":"fail"}]'` took ~800 ms.
**Cause**: no index on the JSONB column; every row was scanned.
**Diagnosis**: `EXPLAIN ANALYZE` showed `Seq Scan on inspections`, rows=120k.
**Fix**: `CREATE INDEX inspections_items_gin ON inspections USING GIN (items jsonb_path_ops);`.
**Verification**: the same query runs in ~12 ms via `Bitmap Index Scan`.

<!-- SCREENSHOT: app-d-step21-jsonb-items-slow-fix -->
<!-- /SCREENSHOT -->

---

### 22. Sequence/Identity Conflict After Restore — Database

<!-- SCREENSHOT: app-d-step22-restore-sequence-conflict-error -->
<!-- /SCREENSHOT -->

**Symptom**: post-`pg_restore`, the first INSERT failed with `duplicate key value violates unique constraint`.
**Cause**: data was restored but sequence `last_value` reset to 1, colliding with existing PKs.
**Diagnosis**: compared `pg_get_serial_sequence(...)` and `MAX(id)` for each table.
**Fix**: a post-restore script `setval(pg_get_serial_sequence(t,'id'), MAX(id))` for every owning table.
**Verification**: subsequent INSERTs succeed; every sequence's `currval` is at least `MAX(id)`.

<!-- SCREENSHOT: app-d-step22-restore-sequence-conflict-fix -->
<!-- /SCREENSHOT -->

---

## Auth & Session

---

### 23. Magic Link Email Never Arrives — Auth & Session

<!-- SCREENSHOT: app-d-step23-resend-quota-exceeded-error -->
<!-- /SCREENSHOT -->

**Symptom**: a new sign-up never received the magic-link email.
**Cause**: the Resend free plan's daily quota of 100 was exhausted by an end-of-month sign-up burst.
**Diagnosis**: Resend dashboard showed `429 quota_exceeded`; the app logged the same code.
**Fix**: upgraded the plan, added monthly send-volume monitoring, and a Slack alert at 80% of quota.
**Verification**: the same flow the next day delivered the email within one second; the dashboard read green.

<!-- SCREENSHOT: app-d-step23-resend-quota-exceeded-fix -->
<!-- /SCREENSHOT -->

---

### 24. Login Works but Session Has No tenantId — Auth & Session

<!-- SCREENSHOT: app-d-step24-session-tenant-missing-error -->
<!-- /SCREENSHOT -->

**Symptom**: after login, `/dashboard` looped on "Choose your organization" forever.
**Cause**: the NextAuth `jwt` callback set `tenantId`, but the `session` callback dropped it.
**Diagnosis**: temporary logging showed `tenantId` present in `token` but absent from `session`.
**Fix**: in the `session` callback, `session.user.tenantId = token.tenantId` then return.
**Verification**: login lands on `/dashboard` directly; the e2e test stays green.

<!-- SCREENSHOT: app-d-step24-session-tenant-missing-fix -->
<!-- /SCREENSHOT -->

---

### 25. JWT Not Refreshing After Expiry — Auth & Session

<!-- SCREENSHOT: app-d-step25-jwt-refresh-broken-error -->
<!-- /SCREENSHOT -->

**Symptom**: after 30 minutes idle, every mutation hit 401 and a refresh kicked the user back to login.
**Cause**: `jwt.maxAge: 30m` without `updateAge` invalidated the token without silent-refresh in place.
**Diagnosis**: cookie expiry confirmed in DevTools; no refresh request seen on the wire.
**Fix**: set `jwt: { maxAge: 60*60*24, updateAge: 60*60 }` and call `useSession({ refetchInterval: 60*5 })` on the client.
**Verification**: an 8-hour idle session still mutates successfully; one silent-refresh log per hour.

<!-- SCREENSHOT: app-d-step25-jwt-refresh-broken-fix -->
<!-- /SCREENSHOT -->

---

### 26. Multi-Tenant User Logged Into the Wrong Org — Auth & Session

<!-- SCREENSHOT: app-d-step26-multi-tenant-wrong-org-error -->
<!-- /SCREENSHOT -->

**Symptom**: a user belonging to two organizations always landed in the first one.
**Cause**: the sign-in callback unconditionally chose `memberships[0]`, ignoring the user's `lastActiveTenantId`.
**Diagnosis**: compared `user.last_active_tenant_id` with the session's `tenantId` — they did not match.
**Fix**: in the `signIn` callback, prefer `lastActiveTenantId`; if absent, redirect to a membership picker.
**Verification**: a multi-org e2e scenario lands on the last-active org reliably.

<!-- SCREENSHOT: app-d-step26-multi-tenant-wrong-org-fix -->
<!-- /SCREENSHOT -->

---

## Cron & Notifications

---

### 27. Monthly Cron Did Not Run — Cron & Notifications

<!-- SCREENSHOT: app-d-step27-cron-timezone-missed-error -->
<!-- /SCREENSHOT -->

**Symptom**: the monthly inspection notice scheduled for 09:00 KST on the 1st never fired.
**Cause**: the BullMQ repeat expression `0 9 1 * *` was interpreted in the container's UTC timezone, so it fired at 18:00 KST on the 1st — past midnight in UTC.
**Diagnosis**: `worker.getRepeatableJobs()` reported the next run in UTC.
**Fix**: passed `tz: 'Asia/Seoul'` in the repeat options and set `TZ=Asia/Seoul` on the container.
**Verification**: the next monthly run fired exactly at 09:00 KST on the 1st; the next five forecasts also align.

<!-- SCREENSHOT: app-d-step27-cron-timezone-missed-fix -->
<!-- /SCREENSHOT -->

---

### 28. Overdue Notice Sent in Duplicate — Cron & Notifications

<!-- SCREENSHOT: app-d-step28-overdue-notice-duplicate-error -->
<!-- /SCREENSHOT -->

**Symptom**: a single user received the same overdue email three times.
**Cause**: timestamp-based job IDs allowed duplicate enqueues within a second; a worker restart re-played a backlog.
**Diagnosis**: `getJobs(['completed'])` showed three of `notice:device-123:2026-04-28`.
**Fix**: switched to a deterministic jobId `notice:${deviceId}:${dateBucket}` and enabled `removeOnComplete: 1000`.
**Verification**: the same scenario now drops second-and-later enqueues; users receive exactly one email.

<!-- SCREENSHOT: app-d-step28-overdue-notice-duplicate-fix -->
<!-- /SCREENSHOT -->

---

### 29. Cron Worker Sigkilled in a Restart Loop — Cron & Notifications

<!-- SCREENSHOT: app-d-step29-cron-worker-sigkill-loop-error -->
<!-- /SCREENSHOT -->

**Symptom**: the cron-worker container restarted every five minutes and never went healthy.
**Cause**: a single job allocated 1.2 GB and exceeded the 512 MB compose `mem_limit`; the OOM killer fired SIGKILL.
**Diagnosis**: `dmesg | grep -i kill` showed `Killed process ... (node)`; `docker stats` confirmed the RSS spike.
**Fix**: chunked the heavy job (`chunk(rows, 500)`), raised the limit to 1 GB, and enabled swap.
**Verification**: 24 hours stable, RSS p95 at 280 MB, zero OOM kills.

<!-- SCREENSHOT: app-d-step29-cron-worker-sigkill-loop-fix -->
<!-- /SCREENSHOT -->

---

## R2 Storage

---

### 30. Signed Upload 403 (CORS) — R2 Storage

<!-- SCREENSHOT: app-d-step30-r2-cors-upload-403-error -->
<!-- /SCREENSHOT -->

**Symptom**: browser PUT returned 403 with a CORS error in the console.
**Cause**: the R2 bucket's CORS policy did not include `https://app.example.com`.
**Diagnosis**: the preflight `OPTIONS` came back 403 with no `Access-Control-Allow-Origin`.
**Fix**: `wrangler r2 bucket cors put <bucket> --rules cors.json` with the right `AllowedOrigins` and `AllowedHeaders: ["Content-Type"]`.
**Verification**: preflight returned 200, PUT 200, and the new object appeared in the R2 console.

<!-- SCREENSHOT: app-d-step30-r2-cors-upload-403-fix -->
<!-- /SCREENSHOT -->

---

### 31. Signed URL Cannot Be Reissued After Expiry — R2 Storage

<!-- SCREENSHOT: app-d-step31-signed-url-expired-reissue-error -->
<!-- /SCREENSHOT -->

**Symptom**: clicking a download link after expiry returned `Request has expired`; refresh kept the same URL.
**Cause**: the client cached the signed URL response with `staleTime: Infinity`.
**Diagnosis**: confirmed in React Query devtools that the entry never went stale.
**Fix**: set `staleTime: expiresIn * 0.8` and refetched proactively before expiry.
**Verification**: clicking again seven minutes later issued a fresh URL and started the download immediately.

<!-- SCREENSHOT: app-d-step31-signed-url-expired-reissue-fix -->
<!-- /SCREENSHOT -->

---

### 32. R2 Bucket Routed to the Wrong Region — R2 Storage

<!-- SCREENSHOT: app-d-step32-r2-region-misroute-error -->
<!-- /SCREENSHOT -->

**Symptom**: APAC users saw upload p95 jump from 1.8 s to 4.5 s overnight.
**Cause**: a new bucket was created without a jurisdiction hint and landed in the EU region; uploads transited Europe.
**Diagnosis**: `wrangler r2 bucket info <name>` reported `location: weur`; client traces went via an EU edge.
**Fix**: recreated the bucket with `--jurisdiction=apac`, migrated objects, and kept the old bucket read-only for 30 days.
**Verification**: upload p95 returned to 1.6 s; R2 region stats show 99% APAC.

<!-- SCREENSHOT: app-d-step32-r2-region-misroute-fix -->
<!-- /SCREENSHOT -->

---

## Email (Resend)

---

### 33. DOCX/PDF Attachment Missing — Email (Resend)

<!-- SCREENSHOT: app-d-step33-resend-attachment-missing-error -->
<!-- /SCREENSHOT -->

**Symptom**: report emails arrived with body only — no attachment.
**Cause**: the Resend `attachments[].content` was an empty `Uint8Array` because the R2 stream was passed before it had drained.
**Diagnosis**: logged `attachment.content.length` immediately before send — it was 0 even though the R2 GET returned 200.
**Fix**: drained the R2 stream with `streamToBuffer()` and base64-encoded the resulting buffer.
**Verification**: the next email carried the attachment; the file hash matched the R2 object.

<!-- SCREENSHOT: app-d-step33-resend-attachment-missing-fix -->
<!-- /SCREENSHOT -->

---

### 34. Bounce Events Were Never Handled — Email (Resend)

<!-- SCREENSHOT: app-d-step34-resend-bounce-not-handled-error -->
<!-- /SCREENSHOT -->

**Symptom**: bounced addresses kept getting the same monthly emails because the system did not know they had bounced.
**Cause**: no Resend webhook was subscribed; bounce events were silent.
**Diagnosis**: 100 bounce entries on the Resend dashboard versus zero `bounced` flags in the DB.
**Fix**: added `/api/webhooks/resend` and on `email.bounced` set `users.email_status='bounced'`.
**Verification**: a test send to a bad address triggered the webhook within 30 seconds; the next scheduled send was skipped automatically.

<!-- SCREENSHOT: app-d-step34-resend-bounce-not-handled-fix -->
<!-- /SCREENSHOT -->

---

### 35. Korean Subject Line Garbled (UTF-8) — Email (Resend)

<!-- SCREENSHOT: app-d-step35-email-subject-utf8-broken-error -->
<!-- /SCREENSHOT -->

**Symptom**: some clients (Gmail iOS in particular) showed subjects as `=?utf-8?Q?=EC=A0=90...`.
**Cause**: the SDK used RFC 2047 encoded-word `Q` encoding; long Korean subjects were folded mid-byte and some decoders gave up.
**Diagnosis**: viewed the raw headers — `Subject:` wrapped at column 75 and the continuation alignment broke.
**Fix**: forced full base64 encoding (`=?utf-8?B?...?=`) for Korean subjects, sidestepping the line-length issue.
**Verification**: Gmail iOS, Outlook 365, and Naver Mail all rendered the subject correctly.

<!-- SCREENSHOT: app-d-step35-email-subject-utf8-broken-fix -->
<!-- /SCREENSHOT -->

---

## Cloudflare Tunnel

---

### 36. Tunnel Up but Site 502 — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step36-tunnel-up-but-502-error -->
<!-- /SCREENSHOT -->

**Symptom**: cloudflared was healthy and connected, yet the public site served 502 Bad Gateway.
**Cause**: the tunnel target (`http://app:3000`) was down even though the tunnel itself was up.
**Diagnosis**: `docker compose ps app` showed `restarting`; `docker compose logs app` showed an OOM.
**Fix**: raised the app container memory limit and upgraded the leaky upstream library that caused the OOM.
**Verification**: the app held healthy for 30 minutes, the status page returned 200, and external probes succeeded.

<!-- SCREENSHOT: app-d-step36-tunnel-up-but-502-fix -->
<!-- /SCREENSHOT -->

---

### 37. DNS Did Not Propagate — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step37-dns-propagation-stall-error -->
<!-- /SCREENSHOT -->

**Symptom**: a new subdomain `staging.example.com` returned NXDOMAIN for more than 10 minutes.
**Cause**: `cloudflared tunnel route dns` created the record, but the zone proxy briefly stayed silent on it.
**Diagnosis**: `dig +trace staging.example.com @1.1.1.1` reached Cloudflare but returned `;; AUTHORITY:` only.
**Fix**: toggled proxy off and on for the record in the dashboard and called `purge_cache` via API.
**Verification**: DNS resolved within 30 seconds; a global checker (`whatsmydns`) reported 100% green.

<!-- SCREENSHOT: app-d-step37-dns-propagation-stall-fix -->
<!-- /SCREENSHOT -->

---

### 38. Auth Failure After cloudflared Restart — Cloudflare Tunnel

<!-- SCREENSHOT: app-d-step38-cloudflared-restart-auth-error -->
<!-- /SCREENSHOT -->

**Symptom**: a routine restart left cloudflared looping with `Unauthorized: Failed to get tunnel`.
**Cause**: the token file on the host was 0644; the in-container user (nobody) could not read it.
**Diagnosis**: `docker compose exec cloudflared cat /etc/cloudflared/token` returned permission denied.
**Fix**: chmod 0600 on the host file and mounted with `:ro,uid=65532`.
**Verification**: five consecutive restarts came back healthy and the healthcheck went green immediately.

<!-- SCREENSHOT: app-d-step38-cloudflared-restart-auth-fix -->
<!-- /SCREENSHOT -->

---

## Performance

---

### 39. /dashboard First Load Over 5 Seconds — Performance

<!-- SCREENSHOT: app-d-step39-dashboard-cold-start-error -->
<!-- /SCREENSHOT -->

**Symptom**: the first user of the morning saw `/dashboard` TTFB of 5.4 s.
**Cause**: a cold DB pool plus a cold Next.js standalone with dynamic imports stacked up.
**Diagnosis**: `Server-Timing` showed `db: 4.2s`, `render: 0.6s`; `pg_stat_activity` had zero idle backends.
**Fix**: a 4-minute warm-up cron that pings `/api/health/db`, and converted hot dynamic imports to static.
**Verification**: 5 AM first hits arrived in 480 ms TTFB; p95 stayed under 700 ms.

<!-- SCREENSHOT: app-d-step39-dashboard-cold-start-fix -->
<!-- /SCREENSHOT -->

---

### 40. Dashboard Stats Queries N+1 — Performance

<!-- SCREENSHOT: app-d-step40-dashboard-stat-n-plus-1-error -->
<!-- /SCREENSHOT -->

**Symptom**: orgs with 200+ devices saw `/dashboard` take ~9 seconds.
**Cause**: `getLastInspection(deviceId)` ran once per device — 200 sequential round-trips.
**Diagnosis**: `pg_stat_statements` showed the same plan executed 200 times for ~7.8 s total.
**Fix**: replaced with a `LATERAL JOIN` (alternatively `ROW_NUMBER()`) for a single round-trip.
**Verification**: orgs with 500 devices ran a single query at p95 320 ms.

<!-- SCREENSHOT: app-d-step40-dashboard-stat-n-plus-1-fix -->
<!-- /SCREENSHOT -->

---

## Security

---

### 41. SQL Injection Attempt — Verifying the Block — Security

<!-- SCREENSHOT: app-d-step41-sql-injection-blocked-error -->
<!-- /SCREENSHOT -->

**Symptom**: pen-test injected `'; DROP TABLE inspections; --` into a search query and the payload appeared in app logs.
**Cause**: Drizzle parameterization was safe end-to-end, but no observability marked the attempt.
**Diagnosis**: WAF/app logs returned zero matches for suspicious patterns; the DB log only showed the escaped form.
**Fix**: added input zod schemas, enabled Cloudflare WAF (OWASP CRS), and tagged Sentry breadcrumbs on suspicious patterns.
**Verification**: replaying the same payload now returns 403 at the WAF, raises a Sentry alert, and never reaches the database.

<!-- SCREENSHOT: app-d-step41-sql-injection-blocked-fix -->
<!-- /SCREENSHOT -->

---

### 42. Mutation Without CSRF Token — Security

<!-- SCREENSHOT: app-d-step42-csrf-missing-mutation-error -->
<!-- /SCREENSHOT -->

**Symptom**: a new `/api/devices/transfer` accepted POSTs without a CSRF token.
**Cause**: it was added as a raw route handler rather than a Server Action and bypassed the middleware that enforces CSRF.
**Diagnosis**: `curl` from a foreign origin returned 200 (it should have returned 403).
**Fix**: wrapped the handler in `withCsrf()`, made the wrapper mandatory for mutations, and added a `no-raw-mutation-route` ESLint rule.
**Verification**: the same `curl` returns 403; legitimate browser-origin requests succeed; new unit tests pass.

<!-- SCREENSHOT: app-d-step42-csrf-missing-mutation-fix -->
<!-- /SCREENSHOT -->

---

## UI / UX

---

### 43. iOS Safari Zooms In on Input Focus — UI / UX

<!-- SCREENSHOT: app-d-step43-ios-input-focus-zoom-error -->
<!-- /SCREENSHOT -->

**Symptom**: focusing an input in the inspection form caused iOS Safari to zoom to ~130%, disorienting users.
**Cause**: input `font-size` was 14 px; iOS triggers focus-zoom for any input under 16 px.
**Diagnosis**: real-device test confirmed 14 px computed font-size on inputs.
**Fix**: standardized inputs at `font-size: 16px`; applied `transform: scale(0.875)` where the design needed a smaller visual.
**Verification**: tested on iPhone 13, 15 Pro, and SE — no zoom on focus; visual size unchanged.

<!-- SCREENSHOT: app-d-step43-ios-input-focus-zoom-fix -->
<!-- /SCREENSHOT -->

---

### 44. Signature Canvas Blurry on Retina — UI / UX

<!-- SCREENSHOT: app-d-step44-signature-canvas-retina-blur-error -->
<!-- /SCREENSHOT -->

**Symptom**: signatures captured on retina iPads showed up blurry in the report.
**Cause**: the canvas used `width=400 height=200` only; `devicePixelRatio` (2x) was not applied.
**Diagnosis**: `toDataURL()` exported a 400×200 image into an 800×400 CSS area.
**Fix**: set `canvas.width = cssWidth * dpr`, called `ctx.scale(dpr, dpr)`, and kept CSS at the design width.
**Verification**: an iPad Pro signature now exports at 800×400; the PDF report stays sharp at 100% zoom.

<!-- SCREENSHOT: app-d-step44-signature-canvas-retina-blur-fix -->
<!-- /SCREENSHOT -->

---

## Capture Checklist

Two captures per case = 88 captures total.

### Year One: The Original Twelve

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
