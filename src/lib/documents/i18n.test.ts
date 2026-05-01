import { describe, it, expect } from "vitest"
import { REPORT_LABELS, getLabels } from "./i18n"
import { INSPECTION_ITEMS } from "@/lib/inspection/items"

describe("REPORT_LABELS", () => {
  it("provides both ko and en label sets", () => {
    expect(REPORT_LABELS.ko).toBeDefined()
    expect(REPORT_LABELS.en).toBeDefined()
  })

  it("has identical top-level key structure across ko and en", () => {
    const koKeys = Object.keys(REPORT_LABELS.ko).sort()
    const enKeys = Object.keys(REPORT_LABELS.en).sort()
    expect(koKeys).toEqual(enKeys)
  })

  it("defines at least 12 item labels for both locales", () => {
    expect(Object.keys(REPORT_LABELS.ko.itemNames).length).toBeGreaterThanOrEqual(12)
    expect(Object.keys(REPORT_LABELS.en.itemNames).length).toBeGreaterThanOrEqual(12)
  })

  it("ko and en itemNames cover the same set of codes", () => {
    const koCodes = Object.keys(REPORT_LABELS.ko.itemNames).sort()
    const enCodes = Object.keys(REPORT_LABELS.en.itemNames).sort()
    expect(koCodes).toEqual(enCodes)
  })

  it("every defined itemNames key has non-empty ko and en labels", () => {
    for (const code of Object.keys(REPORT_LABELS.ko.itemNames)) {
      const koLabel = REPORT_LABELS.ko.itemNames[code as keyof typeof REPORT_LABELS.ko.itemNames]
      const enLabel = REPORT_LABELS.en.itemNames[code as keyof typeof REPORT_LABELS.en.itemNames]
      expect(koLabel).toBeDefined()
      expect(enLabel).toBeDefined()
      expect(koLabel.length).toBeGreaterThan(0)
      expect(enLabel.length).toBeGreaterThan(0)
    }
  })

  it("every defined itemNames key corresponds to a real INSPECTION_ITEMS code", () => {
    const validCodes = new Set(INSPECTION_ITEMS.map((i) => i.code))
    for (const code of Object.keys(REPORT_LABELS.ko.itemNames)) {
      expect(validCodes.has(code as never)).toBe(true)
    }
  })
})

describe("getLabels", () => {
  it("returns the ko set for ko", () => {
    expect(getLabels("ko")).toBe(REPORT_LABELS.ko)
  })

  it("returns the en set for en", () => {
    expect(getLabels("en")).toBe(REPORT_LABELS.en)
  })
})
