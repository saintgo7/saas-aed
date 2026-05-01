---
title: "Chapter 8. The 12-Item Form and Auto-fill UX"
slug: "form"
chapter: 8
words_target: 3500
screenshots:
  - ch08-step01-form-component-tree
  - ch08-step02-zod-schema-12-items
  - ch08-step03-prefill-from-last-month
  - ch08-step04-mobile-form-screen
  - ch08-step05-offline-queue-indexeddb
  - ch08-step06-validation-error-state
---

# Chapter 8. The 12-Item Form and Auto-fill UX

## Learning Objectives

- Compose the 12-item form with React Hook Form + Zod for type safety
- Pre-fill last month's values so the inspector "only taps what changed"
- Apply eight small mobile-first decisions (touch targets, keyboard avoidance, etc.)
- Support inspections in dead zones with an IndexedDB offline queue
- Provide clear validation feedback with accessible error states

## The Big Picture

The 12-item form is the most-opened screen in the SaaS — an inspector sees
it more than 100 times a month. The goal is not "filling fields" but
**making it unnecessary to fill them**. Auto-fill is the central design
decision.

<!-- SCREENSHOT: ch08-step01-form-component-tree -->
![Form component tree: InspectionForm > 12 × ItemField](../assets/screenshots/ch08-step01-form-component-tree.png)
*Figure 8-1. components/inspection/. Nine components keep each file under 200 lines.*
<!-- /SCREENSHOT -->

## 8.1 Zod Schema

```ts
export const inspectionInputSchema = z.object({
  deviceId: z.string().uuid(),
  inspectedAt: z.string().datetime(),
  item01_padExpiry: z.string().date().nullable(),
  item02_batteryLevel: z.number().int().min(0).max(100),
  // ... 12 items
  notes: z.string().max(2000).optional(),
})
```

<!-- SCREENSHOT: ch08-step02-zod-schema-12-items -->
![Zod schema — 12 items with type safety](../assets/screenshots/ch08-step02-zod-schema-12-items.png)
*Figure 8-2. lib/inspection/schema.ts. The same schema validates on the client and on the server action.*
<!-- /SCREENSHOT -->

## 8.2 Auto-fill — "Only What Changed"

We pre-fill RHF's `defaultValues` from last month's inspection plus device
metadata.

<!-- SCREENSHOT: ch08-step03-prefill-from-last-month -->
![Auto-filled fields appear gray; user-touched fields turn blue](../assets/screenshots/ch08-step03-prefill-from-last-month.png)
*Figure 8-3. Visual differentiation matters: gray text for pre-filled, blue for changed.*
<!-- /SCREENSHOT -->

### 8.2.1 The risk

Auto-fill carries a "copy-paste inspection" risk. Mitigations: (1) a yellow
warning dot on values unchanged for 7+ days, (2) never auto-fill expiry
dates, (3) require a fresh photo every time.

## 8.3 Mobile-First Layout

<!-- SCREENSHOT: ch08-step04-mobile-form-screen -->
![iPhone 13 mini view — one item per screen](../assets/screenshots/ch08-step04-mobile-form-screen.png)
*Figure 8-4. One card per item; swipe to advance. The next-button stays sticky at the bottom even with the keyboard up.*
<!-- /SCREENSHOT -->

### 8.3.1 Eight small decisions

1. Touch targets at least 44x44 px (iOS HIG)
2. Numeric inputs use `inputMode="numeric"` for the number keypad
3. Date inputs use the native `<input type="date">`
4. Photos via `<input type="file" accept="image/*" capture="environment">`
5. Sticky bottom CTA so the keyboard never hides the action
6. A 12-segment top progress bar
7. Disabled "shake to undo" (prevents accidental loss)
8. Automatic dark mode

## 8.4 Offline Queue

Basements, rooftops, and remote sites lose signal. Every input is written
to IndexedDB immediately and flushed on reconnect via background sync.

<!-- SCREENSHOT: ch08-step05-offline-queue-indexeddb -->
![DevTools Application panel — IndexedDB inspection_queue](../assets/screenshots/ch08-step05-offline-queue-indexeddb.png)
*Figure 8-5. Three inspections queued offline. The right panel shows status (pending/syncing/synced) and retry counts.*
<!-- /SCREENSHOT -->

```ts
// lib/offline/queue.ts (excerpt)
export async function enqueueInspection(input) {
  await db.inspection_queue.add({ ...input, status: "pending", tries: 0 })
  if (navigator.onLine) tryFlush()
}
```

<!-- TODO: Replace with the real lib/offline/queue.ts excerpt -->

## 8.5 Validation Error State

<!-- SCREENSHOT: ch08-step06-validation-error-state -->
![Validation failure: red border + one-line message + accessibility hint](../assets/screenshots/ch08-step06-validation-error-state.png)
*Figure 8-6. A pad expiry in the past triggers a red border, "Please double-check the expiry date," and `aria-describedby` for screen readers.*
<!-- /SCREENSHOT -->

## Summary

- The 12-item form's core is "make it unnecessary to fill" via auto-fill
- The auto-fill trap (rote inspections) is countered by visual differentiation, expiry exceptions, and required photos
- Eight small mobile-first decisions accumulate into usability
- IndexedDB queue + background sync makes dead zones safe

## Next Chapter

Next we cover the integrity core — the e-signature canvas, SHA-256 hashing,
and R2 uploads — with code excerpts.

## Capture Checklist

- [ ] `ch08-step01-form-component-tree.png`
- [ ] `ch08-step02-zod-schema-12-items.png`
- [ ] `ch08-step03-prefill-from-last-month.png`
- [ ] `ch08-step04-mobile-form-screen.png` — iPhone 13 mini simulator
- [ ] `ch08-step05-offline-queue-indexeddb.png`
- [ ] `ch08-step06-validation-error-state.png`
