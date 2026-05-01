---
title: "Chapter 17. From 1,000 to 10,000 — A Scaling Roadmap"
slug: "scaling"
chapter: 17
words_target: 4000
screenshots:
  - ch17-step01-scaling-stages-roadmap
  - ch17-step02-postgres-pgbouncer-pool
  - ch17-step03-read-replica-routing
  - ch17-step04-r2-cost-projection
  - ch17-step05-tenant-shard-partitioning
  - ch17-step06-load-test-k6-result
---

# Chapter 17. From 1,000 to 10,000 — A Scaling Roadmap

## Learning Objectives

- Identify what breaks at 100, 1,000, and 10,000 devices
- Decide when and how to introduce pgbouncer plus read replicas
- Quantify the threshold for moving large tenants to dedicated shards
- Use k6 to measure scale ceilings before they hit you in production
- Map the four decision triggers for moving from single host to multi host

## The Big Picture

From 100 to 1,000 devices, **vertical scaling** (bigger server) is enough.
Somewhere between 1,000 and 10,000 the horizontal-scaling decision becomes
real. This chapter is a roadmap for finding that threshold and preparing
ahead of time.

<!-- SCREENSHOT: ch17-step01-scaling-stages-roadmap -->
![Scaling roadmap — 100 / 1K / 10K stages](../assets/screenshots/ch17-step01-scaling-stages-roadmap.png)
*Figure 17-1. What breaks at each stage, what we add, and what it costs. Read replicas and pgbouncer arrive between 1K and 10K.*
<!-- /SCREENSHOT -->

## 17.1 100 Devices — Vertical Only

4 vCPU / 8GB RAM / 200GB NVMe. The book's chapters 1–16 as written. P95
under 200ms, monthly reports in five minutes.

## 17.2 1,000 Devices — pgbouncer + Cache

DB connection count starts to bite. pgbouncer pools.

```yaml
# docker-compose.yml additions
pgbouncer:
  image: edoburu/pgbouncer
  environment:
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 1000
    DEFAULT_POOL_SIZE: 25
```

<!-- SCREENSHOT: ch17-step02-postgres-pgbouncer-pool -->
![pgbouncer stats — 1000 clients, 25 DB connections](../assets/screenshots/ch17-step02-postgres-pgbouncer-pool.png)
*Figure 17-2. pgbouncer SHOW POOLS. Client surges are isolated from the DB connection limit.*
<!-- /SCREENSHOT -->

### 17.2.1 Redis Cache

Hot data — tenant metadata, device metadata, "this month's schedule" — gets
a 60-second TTL.

## 17.3 5,000 Devices — Read Replica

Master collapses under monthly report generation. Split off a read replica.

<!-- SCREENSHOT: ch17-step03-read-replica-routing -->
![Read replica routing — query vs mutation in Drizzle](../assets/screenshots/ch17-step03-read-replica-routing.png)
*Figure 17-3. lib/db/routing.ts. Selects go to the replica; insert/update/delete go to master. An ESLint rule catches mistakes.*
<!-- /SCREENSHOT -->

### 17.3.1 The Consistency Trap

INSERT a row, immediately SELECT it, and it isn't there. We handle this
with a "5-second read-after-write" guarantee scoped by transaction context.
Following 17.3 carelessly causes incidents.

## 17.4 10,000 Devices — Per-Large-Tenant Shards

A single large facility (say, a 200-device university hospital) starts
consuming 30% of the load. This is when we introduce **selective Silo** —
the decision deferred from chapter 5.

<!-- SCREENSHOT: ch17-step05-tenant-shard-partitioning -->
![Tenant shard router — tenantId → shard mapping](../assets/screenshots/ch17-step05-tenant-shard-partitioning.png)
*Figure 17-4. lib/db/shard.ts. Start with a default shard plus a dedicated shard for the big tenant; the mapping table itself becomes an operational asset.*
<!-- /SCREENSHOT -->

## 17.5 R2 Cost Curve

<!-- SCREENSHOT: ch17-step04-r2-cost-projection -->
![R2 cost projection — ~$80/month at 10K devices](../assets/screenshots/ch17-step04-r2-cost-projection.png)
*Figure 17-5. 10K devices × 5 years × 12-item photos ≈ 1.2TB. R2 storage $20 + Class A $5 + Class B $5.*
<!-- /SCREENSHOT -->

## 17.6 k6 Load Tests

```js
// load-tests/inspection-submit.js
import http from "k6/http"
export const options = { vus: 200, duration: "5m" }
export default function () {
  http.post("https://staging.aed.example.kr/api/inspection", JSON.stringify(payload))
}
```

<!-- SCREENSHOT: ch17-step06-load-test-k6-result -->
![k6 result — P95 180ms, error rate 0.1%](../assets/screenshots/ch17-step06-load-test-k6-result.png)
*Figure 17-6. 200 concurrent VUs for 5 minutes. P95 of 180ms gives safe margin at 1K. The 10K target uses 5x of this baseline.*
<!-- /SCREENSHOT -->

## 17.7 Four Decision Triggers

If two or more of the following stay yes for a sustained period, move to
the next stage.

1. **P95 over 200ms for a full month**
2. **Monthly report generation over 30 minutes**
3. **DB connection usage over 80%**
4. **R2 storage over 1TB**

## 17.8 Moving from Single to Multi Host

When this point arrives, start with abada-65 plus a secondary
(active-passive). The chapter 16 adapter pattern supports this transition.

<!-- TODO: After a year of production, add the actual P95 trend chart -->

## Summary

- Up to 100 devices: the book as written. At 1,000: pgbouncer + Redis cache
- At 5,000: read replica. At 10,000: selective Silo for large tenants
- Make the four decision triggers explicit — decide on numbers, not feelings
- The chapter 16 adapter pattern combined with this roadmap absorbs future variability

## Next Chapter

The book's body ends here. The four appendices follow: the 12-item form,
the 25 environment variables, the operations checklist, and twelve
troubleshooting cases. The book ends; operations begin.

## Capture Checklist

- [ ] `ch17-step01-scaling-stages-roadmap.png`
- [ ] `ch17-step02-postgres-pgbouncer-pool.png`
- [ ] `ch17-step03-read-replica-routing.png`
- [ ] `ch17-step04-r2-cost-projection.png`
- [ ] `ch17-step05-tenant-shard-partitioning.png`
- [ ] `ch17-step06-load-test-k6-result.png`
