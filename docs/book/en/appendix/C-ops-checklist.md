---
title: "Appendix C. Operations Checklist"
slug: "appendix-ops-checklist"
appendix: "C"
words_target: 2000
screenshots:
  - app-c-step01-daily-checklist
  - app-c-step02-weekly-checklist
  - app-c-step03-monthly-checklist
  - app-c-step04-runbook-template
---

# Appendix C. Operations Checklist

## Learning Objectives

- Identify daily / weekly / monthly / quarterly checklists
- Assign explicit time costs and put them on the calendar
- Use a runbook template to shorten incident response time

## The Big Picture

The real cost of operations is **forgetting**. A five-minute task you
skipped today becomes an incident a month later. Checklists drive that
forgetting cost toward zero.

## C.1 Daily Checklist (5 minutes)

- [ ] Uptime Kuma — every monitor green
- [ ] Slack #ops channel — zero alerts
- [ ] Yesterday's backup-daily push received
- [ ] Yesterday's retry-failed dead-letter is empty
- [ ] Cloudflare Analytics — 5xx under 1%

<!-- SCREENSHOT: app-c-step01-daily-checklist -->
![Daily checklist — Notion / Linear template](../assets/screenshots/app-c-step01-daily-checklist.png)
*Figure C-1. A task auto-created at 09:00 every day. Once checked, it auto-reports to Slack.*
<!-- /SCREENSHOT -->

## C.2 Weekly Checklist (30 minutes)

- [ ] R2 usage and cost trend
- [ ] DB disk usage under 80%
- [ ] Merge dependabot/renovate PRs
- [ ] Pending site onboarding tasks
- [ ] Postmortem action-item progress

<!-- SCREENSHOT: app-c-step02-weekly-checklist -->
![Weekly checklist — Friday 16:00](../assets/screenshots/app-c-step02-weekly-checklist.png)
*Figure C-2. Friday afternoon's 30-minute routine — clear potential incidents before the weekend.*
<!-- /SCREENSHOT -->

## C.3 Monthly Checklist (2 hours)

- [ ] Verify monthly report generation and delivery (95%+ delivery)
- [ ] Sample restore test (one backup)
- [ ] Secret rotation (forced quarterly; otherwise ops judgment)
- [ ] Review WAF rules and CSP
- [ ] Write the operations cost report (R2 / Resend / server)

<!-- SCREENSHOT: app-c-step03-monthly-checklist -->
![Monthly checklist — first Tuesday at 14:00](../assets/screenshots/app-c-step03-monthly-checklist.png)
*Figure C-3. The core ritual of one-person operations. Tuesday because Monday is for processing weekend incidents.*
<!-- /SCREENSHOT -->

## C.4 Quarterly Checklist (Half a Day)

- [ ] Forced secret rotation (all API keys)
- [ ] Renew gpg keys 30 days before expiry
- [ ] Review major dependency upgrades
- [ ] Re-run the load test (k6)
- [ ] Dry run the adapters (Storage / Email)

## C.5 Runbook Template

```markdown
# Runbook: <event-name>
## When this happens
- Trigger condition (e.g., backup-daily push not received for 30 minutes)

## Symptoms
- Kuma critical alert (URL: ...)

## Steps
1. SSH into abada-65
2. docker compose logs cron-worker --tail=200
3. ... (steps that complete in five minutes)

## Rollback
- ...

## Postmortem
- A one-page report under docs/incidents/
```

<!-- SCREENSHOT: app-c-step04-runbook-template -->
![Runbook template — one page per incident](../assets/screenshots/app-c-step04-runbook-template.png)
*Figure C-4. docs/runbooks/ directory. Designed to open and follow within five minutes of an incident.*
<!-- /SCREENSHOT -->

## Capture Checklist

- [ ] `app-c-step01-daily-checklist.png`
- [ ] `app-c-step02-weekly-checklist.png`
- [ ] `app-c-step03-monthly-checklist.png`
- [ ] `app-c-step04-runbook-template.png`
