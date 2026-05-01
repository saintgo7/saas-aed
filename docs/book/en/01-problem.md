---
title: "Chapter 1. The Paper Checklist Problem in AED Inspection"
slug: "problem"
chapter: 1
words_target: 3500
screenshots:
  - ch01-step01-paper-checklist-stack
  - ch01-step02-old-binder-cabinet
  - ch01-step03-monthly-deadline-calendar
  - ch01-step04-data-volume-projection
---

# Chapter 1. The Paper Checklist Problem in AED Inspection

## Learning Objectives

- Understand the legal basis for mandatory monthly AED inspections
- Identify six chronic field problems caused by paper checklists
- Evaluate inspection data as a time-series asset that paper cannot capture
- Explain how the "device that saves a life" domain shapes every SaaS decision
- State the single problem this SaaS solves, in one sentence

## The Big Picture

About 80,000 publicly installed AEDs across the country are subject to
mandatory monthly inspection under emergency medical regulations. Yet the
results are still recorded by hand on paper checklists, filed away in
binders, and reported quarterly as scanned PDFs over email. This paper
workflow carries four chronic ailments — gaps, loss, retroactive rewriting,
and signature forgery — and worst of all, **it does not turn inspection
history into a time-series asset**.

Every design decision in this book flows from a single principle: refuse to
"digitize the paper checklist as is," and instead pursue what is only
possible because it is digital.

<!-- SCREENSHOT: ch01-step01-paper-checklist-stack -->
![A year's worth of paper checklists for one site — twelve neat bundles](../assets/screenshots/ch01-step01-paper-checklist-stack.png)
*Figure 1-1. Twelve months of paper checklists for one facility. Inspector signatures, stapled photographs, and handwritten corrections are all baked into the paper.*
<!-- /SCREENSHOT -->

## 1.1 Legal Background — Why Monthly?

The Emergency Medical Services Act and its enforcement decree (Article 26-5)
require each AED operator to perform at least one inspection per month and
to report the result. The Ministry of Health and Welfare's operational
guidelines specify twelve concrete inspection items and require an inspector
signature plus photographs.

<!-- TODO: Cite the actual statute and circular text -->
<!-- TODO: Reflect 2024 amendments (digital signature acceptance) once confirmed -->

The law mandates monthly inspections but is largely silent on how to store
or report the results. Into that gap, paper checklists became the de facto
standard.

<!-- SCREENSHOT: ch01-step03-monthly-deadline-calendar -->
![A calendar of monthly deadlines across 100 devices](../assets/screenshots/ch01-step03-monthly-deadline-calendar.png)
*Figure 1-2. A view that simply does not exist on paper: red dots for missed inspections, green dots for completed ones, across a 100-device facility.*
<!-- /SCREENSHOT -->

## 1.2 Six Chronic Problems with Paper

### 1.2.1 Misses

You realize on the last day of the month that no inspection happened. Paper
does not send reminders.

### 1.2.2 Loss and damage

A binder yellows after a year on a shelf. One fire, flood, or office move
can erase years of records in a moment.

<!-- SCREENSHOT: ch01-step02-old-binder-cabinet -->
![A five-year-old binder cabinet, sun-bleached and partly water-damaged](../assets/screenshots/ch01-step02-old-binder-cabinet.png)
*Figure 1-3. A real archive room. The top shelf has yellowed in the sun; the bottom shelf has pages stuck together by humidity. Digitized, the same data fits in a folder on a single hard drive.*
<!-- /SCREENSHOT -->

<!-- TODO: Insert anonymized interview about a 5-year archive lost in a move -->

### 1.2.3 Retroactive rewriting

The week before an audit, six months of checklists get filled out at once.
The means becomes the end.

### 1.2.4 Signature forgery

There is no way to verify a signature on paper. As long as the squiggle
matches, a different inspector passes through unnoticed.

### 1.2.5 Reporting lag

Paper to scanner to PDF to email — four manual steps every reporting cycle.

### 1.2.6 No data asset

Inspect 100 devices for five years and you still cannot answer "what was the
battery replacement distribution last month" without a stack of paper. Paper
does not search.

## 1.3 The Time-series Asset Hidden in Inspections

One inspection per month, 100 devices, 12 items, 5 years equals 360,000 data
points. Stored as structured data instead of paper, that volume opens the
door to:

- **Failure prediction** — learning battery replacement cycles
- **Supply chain optimization** — tracking pad expiration in bulk
- **Audit automation** — generating monthly reports in under a minute
- **Coordinate correction** — refining device locations using inspector GPS logs

Paper records data; digital inspection accumulates it.

<!-- SCREENSHOT: ch01-step04-data-volume-projection -->
![A visualization of 360,000 data points over five years](../assets/screenshots/ch01-step04-data-volume-projection.png)
*Figure 1-4. 100 devices x 12 items x 60 months = 72,000 rows. Patterns invisible on paper — summer battery spikes, December pad-expiry clusters — appear at a glance.*
<!-- /SCREENSHOT -->

<!-- TODO: Add real production statistics (total inspections, item distributions) after one year of operation -->

## 1.4 Domain — A Device That Saves Lives

An AED is not an ordinary IoT device. It sits idle for years, then must work
the one time someone collapses. This forces two things on the SaaS:

1. **A missed inspection equals risk to a human life.** Reminders are safety
   gear, not marketing — they cannot be missed.
2. **Data integrity is legal evidence.** Signatures, photos, and timestamps
   become the audit trail months or years later.

These two requirements cast their shadow across every architectural choice
in the book.

## 1.5 The Problem We Solve, In One Sentence

> "Carry out monthly inspections of 100 to 10,000 AEDs scattered across the
> country with zero misses, accumulate the results in a tamper-evident form,
> and generate the report in under a minute."

That is the only problem this SaaS exists to solve.

## Summary

- Monthly AED inspection is a legal duty, and paper carries six chronic ailments — gaps, loss, retroactive rewriting, forgery, reporting lag, and failure to become a data asset
- The real value of digitization is not "recording" but "accumulating as a time-series asset"
- Because an AED must work in the one moment it is needed, reminders and integrity are core requirements, not nice-to-haves
- The mission of this SaaS reduces to one sentence: zero misses, tamper-evident accumulation, one-minute reports

## Next Chapter

The next chapter introduces the **four-stage workflow** we discovered while
solving this problem: how an inspector fills the 12-item form on a phone,
signs, attaches photos, and how an administrator reviews, approves, and
reports — and how that flow shaped the screen IA of the SaaS.

## Capture Checklist

- [ ] `ch01-step01-paper-checklist-stack.png` — real photo of a year of paper (with site cooperation)
- [ ] `ch01-step02-old-binder-cabinet.png` — five-year-old cabinet
- [ ] `ch01-step03-monthly-deadline-calendar.png` — deadline calendar mockup
- [ ] `ch01-step04-data-volume-projection.png` — 360k data points visualization
