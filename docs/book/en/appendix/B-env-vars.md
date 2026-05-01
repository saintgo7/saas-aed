---
title: "Appendix B. Complete Environment Variables List"
slug: "appendix-env-vars"
appendix: "B"
words_target: 2000
screenshots:
  - app-b-step01-env-example-file
  - app-b-step02-env-validation-zod
  - app-b-step03-doppler-or-1password-secret
---

# Appendix B. Complete Environment Variables List

## Learning Objectives

- Organize 25 environment variables into 5 categories
- Apply Zod validation to every variable
- Compare three secret-storage options: `.env`, Doppler, 1Password

## The Big Picture

Environment variables are one of the most common operational incidents.
A single missing line stops the SaaS from booting; a single typo opens a
security hole. We **validate 100% with Zod at startup**.

<!-- SCREENSHOT: app-b-step01-env-example-file -->
![.env.example — five visual categories](../assets/screenshots/app-b-step01-env-example-file.png)
*Figure B-1. # ===== Auth =====, # ===== DB =====, # ===== Storage =====, # ===== Email =====, # ===== Cron/Ops ===== group the file visually.*
<!-- /SCREENSHOT -->

## B.1 Variables by Category

### Auth
- `AUTH_SECRET` — 32-byte random
- `AUTH_URL` — `https://aed.example.kr`
- `AUTH_TRUST_HOST` — `true` (behind cloudflared)
- `MAGIC_LINK_TTL_MIN` — 5

### DB
- `DATABASE_URL` — Postgres
- `REDIS_URL` — Redis
- `DB_SSL` — `require` / `disable`

### Storage
- `STORAGE_PROVIDER` — `r2` / `s3`
- `STORAGE_ENDPOINT` — `https://<acct>.r2.cloudflarestorage.com`
- `STORAGE_ACCESS_KEY` — secret
- `STORAGE_SECRET_KEY` — secret
- `STORAGE_BUCKET_PRIMARY` — `aed-prod`
- `STORAGE_BUCKET_BACKUP` — `aed-backup-r2`

### Email
- `EMAIL_PROVIDER` — `resend` / `ses`
- `RESEND_API_KEY` — secret
- `EMAIL_FROM_AUTH` — `auth@aed.example.kr`
- `EMAIL_FROM_REPORTS` — `reports@aed.example.kr`

### Cron / Ops
- `KUMA_PUSH_URL_SCHEDULE`
- `KUMA_PUSH_URL_REPORT`
- `KUMA_PUSH_URL_BACKUP`
- `KUMA_PUSH_URL_NOTIFY`
- `KUMA_PUSH_URL_CLEANUP`
- `KUMA_PUSH_URL_RETRY`
- `BACKUP_GPG_RECIPIENT` — `backup@aed.example.kr`
- `CLOUDFLARED_TOKEN` — secret

Total: 25.

## B.2 Zod Validation

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
![Zod failure aborts boot with a friendly message](../assets/screenshots/app-b-step02-env-validation-zod.png)
*Figure B-2. AUTH_SECRET missing → "AUTH_SECRET: Required" with clean exit. Saves operator time.*
<!-- /SCREENSHOT -->

## B.3 Storing Secrets

| Option | Pros | Cons |
|---|---|---|
| `.env.production` file | Simple | Weak access control and backup |
| Doppler | Auto-rotation, audit log | External dependency |
| 1Password CLI | Both human and machine | More configuration |

For a one-person operation, start with `.env.production` plus an offline
backup; once the team grows, recommend 1Password CLI.

<!-- SCREENSHOT: app-b-step03-doppler-or-1password-secret -->
![1Password CLI — `op run --` injects secrets](../assets/screenshots/app-b-step03-doppler-or-1password-secret.png)
*Figure B-3. The `op run -- docker compose up` pattern. The .env file never lands on disk.*
<!-- /SCREENSHOT -->

## Capture Checklist

- [ ] `app-b-step01-env-example-file.png`
- [ ] `app-b-step02-env-validation-zod.png`
- [ ] `app-b-step03-doppler-or-1password-secret.png`
