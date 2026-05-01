# CLAUDE.md — AED Inspection SaaS

> Project-specific instructions for Claude Code agents working on this repo.

## Project context

- **Domain**: 자동심장충격기(AED) 다기관 점검 관리 SaaS
- **Hosting**: abada-65 self-hosted (per `/data/saas-aed/`)
- **Edge**: Cloudflare Free (DNS · CDN · WAF · Tunnel · R2)
- **Stack**: Next.js 14 App Router · Drizzle ORM · PostgreSQL 16 · Redis 7 · Auth.js v5 (Magic Link via Resend) · Docker Compose

## Hard rules

1. **No Supabase, no Vercel.** Self-host everything on abada-65.
2. **All persistent data lives under `/data/saas-aed/`** on the host (per abada-65 convention; `/home` is forbidden).
3. **Multi-tenant guard 3계층** is non-negotiable:
   - L1: Auth.js callbacks inject `session.user.tenantId`
   - L2: `src/middleware.ts` validates and forwards `x-tenant-id`
   - L3: Direct `db.*` calls forbidden — use `withTenant(tenantId).devices()` etc.
4. **External services through adapters only** (`src/lib/storage`, `src/lib/email`). Never import `resend` or `@aws-sdk/client-s3` outside those folders.
5. **Secrets via `.env.production`** with file mode 600, root-owned. Never commit.
6. **Backups** are gpg-encrypted nightly to R2 — no plaintext dumps anywhere.

## Coding conventions

- TypeScript strict, `noUncheckedIndexedAccess: true`
- Files: ≤400 lines typical, ≤800 max
- Functions: ≤50 lines
- Imports: sort by group (node → external → @/* → relative)
- React Server Components by default; `"use client"` only when needed (forms, canvas, query hooks)
- Tailwind classes: order via `tailwind-merge`, mobile-first

## Tenant guard examples

```ts
// ❌ FORBIDDEN
import { db } from "@/lib/db"
const all = await db.select().from(devices) // missing tenant!

// ✅ REQUIRED
import { withTenant } from "@/lib/tenant/with-tenant"
const scope = withTenant(session.user.tenantId)
const all = await scope.devices().list()
```

## Inspection 12 items (canonical order)

```
OP_POWER, OP_PAD, OP_BATTERY,
BX_ALARM, BX_GUIDE, BX_EMG, BX_CPR, BX_EXP,
LOC_ENT, LOC_DIR,
DOC_FILE,
TIME_24
```

Use the constant from `src/lib/inspection/items.ts` (will be added in P4) — never hardcode.

## Capture-into-book workflow (적용 필수)

When you author or modify code in this repo, **capture screenshots at key moments and reference them in the book**:

1. After creating a new file → capture VS Code with file tree visible
2. After writing the core decision code (e.g., tenant guard helper) → capture the function body
3. After running a command (`pnpm db:migrate`, `docker compose up`) → capture terminal output
4. After build/test pass → capture green output
5. After UI lands → capture browser

File naming: `ch{NN}-step{NN}-{slug}.png` placed under `docs/book/assets/screenshots/`.

Marker in chapter markdown:

```markdown
<!-- SCREENSHOT: ch05-step03-with-tenant-helper -->
![withTenant 헬퍼 작성 — db.* 직접 호출을 막는 ESLint 규칙과 짝을 이룸](../assets/screenshots/ch05-step03-with-tenant-helper.png)
*그림 5-3. src/lib/tenant/with-tenant.ts — TenantScope 클래스의 .devices() 메서드 부분.*
<!-- /SCREENSHOT -->
```

Verify with `pnpm book:verify-screenshots`. Missing file behind a marker = CI fail.

Full guide: `docs/book/SCREENSHOT_WORKFLOW.md`.

## Language

- **Responses**: Korean (한국어)
- **Code, identifiers, commit messages**: English
- **Book**: ko + en parallel; ko is canonical, en is naturalized translation (no literal)

## Useful commands

```bash
pnpm dev                      # local dev
pnpm cron:dev                 # cron worker
pnpm db:generate && db:migrate
pnpm typecheck && pnpm lint && pnpm test
pnpm book:build               # build PDF/DOCX (ko + en)
pnpm book:verify-screenshots  # check capture markers
docker compose up -d          # full stack
```
