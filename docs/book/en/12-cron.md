---
title: "Chapter 12. cron-worker and the Six Jobs"
slug: "cron"
chapter: 12
words_target: 3500
screenshots:
  - ch12-step01-cron-worker-dockerfile
  - ch12-step02-six-jobs-schedule-table
  - ch12-step03-job-execution-log
  - ch12-step04-distributed-lock-redis
  - ch12-step05-uptime-kuma-cron-monitor
  - ch12-step06-failure-retry-pattern
---

# Chapter 12. cron-worker and the Six Jobs

## Learning Objectives

- Bundle six jobs reliably into one cron-worker container
- Prevent duplicate execution via Redis distributed locks
- Apply retry / backoff / alert patterns on failure
- Verify "the jobs are running" externally with Uptime Kuma push monitors
- Diagram the job dependency graph and decide execution order

## The Big Picture

cron-worker is the SaaS's heartbeat. Six jobs must run on time at midnight,
on the first of the month, and every fifteen minutes. A single skipped beat
silently produces missed inspections, missed reports, and missed backups
all at once. We bundle six jobs into one container, then isolate them with
**Redis distributed locks plus Uptime Kuma push monitors**.

<!-- SCREENSHOT: ch12-step01-cron-worker-dockerfile -->
![cron-worker Dockerfile — node:20-alpine + tini](../assets/screenshots/ch12-step01-cron-worker-dockerfile.png)
*Figure 12-1. cron-worker's Dockerfile. tini handles PID 1 signals; the healthcheck watches the timestamp of the most recent job execution.*
<!-- /SCREENSHOT -->

## 12.1 The Six Jobs

| # | Job | cron | Purpose |
|---|---|---|---|
| 1 | schedule-monthly | `0 0 1 * *` | Auto-create the month's inspections |
| 2 | report-monthly | `0 2 1 * *` | Generate last month's reports in bulk |
| 3 | notify-deadline | `0 9 25-31 * *` | Reminders during the last five days |
| 4 | backup-daily | `0 3 * * *` | DB dump + R2 mirror at 03:00 |
| 5 | cleanup-stale | `*/15 * * * *` | Sweep expired tokens/sessions every 15 minutes |
| 6 | retry-failed | `*/5 * * * *` | Retry failed queue items every 5 minutes |

<!-- SCREENSHOT: ch12-step02-six-jobs-schedule-table -->
![Six jobs registered in jobs/index.ts](../assets/screenshots/ch12-step02-six-jobs-schedule-table.png)
*Figure 12-2. cron-worker/src/jobs/index.ts. Keeping all six registrations in a single file prioritizes readability.*
<!-- /SCREENSHOT -->

## 12.2 Redis Distributed Lock

```ts
async function withLock(key: string, ttlMs: number, fn: () => Promise<void>) {
  const ok = await redis.set(`lock:${key}`, instanceId, "PX", ttlMs, "NX")
  if (!ok) return // another instance is running
  try { await fn() }
  finally { await redis.del(`lock:${key}`) }
}
```

<!-- SCREENSHOT: ch12-step04-distributed-lock-redis -->
![redis-cli MONITOR — SETNX → fn → DEL](../assets/screenshots/ch12-step04-distributed-lock-redis.png)
*Figure 12-3. Even with two cron-worker instances running, a job executes exactly once.*
<!-- /SCREENSHOT -->

## 12.3 Job Execution Log

<!-- SCREENSHOT: ch12-step03-job-execution-log -->
![Structured logging — JSON lines with duration_ms](../assets/screenshots/ch12-step03-job-execution-log.png)
*Figure 12-4. job, run_id, status, duration_ms, error all on one line. grep is enough; no need for CloudWatch or Datadog.*
<!-- /SCREENSHOT -->

## 12.4 External Watch — Uptime Kuma Push Monitors

```ts
const url = process.env.KUMA_PUSH_URL_REPORT_MONTHLY
await fetch(`${url}?status=up&msg=ok&ping=${duration}`)
```

<!-- SCREENSHOT: ch12-step05-uptime-kuma-cron-monitor -->
![Uptime Kuma — six push monitors for six jobs](../assets/screenshots/ch12-step05-uptime-kuma-cron-monitor.png)
*Figure 12-5. After each job, push to Kuma. "Yesterday's 03:00 backup didn't arrive" alarms within five minutes.*
<!-- /SCREENSHOT -->

### 12.4.1 Why Push, Not Pull

In the pull model (Kuma waking jobs), if a job dies Kuma goes silent too.
Push alarms when nothing arrives — a one-direction reliability that suits
cron jobs.

## 12.5 Failure Pattern

<!-- SCREENSHOT: ch12-step06-failure-retry-pattern -->
![Retry backoff: 5s → 30s → 5min → dead-letter](../assets/screenshots/ch12-step06-failure-retry-pattern.png)
*Figure 12-6. The retry-failed job's backoff curve. After the fourth failure the item moves to dead-letter for human review.*
<!-- /SCREENSHOT -->

| Stage | Action |
|---|---|
| 1st failure | Retry after 5s |
| 2nd failure | Retry after 30s |
| 3rd failure | Retry after 5 minutes |
| 4th failure | Dead-letter + admin alert |

## 12.6 Dependency Graph

```
schedule-monthly → notify-deadline (reflects schedule edits)
report-monthly → email-send (queue trigger)
backup-daily → r2-mirror (after backup)
```

<!-- TODO: Add a dependency graph visualization screenshot -->

## Summary

- One container holds six jobs; the boundary between them is a Redis distributed lock
- External watch is a push model — silence is the alarm
- Four-stage retry backoff plus a dead-letter is the standard
- Make dependency graphs explicit — implicit ordering is the dangerous kind

## Next Chapter

Next we walk a fresh Ubuntu server through Docker Compose plus Cloudflare
Tunnel, end to end.

## Capture Checklist

- [ ] `ch12-step01-cron-worker-dockerfile.png`
- [ ] `ch12-step02-six-jobs-schedule-table.png`
- [ ] `ch12-step03-job-execution-log.png`
- [ ] `ch12-step04-distributed-lock-redis.png`
- [ ] `ch12-step05-uptime-kuma-cron-monitor.png`
- [ ] `ch12-step06-failure-retry-pattern.png`
