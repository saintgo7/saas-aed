---
title: "Appendix A. The 12-Item Inspection Form (Ministerial Notice)"
slug: "appendix-form-12items"
appendix: "A"
words_target: 2000
screenshots:
  - app-a-step01-official-form-original
  - app-a-step02-form-mapping-to-columns
  - app-a-step03-validation-rule-table
---

# Appendix A. The 12-Item Inspection Form (Ministerial Notice)

## Learning Objectives

- Identify the 12 items mandated by the AED operational guidelines
- Confirm the mapping between each item and our DB columns
- Tabulate the validation rules (required, type, range)

## The Big Picture

The law mandates 12 items, but labels, ordering, and language vary by site.
We treat **the legal text** as the canonical 12 items and split site-specific
labels into i18n.

<!-- SCREENSHOT: app-a-step01-official-form-original -->
![Original ministerial form — table of 12 items](../assets/screenshots/app-a-step01-official-form-original.png)
*Figure A-1. The official notice's table. The left column is the legal item; the right is the inspector entry field.*
<!-- /SCREENSHOT -->

## A.1 Mapping Table

| # | Legal item | Our column | Type | Required |
|---|---|---|---|---|
| 1 | Pad expiry | item01_padExpiry | date | Y |
| 2 | Battery level | item02_batteryLevel | smallint (0-100) | Y |
| 3 | Battery expiry | item03_batteryExpiry | date | Y |
| 4 | Self-test result | item04_selfTest | enum(pass,fail,na) | Y |
| 5 | Exterior damage | item05_exterior | enum(ok,damage) | Y |
| 6 | Cleanliness | item06_cleanliness | enum(ok,need_clean) | Y |
| 7 | Signage | item07_signage | enum(ok,missing) | Y |
| 8 | Lock / opening | item08_lock | enum(ok,locked,broken) | Y |
| 9 | Manual present | item09_manual | boolean | Y |
| 10 | Emergency contact posted | item10_emergency_contact | boolean | Y |
| 11 | Post-use check (if any) | item11_post_use | text | N |
| 12 | Other notes | item12_notes | text | N |

<!-- SCREENSHOT: app-a-step02-form-mapping-to-columns -->
![Mapping visual: legal items ↔ DB columns ↔ Zod schema](../assets/screenshots/app-a-step02-form-mapping-to-columns.png)
*Figure A-2. Three tables on one screen — legal items, DB columns, Zod schemas.*
<!-- /SCREENSHOT -->

## A.2 Validation Rules

<!-- SCREENSHOT: app-a-step03-validation-rule-table -->
![Validation rule table — boundary cases per item](../assets/screenshots/app-a-step03-validation-rule-table.png)
*Figure A-3. Expiry dates within -3y to +5y, battery 0-100, enums exact-match. Boundary cases get integration tests automatically.*
<!-- /SCREENSHOT -->

## A.3 Site-specific Labels (i18n)

```ts
// lib/i18n/inspection-items.en.ts (sample)
export const items = {
  item01_padExpiry: { label: "Pad expiry", short: "Pad" },
  item02_batteryLevel: { label: "Battery level (%)", short: "Battery" },
  // ...
}
```

<!-- TODO: Insert real i18n excerpt -->

## Capture Checklist

- [ ] `app-a-step01-official-form-original.png`
- [ ] `app-a-step02-form-mapping-to-columns.png`
- [ ] `app-a-step03-validation-rule-table.png`
