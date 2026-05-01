import { describe, it, expect } from "vitest"
import {
  INSPECTION_ITEMS,
  inspectionItemsSchema,
  isInspectionComplete,
  getNgItems,
  categoryGroups,
  type InspectionItems
} from "./items"

describe("INSPECTION_ITEMS", () => {
  it("contains 12 items (3 OP + 5 BX + 2 LOC + 1 DOCS + 1 ACCESS) matching MOHW HWPX form", () => {
    expect(INSPECTION_ITEMS).toHaveLength(12)
  })

  it("has unique codes for all items", () => {
    const codes = INSPECTION_ITEMS.map((item) => item.code)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })

  it("provides Korean and English labels for every item", () => {
    for (const item of INSPECTION_ITEMS) {
      expect(item.labelKo.length).toBeGreaterThan(0)
      expect(item.labelEn.length).toBeGreaterThan(0)
    }
  })
})

function buildAllOk(): InspectionItems {
  return INSPECTION_ITEMS.reduce<Record<string, "OK" | "NG">>((acc, item) => {
    return { ...acc, [item.code]: "OK" }
  }, {}) as InspectionItems
}

describe("inspectionItemsSchema", () => {
  it("accepts a fully populated valid input", () => {
    const valid = buildAllOk()
    const parsed = inspectionItemsSchema.parse(valid)
    expect(parsed).toEqual(valid)
  })

  it("rejects missing keys", () => {
    const partial = { OP_POWER: "OK" }
    expect(() => inspectionItemsSchema.parse(partial)).toThrow()
  })

  it("rejects invalid result values", () => {
    const invalid = { ...buildAllOk(), OP_POWER: "MAYBE" as unknown as "OK" }
    expect(() => inspectionItemsSchema.parse(invalid)).toThrow()
  })
})

describe("isInspectionComplete", () => {
  it("returns true when every code has OK or NG", () => {
    expect(isInspectionComplete(buildAllOk())).toBe(true)
  })

  it("returns false when any code is missing", () => {
    const incomplete = { ...buildAllOk() } as Partial<InspectionItems>
    delete incomplete.OP_POWER
    expect(isInspectionComplete(incomplete)).toBe(false)
  })
})

describe("getNgItems", () => {
  it("returns only items marked NG, preserving INSPECTION_ITEMS order", () => {
    const items = buildAllOk()
    const withNg: InspectionItems = { ...items, OP_PAD: "NG", BX_GUIDE: "NG" }
    const ng = getNgItems(withNg)
    expect(ng.map((i) => i.code)).toEqual(["OP_PAD", "BX_GUIDE"])
  })

  it("returns an empty list when no NG present", () => {
    expect(getNgItems(buildAllOk())).toHaveLength(0)
  })
})

describe("categoryGroups", () => {
  it("groups items into the defined categories", () => {
    const expectedCategories = ["OPERATION", "BOX", "LOCATION", "DOCS", "ACCESS"]
    for (const cat of expectedCategories) {
      expect(categoryGroups[cat as keyof typeof categoryGroups]).toBeDefined()
    }
  })

  it("OPERATION has 3, BOX has 5, LOCATION has 2, DOCS has 1, ACCESS has 1 (MOHW HWPX form)", () => {
    expect(categoryGroups.OPERATION).toHaveLength(3)
    expect(categoryGroups.BOX).toHaveLength(5)
    expect(categoryGroups.LOCATION).toHaveLength(2)
    expect(categoryGroups.DOCS).toHaveLength(1)
    expect(categoryGroups.ACCESS).toHaveLength(1)
  })

  it("total grouped items equals INSPECTION_ITEMS length", () => {
    const total = Object.values(categoryGroups).reduce(
      (sum, list) => sum + list.length,
      0
    )
    expect(total).toBe(INSPECTION_ITEMS.length)
  })
})
