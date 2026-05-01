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

- Understand the legal basis for mandatory monthly AED inspections in Korea, grounded in Ministry of Health and Welfare statistics
- Identify six chronic field problems caused by paper checklists — gaps, loss, retroactive rewriting, signature forgery, reporting lag, and failure to become a data asset — with concrete cases and quantified costs
- Evaluate inspection data as a time-series asset using a digitization ROI framework, and distinguish "moving paper to a screen" from real digitization
- Explain how the "device that saves a life" domain promotes reminders, integrity, and audit traceability from non-functional to core requirements
- State the single problem this SaaS solves in one sentence, and use it as the yardstick by which every design decision in the following sixteen chapters is judged

## The Big Picture

According to the Ministry of Health and Welfare's emergency medical portal
(E-Gen), more than 65,000 publicly installed AEDs were in service across
Korea by the end of 2024, and even narrowly defined mandatory-installation
sites count well over 50,000 devices subject to monthly inspection. That
number grows 5-7% per year as the scope of Article 26-5 of the Emergency
Medical Services Act enforcement decree continues to widen across
universities, public buildings, subways, airports, and other crowded
facilities. Yet the inspection results are still recorded by hand on paper
checklists, filed in binders, and reported quarterly as scanned PDFs over
email.

This paper workflow carries six chronic ailments — gaps, loss, retroactive
rewriting, signature forgery, reporting lag, and failure to become a data
asset. Most damaging of all, **inspection history never accumulates into a
time-series asset**. A facility that has run 100 AEDs for five years cannot
answer the simplest question — "which month last summer had the most
battery replacements?" — because paper records but does not search.

Every design decision in this book flows from a single principle: refuse to
"digitize the paper checklist as is," and instead pursue what is only
possible because it is digital. A SaaS that copies the paper form onto a
screen inherits all of paper's limits while adding the operating cost of
software. Real digitization decomposes the workflow, redesigns the data
model, and surfaces patterns that paper could never reveal.

Finally, an AED is not an ordinary IoT device. It sits idle for years and
must work the one time someone collapses. This domain forces every
non-functional requirement of the SaaS — alert accuracy, data integrity,
audit traceability — to become a core requirement. The whole book is a
discipline against forgetting that one fact.

<!-- SCREENSHOT: ch01-step01-paper-checklist-stack -->
![A year's worth of paper checklists for one site — twelve neat bundles](../assets/screenshots/ch01-step01-paper-checklist-stack.png)
*Figure 1-1. Twelve months of paper checklists for one facility. Inspector signatures, stapled photographs, and handwritten corrections are all baked into the paper.*
<!-- /SCREENSHOT -->

## 1.1 Legal Background — Why Monthly?

The Emergency Medical Services Act and its enforcement decree (Article 26-5)
require each AED operator to perform at least one inspection per month and
report the result. The Ministry of Health and Welfare's circular on AED
operations (revised 2023-06-01) specifies twelve concrete inspection items
and explicitly requires an inspector signature plus photographs.

| # | Inspection Item | Pass Criterion |
|---|---|---|
| 1 | Body exterior | No cracks or breakage |
| 2 | Battery indicator | Green light |
| 3 | Battery expiry | At least 3 months remaining |
| 4 | Pad expiry | At least 3 months remaining |
| 5 | Pad seal | Unopened |
| 6 | Case condition | Lock works, no damage |
| 7 | Cable condition | No breaks or kinks |
| 8 | Self-test result | Normal indicator |
| 9 | Location signage | Visible |
| 10 | Location accuracy | Matches registered position |
| 11 | Surrounding cleanliness | No dust or debris |
| 12 | Usage instructions | Multilingual notice posted |

The law mandates monthly inspection but largely leaves storage and reporting
to the operator's discretion. The flexible clause "may be recorded on paper
or by electronic means" creates the gap into which paper checklists settled
as the de facto standard. Most operators download a PDF template, print it,
fill it in by hand, and at quarter-end scan and email the bundle to the
public health office.

> **[Statute citation]** Enforcement Decree of the Emergency Medical
> Services Act, Article 26-5(3): "The accountable manager shall inspect the
> automated external defibrillator at least once per month to verify normal
> operation, and shall report the result to the head of the local
> government."

Discussions of a 2024 amendment include explicit recognition of digital
signatures and a standardized electronic report format, but at the time of
writing the guidance still only states that electronic checklists are
"treated equivalently" to paper. This SaaS satisfies every requirement of
the existing guidance — preserved signatures, photo attachments,
timestamps, integrity hashes — while adding the value paper cannot give:
reminders, search, time-series analysis.

<!-- SCREENSHOT: ch01-step03-monthly-deadline-calendar -->
![A calendar of monthly deadlines across 100 devices](../assets/screenshots/ch01-step03-monthly-deadline-calendar.png)
*Figure 1-2. A view that simply does not exist on paper: red dots for missed inspections, green dots for completed ones, across a 100-device facility.*
<!-- /SCREENSHOT -->

## 1.2 Six Chronic Problems with Paper

### 1.2.1 Misses — Paper Sends No Reminders

You realize on the last day of the month that no inspection happened. Paper
does not send reminders. Picture a university health office where one
administrator manages twelve AEDs spread across the main building, library,
dorms, athletic field, and gym. The last Friday of the month is the
official inspection day, but exam weeks, school events, and holidays push
that week aside, and what was meant to be one month's inspection becomes
two months' worth crammed into one. That "double inspection" is the seed of
the rewriting problem in 1.2.3.

### 1.2.2 Loss and Damage — Paper Ages

A binder yellows after a year on a shelf. One fire, flood, or office move
can erase years of records in a moment. In one public health office's
archive room, the top shelf has bleached in the sun until characters fade,
and the bottom shelf's pages are stuck together by humidity. Digitized,
the same five years of data fits in a folder under 50 MB compressed.

<!-- SCREENSHOT: ch01-step02-old-binder-cabinet -->
![A five-year-old binder cabinet, sun-bleached and partly water-damaged](../assets/screenshots/ch01-step02-old-binder-cabinet.png)
*Figure 1-3. A real archive room. The top shelf has yellowed in the sun; the bottom shelf has pages stuck together by humidity. Digitized, the same data fits in a folder on a single hard drive.*
<!-- /SCREENSHOT -->

> **[Field case]** In 2023, while a regional hospital's main building was
> being remodeled, the archive cabinet was moved to a temporary container.
> Rain leaked through, and three of seven binders covering five years of
> records were soaked. With the public health office audit two months
> away, the manager had to "rewrite from memory" the inspections from
> the soaked period.

### 1.2.3 Retroactive Rewriting — The Means Becomes the End

The week before an audit, six months of checklists get filled out at once.
The inspection itself is no longer the point — finishing the checklist is.
One inspector confessed in an interview: "Honestly, I did inspect every
month, but I didn't always write it down. I filled in six months at once
the week before the audit. I even rotated three different pens so the
handwriting wouldn't look identical."

This is not laziness. Paper has no enforcement that says "if you don't
write it now, it's gone forever." Submission deadlines are quarterly or
half-yearly, so monthly discipline is left to personal will. A digital
system creates a blank inspection at midnight on the first of the month
and fires automatic warnings on miss. Authoring time is stamped by the
system, so "filling in all at once" is detected immediately.

### 1.2.4 Signature Forgery — Paper Signatures Cannot Be Verified

There is no way to verify a signature on paper. As long as the squiggle
matches, a different inspector passes through unnoticed. In some sites
there is even an open practice of "tracing the predecessor's signature."
When legal liability arises, identifying who actually performed the
inspection is nearly impossible.

Digital signatures address this with a triple guarantee: (1) the
inspector's identity at authoring time is bound to a phone number plus
magic link, (2) the signature image carries a SHA-256 hash so any tampering
is immediately detectable, (3) GPS coordinates, device info, and authoring
IP are stored as auxiliary metadata. Chapters 7 and 9 cover this in detail.

### 1.2.5 Reporting Lag — Four Manual Steps Every Cycle

Paper to scanner to PDF to email — four manual steps every reporting cycle.
A 100-device quarterly report takes about 2.5 hours of human time on
average (see the cost breakdown in 1.3). That time is spent moving
inspection results around, not actually inspecting. A digital system
auto-fills the public health office's standard form and produces the PDF
plus DOCX in under a minute.

### 1.2.6 No Data Asset — Unsearchable Data Is Not An Asset

Inspect 100 devices for five years and you still cannot answer "what was
the battery replacement distribution last month?" without re-reading
mountains of paper. When the facility manager asks "in which month did our
pad expirations cluster the most?" no one can answer. The answer requires
re-reading five years of paper.

This is the most damaging problem. As 1.3 shows, 100 devices x 12 items x
60 months equals 360,000 data points. Stored as structured data, patterns
emerge; with patterns, prediction becomes possible; with prediction,
incidents can be prevented. Paper closes off all of those possibilities.

## 1.3 The Time-series Asset — A Quantified ROI

### 1.3.1 Processing Time Cost

Decompose one cycle of paper-based operations into per-device minutes.

| Step | Paper (per device) | Digital (per device) |
|---|---|---|
| Print template | 0.5 min | 0 min |
| Hand-write 12 items | 4 min | 1.5 min (auto-fill) |
| Photograph + staple | 1 min | 0.3 min (mobile attach) |
| Inspector signature | 0.3 min | 0.2 min |
| File in cabinet | 0.5 min | 0 min |
| Sort at month-end | 0.5 min | 0 min |
| Compose report | 2.5 min | 0.01 min |
| **Total** | **9.3 min** | **2.0 min** |

For a 100-device site running monthly inspections, paper takes 930 minutes
(15.5 hours) per month and digital takes 200 minutes (3.3 hours). At a
labor rate of 12,000 KRW per hour, paper costs 186,000 KRW per month or
2,232,000 KRW per year, while digital costs 40,000 KRW per month or
480,000 KRW per year — a labor savings of 1,752,000 KRW per year. That
gap sets the upper bound on an honest SaaS subscription price.

### 1.3.2 The Value of Time-series Accumulation

One inspection per month, 100 devices, 12 items, 5 years equals 360,000
data points. As structured data, this volume opens the door to:

- **Failure prediction** — learn battery life as a function of environment
  (temperature, humidity, usage) and recommend preventive replacement
- **Supply chain optimization** — see pad-expiry distributions across 100
  sites and order one month in advance
- **Audit automation** — produce monthly reports in under a minute,
  zero manual touches
- **Coordinate correction** — refine registered locations against the
  inspector's GPS log over time

Paper records data; digital inspection accumulates it. That single-word
difference is the SaaS's real value.

<!-- SCREENSHOT: ch01-step04-data-volume-projection -->
![A visualization of 360,000 data points over five years](../assets/screenshots/ch01-step04-data-volume-projection.png)
*Figure 1-4. 100 devices x 12 items x 60 months = 72,000 rows. Patterns invisible on paper — summer battery spikes, December pad-expiry clusters — appear at a glance.*
<!-- /SCREENSHOT -->

### 1.3.3 Risk Cost — The Real ROI Is Avoiding the Incident

The real ROI is not labor. The social cost of an AED failing in a cardiac
arrest is one human life. Miss a single one of items 3 (battery expiry),
4 (pad expiry), or 8 (self-test) and the device may not work at the
critical moment. Paper operations don't notice the miss until month-end —
in some sites until quarter-end. Digital operations validate at authoring
time and trigger replacement workflows the instant a risk item is flagged.

> **[Hypothetical scenario, drawn from real patterns]** In March 2024, an
> emergency occurred in the lobby of a metropolitan university library.
> Student A, age 22, suddenly collapsed. Other students dialed 119 while
> rushing to grab the wall-mounted AED. The self-test indicator was red.
> The pads had expired seven months earlier. The previous month's
> checklist read "normal," but had in fact been backfilled in a single
> session. By chance the ambulance arrived in time and no life was lost,
> but the university converted every AED to a digital inspection system,
> tying every pad expiry to an automatic alert plus order workflow. One
> incident became the trigger for system adoption.

This hypothetical is not exaggerated. The "fill in all at once" practice
of paper operations leads exactly there if given enough time. This SaaS
exists to keep that ending from arriving.

## 1.4 Domain — A Device That Saves Lives

An AED is not an ordinary IoT device. It sits idle for years, then must
work the one time someone collapses. This forces two things on the SaaS:

1. **A missed inspection equals risk to a human life.** Reminders are
   safety gear, not marketing — they cannot be missed. The alert system
   falls back from push to SMS, and from SMS to voice call. Chapter 12
   covers this.
2. **Data integrity is legal evidence.** Signatures, photos, and
   timestamps become the audit trail months or years later. The SaaS
   stamps every inspection with a SHA-256 hash, and stores the hashes in
   a separate R2 bucket. Chapter 14 covers this.

These two requirements cast their shadow across every architectural choice
in the book. The choice of Cloudflare R2, treating email deliverability as
an operational KPI, taking dual-region backups daily — all flow from these
two requirements.

## 1.5 The Problem We Solve, In One Sentence

> "Carry out monthly inspections of 100 to 10,000 AEDs scattered across the
> country with zero misses, accumulate the results in a tamper-evident form,
> and generate the report in under a minute."

That is the only problem this SaaS exists to solve. This single sentence
is the yardstick that runs through every chapter that follows. Any feature,
any architectural decision, that does not serve this sentence sits outside
the SaaS's scope. This principle is the one defense against the "feature
sprawl" trap that catches most SaaS products.

## Summary

- Monthly AED inspection is a legal duty in Korea, with more than 50,000
  mandatory-inspection devices in service. Paper checklists carry six
  chronic ailments — gaps, loss, retroactive rewriting, forgery, reporting
  lag, and failure to become a data asset
- The real value of digitization is not "recording" but "accumulating as a
  time-series asset." For a 100-device site, the 1.75M KRW annual labor
  savings is dwarfed by the value of preventing a single incident
- Because an AED must work the one moment it is needed, reminders,
  integrity, and audit traceability are core requirements, not nice-to-haves
- The mission of this SaaS reduces to one sentence: zero misses,
  tamper-evident accumulation, one-minute reports. Every decision in the
  remaining sixteen chapters is judged against it

## Next Chapter

The next chapter introduces the **four-stage workflow** we discovered while
solving this problem: how an inspector fills the 12-item form on a phone,
signs, attaches photos, and how an administrator reviews, approves, and
reports — and how that flow shaped the screen IA of the SaaS. We compare
five alternative workflows to argue why four stages is the optimum.

## Capture Checklist

- [ ] `ch01-step01-paper-checklist-stack.png` — real photo of a year of paper (with site cooperation)
- [ ] `ch01-step02-old-binder-cabinet.png` — five-year-old cabinet
- [ ] `ch01-step03-monthly-deadline-calendar.png` — deadline calendar mockup
- [ ] `ch01-step04-data-volume-projection.png` — 360k data points visualization
