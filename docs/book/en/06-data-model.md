---
title: "Chapter 6. The Data Model — Eight Tables"
slug: "data-model"
chapter: 6
words_target: 4000
screenshots:
  - ch06-step01-er-diagram
  - ch06-step02-drizzle-schema-tenants
  - ch06-step03-drizzle-schema-inspections
  - ch06-step04-migration-up-output
  - ch06-step05-pgadmin-table-list
  - ch06-step06-seed-fixture-output
---

# Chapter 6. The Data Model — Eight Tables

## Learning Objectives

- Map the eight core tables to the four workflow stages
- Apply four Drizzle best practices: shared timestamps, soft delete, enums, and disciplined JSONB
- Generate and apply migrations from the ER diagram automatically
- Reset to a clean integration-test state in under a second using seed fixtures
- Run zero-downtime column additions and removals using a three-phase pattern

## The Big Picture

We deliberately stopped the data model at **eight tables**. More and a
single screen starts spanning many domains; fewer and JSONB explodes. Eight
is the minimum-sufficient set we converged on after six months of
operation.

<!-- SCREENSHOT: ch06-step01-er-diagram -->
![ER diagram of the eight tables and their relations](../assets/screenshots/ch06-step01-er-diagram.png)
*Figure 6-1. tenants is the root, devices is the trunk, inspections are the leaves. signatures, photos, reports, notifications, audit_logs hang off each leaf.*
<!-- /SCREENSHOT -->

## 6.1 The Eight Tables

| # | Table | Purpose | Workflow stage |
|---|---|---|---|
| 1 | tenants | Sites/organizations | 0 (pre-auth) |
| 2 | users | Inspectors / administrators | 0 |
| 3 | devices | AED devices | 1, 2 |
| 4 | inspection_schedules | Monthly schedule | 1 |
| 5 | inspections | Inspection results (12 items) | 2 |
| 6 | signatures | E-signature with SHA-256 | 2 |
| 7 | photos | Photo metadata + R2 keys | 2 |
| 8 | reports | Monthly reports (DOCX/PDF) | 4 |
| (optional) | notifications | Notification queue | 1, 3 |
| (optional) | audit_logs | Audit log | all |

> Including the two optional tables makes ten. The body of the chapter
> focuses on the core eight; the actual migration file list appears in
> Appendix B.

## 6.2 tenants

```ts
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  plan: tenantPlanEnum("plan").notNull().default("standard"),
  ...timestamps(),
})
```

<!-- SCREENSHOT: ch06-step02-drizzle-schema-tenants -->
![tenants schema — unique slug constraint plus plan enum](../assets/screenshots/ch06-step02-drizzle-schema-tenants.png)
*Figure 6-2. drizzle/schema/tenants.ts. The slug is the entry point for layer 1 isolation, so its uniqueness constraint is critical.*
<!-- /SCREENSHOT -->

## 6.3 inspections

```ts
export const inspections = withTenantId(pgTable("inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id),
  scheduleId: uuid("schedule_id").references(() => inspectionSchedules.id),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull(),
  inspectorUserId: uuid("inspector_user_id").notNull().references(() => users.id),
  // 12 items live as 12 columns rather than a separate inspection_items table
  // (simpler indexing and queries)
  item01_padExpiry: date("item01_pad_expiry"),
  item02_batteryLevel: smallint("item02_battery_level"),
  // ... item03 ~ item12
  notes: text("notes"),
  status: inspectionStatusEnum("status").notNull().default("submitted"),
  ...timestamps(),
}))
```

<!-- SCREENSHOT: ch06-step03-drizzle-schema-inspections -->
![inspections schema — 12 explicit columns](../assets/screenshots/ch06-step03-drizzle-schema-inspections.png)
*Figure 6-3. drizzle/schema/inspections.ts. We chose explicit columns over JSONB for indexing, aggregation, and BI tool compatibility.*
<!-- /SCREENSHOT -->

### 6.3.1 Twelve columns vs JSONB

A single JSONB column looks tidy, but answering "which devices are about to
have expired pads this month?" in a millisecond requires explicit columns.
Appendix A details the 12 items.

## 6.4 Migrations

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

<!-- SCREENSHOT: ch06-step04-migration-up-output -->
![drizzle-kit migrate — eight tables and indexes created](../assets/screenshots/ch06-step04-migration-up-output.png)
*Figure 6-4. The first migration's terminal output: eight tables, fourteen indexes, two enums, all in one go.*
<!-- /SCREENSHOT -->

## 6.5 Verifying with pgAdmin

<!-- SCREENSHOT: ch06-step05-pgadmin-table-list -->
![pgAdmin showing the eight tables and two enums](../assets/screenshots/ch06-step05-pgadmin-table-list.png)
*Figure 6-5. The pgAdmin tree after migration. Visually verify that every table has a not-null tenant_id.*
<!-- /SCREENSHOT -->

## 6.6 Seed Data

A fixture pattern that resets the test environment in under a second.

```bash
pnpm seed:reset
```

<!-- SCREENSHOT: ch06-step06-seed-fixture-output -->
![Seed output: 3 tenants / 6 users / 100 devices / 600 inspections](../assets/screenshots/ch06-step06-seed-fixture-output.png)
*Figure 6-6. seed/reset.ts run output. Indispensable for starting integration tests from a known state.*
<!-- /SCREENSHOT -->

## 6.7 Zero-Downtime Migrations

Adding or removing columns in three phases for zero downtime:

1. **Expand**: add the new column; code reads both and writes the new one
2. **Backfill**: fill existing rows in the background
3. **Contract**: drop the old column

<!-- TODO: Add a real zero-downtime example (e.g., adding item13) -->

## 6.8 Shared Timestamp Helper

```ts
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})
```

Soft delete pairs nicely with audit requirements. Just remember to put
`deleted_at IS NULL` into every default query.

## Summary

- Eight tables is our minimum-sufficient set — preventing both JSONB sprawl and cross-domain screens
- Twelve items deliberately become twelve columns (BI queries and indexing first)
- Zero-downtime migrations follow Expand → Backfill → Contract
- A one-second seed reset is the foundation of stable integration tests

## Next Chapter

Next we combine Auth.js magic-link login with the multi-tenant context, and
look at exactly where the single line `session.user.tenantId` belongs.

## Capture Checklist

- [ ] `ch06-step01-er-diagram.png` — dbdiagram.io or Mermaid
- [ ] `ch06-step02-drizzle-schema-tenants.png`
- [ ] `ch06-step03-drizzle-schema-inspections.png`
- [ ] `ch06-step04-migration-up-output.png`
- [ ] `ch06-step05-pgadmin-table-list.png`
- [ ] `ch06-step06-seed-fixture-output.png`
