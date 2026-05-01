---
title: "Chapter 15. Monitoring — Uptime Kuma + Cloudflare Analytics"
slug: "monitoring"
chapter: 15
words_target: 3500
screenshots:
  - ch15-step01-uptime-kuma-dashboard
  - ch15-step02-status-page-public
  - ch15-step03-cloudflare-analytics-traffic
  - ch15-step04-alert-routing-table
  - ch15-step05-incident-postmortem-template
---

# Chapter 15. Monitoring — Uptime Kuma + Cloudflare Analytics

## Learning Objectives

- Operate push and pull monitors as separate concerns in Uptime Kuma
- Read edge traffic, WAF blocks, and error rates in Cloudflare Analytics
- Design four-tier alert routing: Slack → KakaoWork → phone → page
- Apply five rules for deciding whether an alert is "worth waking up for"
- Use a postmortem template to keep one incident from happening twice

## The Big Picture

The point of monitoring is not pretty graphs. It is **only receiving alerts
worth waking up for**. Bad alerts cry wolf and immunize you against the
real ones. We keep the alert catalog small.

<!-- SCREENSHOT: ch15-step01-uptime-kuma-dashboard -->
![Uptime Kuma dashboard — twelve monitors over thirty days](../assets/screenshots/ch15-step01-uptime-kuma-dashboard.png)
*Figure 15-1. Twelve monitors (six container, six cron push). 99.95% or better.*
<!-- /SCREENSHOT -->

## 15.1 Push vs Pull

| Type | Suited for |
|---|---|
| Pull (Kuma probes) | External URLs, container health |
| Push (the job notifies) | Cron jobs, backups, drills |

Push is the keystone of the cron silence alarm covered in chapter 12.

## 15.2 Public Status Page

```
https://status.aed.example.kr
```

<!-- SCREENSHOT: ch15-step02-status-page-public -->
![Public status page — trust signal + incident history](../assets/screenshots/ch15-step02-status-page-public.png)
*Figure 15-2. Showing site managers in one second whether the SaaS is alive is the start of trust.*
<!-- /SCREENSHOT -->

## 15.3 Cloudflare Analytics

We watch edge-layer traffic, cache hit rate, WAF blocks, and 5xx ratio.

<!-- SCREENSHOT: ch15-step03-cloudflare-analytics-traffic -->
![Cloudflare Analytics — 30-day traffic + WAF blocks](../assets/screenshots/ch15-step03-cloudflare-analytics-traffic.png)
*Figure 15-3. Daily PV ~3K, ~50 WAF blocks. 49 are bot scans, 1 might be valid traffic — review for false positives.*
<!-- /SCREENSHOT -->

## 15.4 Four-Tier Alert Routing

<!-- SCREENSHOT: ch15-step04-alert-routing-table -->
![Alert routing table — Severity → channel](../assets/screenshots/ch15-step04-alert-routing-table.png)
*Figure 15-4. info=Slack, warn=KakaoWork, critical=phone, emergency=direct page. Worth-waking-up starts at critical.*
<!-- /SCREENSHOT -->

## 15.5 Five "Worth Waking Up" Rules

1. **Is there visible user impact?** (No → morning queue)
2. **Can it auto-recover within 30 minutes?** (Yes → morning queue)
3. **Is it report / magic-link / cron core?** (Yes → immediate)
4. **Has it repeated more than twice?** (Repetition can mean noise)
5. **Are we near month-end deadline?** (More sensitive in the last five days)

<!-- TODO: Add a year of false-positive ratio statistics -->

## 15.6 Postmortem Template

```markdown
# Postmortem: <one-line summary>
- Date / Severity
- What happened
- Why (5 whys)
- Impact (N users, X minutes)
- Detection (alert? user report? automated?)
- Action items (checkboxes)
```

<!-- SCREENSHOT: ch15-step05-incident-postmortem-template -->
![Postmortem template — one incident, one page](../assets/screenshots/ch15-step05-incident-postmortem-template.png)
*Figure 15-5. docs/incidents/2026-01-15-cron-deadlock.md. Draft within 30 minutes of the incident; action-item PRs within a week.*
<!-- /SCREENSHOT -->

## Summary

- Restraint in alerting is what makes alerts trustworthy — keep the catalog small
- Combine push (cron silence) and pull (external health) for two-axis coverage
- Cloudflare Analytics gives us half the edge layer for free
- One postmortem per incident, one page each — learning compounds

## Next Chapter

Next we keep the codebase free of vendor lock-in via the adapter pattern,
so we can swap to a different infrastructure in 30 minutes if needed.

## Capture Checklist

- [ ] `ch15-step01-uptime-kuma-dashboard.png`
- [ ] `ch15-step02-status-page-public.png`
- [ ] `ch15-step03-cloudflare-analytics-traffic.png`
- [ ] `ch15-step04-alert-routing-table.png`
- [ ] `ch15-step05-incident-postmortem-template.png`
