---
title: "Appendix D. Twelve Troubleshooting Cases"
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

# Appendix D. Twelve Troubleshooting Cases

## Learning Objectives

- Learn from twelve real incident patterns from a year of operating this SaaS
- Read each case in four parts: symptoms, root cause, immediate fix, prevention
- Compare error and resolution captures side by side

## The Big Picture

Operational depth is proportional to **the number of incidents you have
recorded**. The following twelve happened once and have not happened
since.

---

## D.1 cloudflared Tunnel Down

Symptom: status page 502, Kuma external monitor critical.

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-error -->
![Error — cloudflared container exited(1)](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-error.png)
*Figure D-1a. docker compose ps. Only cloudflared in red.*
<!-- /SCREENSHOT -->

Root cause: token expired. Fix: issue a new token, update `.env.production`,
`docker compose up -d cloudflared`.

<!-- SCREENSHOT: app-d-step01-cloudflared-tunnel-down-fix -->
![Fixed — cloudflared healthy again](../assets/screenshots/app-d-step01-cloudflared-tunnel-down-fix.png)
*Figure D-1b. Healthy in 30 seconds. Prevention: alert 30 days before token expiry.*
<!-- /SCREENSHOT -->

---

## D.2 Postgres "too many connections"

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-error -->
![Error — FATAL: sorry, too many clients already](../assets/screenshots/app-d-step02-postgres-too-many-connections-error.png)
*Figure D-2a. Hit at the 100-device mark.*
<!-- /SCREENSHOT -->

Fix: introduce pgbouncer (chapter 17).

<!-- SCREENSHOT: app-d-step02-postgres-too-many-connections-fix -->
![Fixed — active connections steady at 25](../assets/screenshots/app-d-step02-postgres-too-many-connections-fix.png)
*Figure D-2b.*
<!-- /SCREENSHOT -->

---

## D.3 Magic-Link "expired"

<!-- SCREENSHOT: app-d-step03-magic-link-expired-error -->
![Error — link expired after 5 minutes](../assets/screenshots/app-d-step03-magic-link-expired-error.png)
*Figure D-3a. User checked email late.*
<!-- /SCREENSHOT -->

Fix: a one-click "resend" button on the expired screen.

<!-- SCREENSHOT: app-d-step03-magic-link-expired-fix -->
![Fixed — friendly resend button](../assets/screenshots/app-d-step03-magic-link-expired-fix.png)
*Figure D-3b.*
<!-- /SCREENSHOT -->

---

## D.4 R2 Presigned URL 403

<!-- SCREENSHOT: app-d-step04-r2-presign-403-error -->
![Error — 403 SignatureDoesNotMatch on PUT](../assets/screenshots/app-d-step04-r2-presign-403-error.png)
*Figure D-4a. Content-Type header missing.*
<!-- /SCREENSHOT -->

Fix: align Content-Type at presign time and at PUT time.

<!-- SCREENSHOT: app-d-step04-r2-presign-403-fix -->
![Fixed — explicit Content-Type, 200](../assets/screenshots/app-d-step04-r2-presign-403-fix.png)
*Figure D-4b.*
<!-- /SCREENSHOT -->

---

## D.5 DOCX Template Render Failure

<!-- SCREENSHOT: app-d-step05-docx-template-render-error -->
![Error — docxtemplater unclosed loop](../assets/screenshots/app-d-step05-docx-template-render-error.png)
*Figure D-5a. Placeholder broken inside a table.*
<!-- /SCREENSHOT -->

Fix: paragraphLoop:true and split table placeholders into separate paragraphs.

<!-- SCREENSHOT: app-d-step05-docx-template-render-fix -->
![Fixed — clean render](../assets/screenshots/app-d-step05-docx-template-render-fix.png)
*Figure D-5b.*
<!-- /SCREENSHOT -->

---

## D.6 PDF Korean Font Boxed Out

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-error -->
![Error — PDF rendered as □□□](../assets/screenshots/app-d-step06-pdf-korean-font-broken-error.png)
*Figure D-6a. Font embed failed.*
<!-- /SCREENSHOT -->

Fix: embed Pretendard ttf and call Font.register explicitly.

<!-- SCREENSHOT: app-d-step06-pdf-korean-font-broken-fix -->
![Fixed — Korean characters render correctly](../assets/screenshots/app-d-step06-pdf-korean-font-broken-fix.png)
*Figure D-6b.*
<!-- /SCREENSHOT -->

---

## D.7 Resend Bounce Spike

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-error -->
![Error — bounce rate alarmed at 15%](../assets/screenshots/app-d-step07-resend-bounce-spike-error.png)
*Figure D-7a. SPF record propagation delay after a change.*
<!-- /SCREENSHOT -->

Fix: simplify SPF flat-include into ip4 ranges.

<!-- SCREENSHOT: app-d-step07-resend-bounce-spike-fix -->
![Fixed — bounce rate back to 0.5% within 24h](../assets/screenshots/app-d-step07-resend-bounce-spike-fix.png)
*Figure D-7b.*
<!-- /SCREENSHOT -->

---

## D.8 Cron Job Deadlock

<!-- SCREENSHOT: app-d-step08-cron-deadlock-error -->
![Error — backup-daily never finishes](../assets/screenshots/app-d-step08-cron-deadlock-error.png)
*Figure D-8a. Redis lock held while the container OOMed.*
<!-- /SCREENSHOT -->

Fix: enforce TTL plus try/finally cleanup.

<!-- SCREENSHOT: app-d-step08-cron-deadlock-fix -->
![Fixed — locks always release](../assets/screenshots/app-d-step08-cron-deadlock-fix.png)
*Figure D-8b.*
<!-- /SCREENSHOT -->

---

## D.9 Redis OOM

<!-- SCREENSHOT: app-d-step09-redis-oom-error -->
![Error — OOM command not allowed when used memory > 'maxmemory'](../assets/screenshots/app-d-step09-redis-oom-error.png)
*Figure D-9a. Nonces missing TTL accumulated.*
<!-- /SCREENSHOT -->

Fix: maxmemory-policy allkeys-lru plus mandatory EX on every nonce.

<!-- SCREENSHOT: app-d-step09-redis-oom-fix -->
![Fixed — memory steady](../assets/screenshots/app-d-step09-redis-oom-fix.png)
*Figure D-9b.*
<!-- /SCREENSHOT -->

---

## D.10 Drizzle Migration Failure

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-error -->
![Error — column "deleted_at" already exists](../assets/screenshots/app-d-step10-drizzle-migration-fail-error.png)
*Figure D-10a. Retried after a partial failure.*
<!-- /SCREENSHOT -->

Fix: make partially-failed migrations idempotent (IF NOT EXISTS).

<!-- SCREENSHOT: app-d-step10-drizzle-migration-fail-fix -->
![Fixed — re-run passes](../assets/screenshots/app-d-step10-drizzle-migration-fail-fix.png)
*Figure D-10b.*
<!-- /SCREENSHOT -->

---

## D.11 Clock Drift

<!-- SCREENSHOT: app-d-step11-clock-drift-error -->
![Error — JWT not valid yet (clock skew)](../assets/screenshots/app-d-step11-clock-drift-error.png)
*Figure D-11a. Host NTP not configured.*
<!-- /SCREENSHOT -->

Fix: install chrony and use the Cloudflare time service.

<!-- SCREENSHOT: app-d-step11-clock-drift-fix -->
![Fixed — chronyc tracking stable](../assets/screenshots/app-d-step11-clock-drift-fix.png)
*Figure D-11b.*
<!-- /SCREENSHOT -->

---

## D.12 Suspected Tenant Leak

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-error -->
![Error — integration test surfaces a leak path](../assets/screenshots/app-d-step12-tenant-leak-suspect-error.png)
*Figure D-12a. New route added without the chapter 5 test pattern.*
<!-- /SCREENSHOT -->

Fix: route enum auto-discovery so adding a new route automatically grows
the test set.

<!-- SCREENSHOT: app-d-step12-tenant-leak-suspect-fix -->
![Fixed — every route passes the leak test](../assets/screenshots/app-d-step12-tenant-leak-suspect-fix.png)
*Figure D-12b.*
<!-- /SCREENSHOT -->

---

## Capture Checklist

Two captures per case = 24 captures total.

- [ ] D.1 cloudflared (2)
- [ ] D.2 postgres (2)
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
