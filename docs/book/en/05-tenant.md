---
title: "Chapter 5. Three-Layer Multi-tenant Isolation"
slug: "tenant"
chapter: 5
words_target: 4000
screenshots:
  - ch05-step01-three-layer-diagram
  - ch05-step02-url-tenant-routing
  - ch05-step03-tenant-id-column-schema
  - ch05-step04-drizzle-tenant-guard-helper
  - ch05-step05-cross-tenant-leak-test
---

# Chapter 5. Three-Layer Multi-tenant Isolation

## Learning Objectives

- Compare the four classic multi-tenant isolation patterns (Pool, Bridge, Silo, Hybrid)
- Implement three layers of isolation (URL, DB column, query guard) with concrete code
- Set up triple guardrails for an area where one missing line equals a data leak
- Write integration tests that automatically detect cross-tenant leakage
- Achieve equivalent safety to RLS in an environment that has none

## The Big Picture

The most terrifying incident in a multi-tenant SaaS is "Site A's
administrator sees Site B's data." A single occurrence ends the SaaS. With
no RLS available on a self-hosted Postgres, we substitute **three layers
of guardrails**.

1. **URL layer** — the tenant is in the path: `/{tenantSlug}/...`
2. **DB layer** — every private table has a not-null `tenant_id` column
3. **Query layer** — queries that bypass `withTenant()` fail to compile

<!-- SCREENSHOT: ch05-step01-three-layer-diagram -->
![Three-layer isolation: URL, DB, Query](../assets/screenshots/ch05-step01-three-layer-diagram.png)
*Figure 5-1. Three gates a request must pass through. Defense in depth — even if one gate fails, the other two stop the leak.*
<!-- /SCREENSHOT -->

## 5.1 Layer 1 — URL Tenant Routing

We use Next.js 14 App Router dynamic segments to put the tenant in the
path: `app/[tenantSlug]/...`. Every page and API route receives
`params.tenantSlug`, resolves it to a `tenant_id`, and binds it to the
request context.

<!-- SCREENSHOT: ch05-step02-url-tenant-routing -->
![File tree: app/[tenantSlug]/(authenticated)/inspect](../assets/screenshots/ch05-step02-url-tenant-routing.png)
*Figure 5-2. Marketing pages live directly under `app/`; the SaaS body lives under `[tenantSlug]/`. The single/multi-tenant split is settled by routing alone.*
<!-- /SCREENSHOT -->

### 5.1.1 Slug resolver

```ts
// src/lib/tenant/resolve.ts (sample)
export async function resolveTenant(slug: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  })
  if (!tenant) notFound()
  return tenant
}
```

<!-- TODO: Replace with a real excerpt from src/lib/tenant/resolve.ts -->

## 5.2 Layer 2 — DB Column Enforcement

Every private table has a `tenantId` column declared `notNull()`. We use a
Drizzle helper that makes it impossible to forget.

<!-- SCREENSHOT: ch05-step03-tenant-id-column-schema -->
![Drizzle schema with the withTenantId() helper](../assets/screenshots/ch05-step03-tenant-id-column-schema.png)
*Figure 5-3. drizzle/schema/_helpers.ts. Every domain table must pass through `withTenantId()` or the type system rejects it.*
<!-- /SCREENSHOT -->

### 5.2.1 Indexes

We add a composite `(tenant_id, ...)` index on every lookup key so the
tenant filter does not blow up scan cost.

```sql
CREATE INDEX idx_inspections_tenant_device_date
  ON inspections (tenant_id, device_id, inspected_at DESC);
```

## 5.3 Layer 3 — Query Guard (`withTenant`)

We forbid using `db` directly. Code uses `tenantDb(ctx)` only.
`tenantDb` automatically injects `where eq(table.tenantId, ctx.tenantId)`
into every select, insert, update, and delete.

<!-- SCREENSHOT: ch05-step04-drizzle-tenant-guard-helper -->
![withTenant helper — Proxy-based automatic injection](../assets/screenshots/ch05-step04-drizzle-tenant-guard-helper.png)
*Figure 5-4. src/lib/tenant/db.ts. A `Proxy` wraps Drizzle's query builder and adds the tenant filter to every where clause. This single function is the keystone.*
<!-- /SCREENSHOT -->

### 5.3.1 Build gate

An ESLint rule forbids `import { db } from '@/lib/db'` in application code,
allowing only `tenantDb` or `publicDb` (for genuinely public tables).

<!-- TODO: Insert the actual .eslintrc.cjs rule excerpt -->

## 5.4 Comparing the Four Patterns

| Pattern | Isolation | Cost | Used here |
|---|---|---|---|
| Pool (single DB, tenant_id column) | Low | Very low | **Yes — combined with three-layer guards** |
| Bridge (single DB, schema-per-tenant) | Medium | Low | No — migration complexity |
| Silo (DB-per-tenant) | High | Very high | No — explosive cost at 10K |
| Hybrid | Variable | Variable | Considered for a few large tenants past 10K (chapter 17) |

## 5.5 Cross-tenant Leak Tests

<!-- SCREENSHOT: ch05-step05-cross-tenant-leak-test -->
![Cross-tenant leak test caught by integration tests](../assets/screenshots/ch05-step05-cross-tenant-leak-test.png)
*Figure 5-5. tests/integration/tenant-leak.spec.ts. Using tenant A's token to fetch tenant B's inspectionId must yield 404 — not 200, not 403. Applied automatically to every protected route.*
<!-- /SCREENSHOT -->

```ts
// pseudo-code
for (const route of allProtectedRoutes) {
  test(`${route} blocks cross-tenant`, async () => {
    const res = await fetch(route, { headers: tokenForA })
    expect(res.status).toBe(404)  // not 200, not 403
  })
}
```

We return 404 because 403 leaks the existence of the resource.

## 5.6 Equivalent Safety Without RLS

Postgres RLS is powerful, but we substitute the **compiler and ESLint**.
Queries that miss `tenantDb` fail to build, and code that fails to build
does not deploy. It is not identical, but it is enough.

## Summary

- Three-layer isolation (URL, DB, Query) is our equivalent of RLS in a no-RLS environment
- The single function `tenantDb` is the keystone of leak prevention
- Build-time ESLint rules plus integration tests prevent the guardrails from being weakened
- The Silo pattern returns as a partial option in chapter 17 for very large tenants

## Next Chapter

Next we look at the eight core tables, how each table maps to the four
workflow stages, and the ER diagram that ties them together.

## Capture Checklist

- [ ] `ch05-step01-three-layer-diagram.png`
- [ ] `ch05-step02-url-tenant-routing.png`
- [ ] `ch05-step03-tenant-id-column-schema.png`
- [ ] `ch05-step04-drizzle-tenant-guard-helper.png`
- [ ] `ch05-step05-cross-tenant-leak-test.png`
