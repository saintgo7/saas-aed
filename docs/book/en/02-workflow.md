---
title: "Chapter 2. Discovering the Four-Stage Workflow"
slug: "workflow"
chapter: 2
words_target: 3000
screenshots:
  - ch02-step01-workflow-diagram
  - ch02-step02-mobile-inspection-flow
  - ch02-step03-admin-review-screen
  - ch02-step04-monthly-report-pdf
  - ch02-step05-information-architecture
---

# Chapter 2. Discovering the Four-Stage Workflow

## Learning Objectives

- Understand why the inspection workflow decomposes into four stages: Schedule, Inspect, Review, Report
- Identify who, on which screen, with what inputs and outputs, acts at each stage
- Explain the principle of mobile-first (inspector) plus desktop-first (administrator)
- Diagram the mapping between workflow stages and the domain model
- Show how the workflow diagram directly drives the IA (information architecture)

## The Big Picture

A paper checklist collapses everything into one step: "fill in the boxes."
Digitizing pries that single step apart into four — **Schedule, Inspect,
Review, Report**. Each stage has a different user, a different screen, and
different validation rules. These four stages form the skeleton of the IA.

<!-- SCREENSHOT: ch02-step01-workflow-diagram -->
![Four-stage pipeline: Schedule, Inspect, Review, Report](../assets/screenshots/ch02-step01-workflow-diagram.png)
*Figure 2-1. The pipeline reads left to right. Each arrow is labeled with input, output, and the role responsible.*
<!-- /SCREENSHOT -->

## 2.1 Stage 1 — Schedule

At 00:00 on the first of every month, the cron-worker creates the month's
inspection schedule for every active AED. Nobody clicks "create 100
inspections this month."

<!-- TODO: Cross-link to the cron-worker code in chapter 12 -->

### 2.1.1 Trigger

- cron expression: `0 0 1 * *` (first of the month, midnight)
- input: list of active devices
- output: N rows in `inspection_schedule`

### 2.1.2 Failure mode

If the cron container is down, the schedule is never created. Uptime Kuma
covers this gap (chapter 15).

## 2.2 Stage 2 — Inspect

The inspector fills the 12-item form on a phone, draws a signature, and
attaches a photo.

<!-- SCREENSHOT: ch02-step02-mobile-inspection-flow -->
![Five mobile screens in sequence: select device, fill 12 items, attach photo, sign, submit](../assets/screenshots/ch02-step02-mobile-inspection-flow.png)
*Figure 2-2. The inspector flow as a five-screen sequence.*
<!-- /SCREENSHOT -->

### 2.2.1 Auto-fill UX

We pre-fill the form with last month's values plus device metadata, so the
inspector only taps what changed. Chapter 8 covers this in detail.

### 2.2.2 Offline queue

Basement-level inspections frequently lose signal, so inputs are queued in
IndexedDB and flushed on reconnect.

## 2.3 Stage 3 — Review

The administrator reviews and approves results in bulk on a desktop screen.

<!-- SCREENSHOT: ch02-step03-admin-review-screen -->
![Admin desktop review screen — 100 inspections this month at a glance](../assets/screenshots/ch02-step03-admin-review-screen.png)
*Figure 2-3. Filters on the left (pending, rejected, approved); on the right, a 12-item summary plus photo previews.*
<!-- /SCREENSHOT -->

### 2.3.1 Bulk approval

Clicking through 100 cards one by one is operationally impossible. We
provide a "approve filtered" button.

### 2.3.2 Rejection comments

A rejection pushes a comment to the inspector who can immediately re-submit
on mobile.

## 2.4 Stage 4 — Report

At month end the system generates and sends reports automatically.

<!-- SCREENSHOT: ch02-step04-monthly-report-pdf -->
![A monthly report PDF — 100-device summary plus list of misses](../assets/screenshots/ch02-step04-monthly-report-pdf.png)
*Figure 2-4. Page one of the auto-generated monthly report. Site name, period, 12-item statistics, and a list of un-inspected devices.*
<!-- /SCREENSHOT -->

### 2.4.1 DOCX + PDF, simultaneously

Chapter 10 explores this. The short version: public health offices want to
edit DOCX, sites want to archive PDF.

### 2.4.2 R2 retention

Generated documents are written immediately to Cloudflare R2 with a
SHA-256 hash and a presigned URL.

## 2.5 IA Mapping

<!-- SCREENSHOT: ch02-step05-information-architecture -->
![IA mapping: four stages become four sidebar items](../assets/screenshots/ch02-step05-information-architecture.png)
*Figure 2-5. The sidebar IA. (1) Schedule, (2) Inspect, (3) Review, (4) Reports map one-to-one onto the workflow stages.*
<!-- /SCREENSHOT -->

```
Sidebar
├─ Schedule       (results of stage 1)
├─ Inspect        (stage 2 input — mobile-first)
├─ Review         (stage 3 — desktop-first)
└─ Reports        (stage 4 deliverables)
```

When workflow and IA align one-to-one, users know what comes next without
having to look at the screen.

<!-- TODO: Add a chart of average duration per stage from production data -->

## Summary

- The four-stage workflow (Schedule, Inspect, Review, Report) is the skeleton of the SaaS
- Each stage has different users, devices, and validation rules — hence the mobile/desktop split
- The workflow diagram becomes the IA, which flattens the learning curve
- Auto-scheduling, auto-fill UX, bulk review, and auto-reports are the core differentiators against paper

## Next Chapter

The next chapter is an honest accounting of why we set Supabase and Vercel
aside in favor of self-hosting plus Cloudflare Edge.

## Capture Checklist

- [ ] `ch02-step01-workflow-diagram.png` — Mermaid diagram capture
- [ ] `ch02-step02-mobile-inspection-flow.png` — five mobile screens composed
- [ ] `ch02-step03-admin-review-screen.png` — desktop review (mosaic site name)
- [ ] `ch02-step04-monthly-report-pdf.png` — PDF page one preview
- [ ] `ch02-step05-information-architecture.png` — sidebar tree diagram
