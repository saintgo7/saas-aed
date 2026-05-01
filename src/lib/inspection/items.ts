import { z } from "zod"

/**
 * 12-item monthly AED self-inspection checklist.
 * Mirrors the official MOHW HWPX form (docs/forms/aed-inspection-form-mohw.hwpx)
 * verbatim. Group numbers (1~6) and item ordering match the 보건복지부 양식.
 *
 * Groups:
 *  1. 본체 작동 상태 확인 (3 items: OP_POWER, OP_PAD, OP_BATTERY)
 *  2. 보관함 상태 (5 items: BX_ALARM, BX_GUIDE, BX_EMG, BX_CPR, BX_EXP)
 *  3. 자동심장충격기 위치안내 표시 (2 items: LOC_ENT, LOC_DIR)
 *  4. 관리서류 작성 및 비치 여부 (1 item: DOC_FILE)
 *  6. 장비 사용 가능 시간 (1 item: TIME_24)
 *
 * Group 5 (관리자 변경사항) is metadata — not an OK/NG item, captured on
 * the device record. Keep group numbering (skipping 5) to align with the
 * official form layout.
 *
 * Codes are stable identifiers — never rename. Add new items by appending.
 */
export const INSPECTION_ITEMS = [
  // 1. 본체 작동 상태 확인 ----------------------------------------------------
  {
    code: "OP_POWER",
    category: "OPERATION",
    group: 1,
    sub: "①",
    labelKo: "본체 작동 상태 확인 (전원 표시 상태등 점멸)",
    labelEn: "Main unit operating status (power indicator blinking)"
  },
  {
    code: "OP_PAD",
    category: "OPERATION",
    group: 1,
    sub: "②",
    labelKo: "환자 부착용 패드 유무",
    labelEn: "Patient pads present"
  },
  {
    code: "OP_BATTERY",
    category: "OPERATION",
    group: 1,
    sub: "③",
    labelKo: "건전지 충전 상태",
    labelEn: "Battery charge state"
  },

  // 2. 보관함 상태 ----------------------------------------------------------
  {
    code: "BX_ALARM",
    category: "BOX",
    group: 2,
    sub: "①",
    labelKo: "도난경보장치 작동 여부",
    labelEn: "Anti-theft alarm working"
  },
  {
    code: "BX_GUIDE",
    category: "BOX",
    group: 2,
    sub: "②",
    labelKo: "보관함 각종 안내문구 상태",
    labelEn: "Cabinet guidance labels state"
  },
  {
    code: "BX_EMG",
    category: "BOX",
    group: 2,
    sub: "③",
    labelKo: "비상연락망 표시 여부",
    labelEn: "Emergency contact list displayed"
  },
  {
    code: "BX_CPR",
    category: "BOX",
    group: 2,
    sub: "④",
    labelKo: "심폐소생술 방법 안내책자 여부",
    labelEn: "CPR guidance booklet present"
  },
  {
    code: "BX_EXP",
    category: "BOX",
    group: 2,
    sub: "⑤",
    labelKo: "환자부착용 패드 및 건전지 유효기간 표시 여부",
    labelEn: "Pad/battery expiry date labeled"
  },

  // 3. 자동심장충격기 위치안내 표시 -------------------------------------------
  {
    code: "LOC_ENT",
    category: "LOCATION",
    group: 3,
    sub: "①",
    labelKo: "기관(건물) 입구 안내 표지",
    labelEn: "Building entrance signage"
  },
  {
    code: "LOC_DIR",
    category: "LOCATION",
    group: 3,
    sub: "②",
    labelKo: "기관내 설치 위치 및 방향 표지",
    labelEn: "Installation location and direction signage"
  },

  // 4. 관리서류 작성 및 비치 여부 -------------------------------------------
  {
    code: "DOC_FILE",
    category: "DOCS",
    group: 4,
    sub: "",
    labelKo: "관리서류 작성 및 비치 여부",
    labelEn: "Management documentation prepared and present"
  },

  // 6. 장비 사용 가능 시간 (group 5 = 관리자 변경사항 metadata, skipped) -------
  {
    code: "TIME_24",
    category: "ACCESS",
    group: 6,
    sub: "①",
    labelKo: "24시간 이용 가능",
    labelEn: "Available 24 hours"
  }
] as const

export type InspectionItem = (typeof INSPECTION_ITEMS)[number]
export type InspectionItemCode = InspectionItem["code"]
export type InspectionItemCategory = InspectionItem["category"]
export type InspectionItemResult = "OK" | "NG"
export type InspectionItems = Record<InspectionItemCode, InspectionItemResult>

const ITEM_CODES = INSPECTION_ITEMS.map((item) => item.code) as readonly InspectionItemCode[]

/**
 * Zod schema validating a complete InspectionItems record.
 * Every code from INSPECTION_ITEMS must be present and resolve to "OK" | "NG".
 */
export const inspectionItemsSchema: z.ZodType<InspectionItems> = z.object(
  Object.fromEntries(
    ITEM_CODES.map((code) => [code, z.enum(["OK", "NG"])])
  ) as Record<InspectionItemCode, z.ZodEnum<["OK", "NG"]>>
) as z.ZodType<InspectionItems>

/**
 * Returns true when every required item has a result recorded.
 * Pure function — does not mutate input.
 */
export function isInspectionComplete(items: Partial<InspectionItems>): items is InspectionItems {
  return ITEM_CODES.every((code) => items[code] === "OK" || items[code] === "NG")
}

/**
 * Returns the list of items currently marked as "NG".
 * Order is preserved from INSPECTION_ITEMS for stable rendering.
 */
export function getNgItems(items: InspectionItems): readonly InspectionItem[] {
  return INSPECTION_ITEMS.filter((item) => items[item.code] === "NG")
}

/**
 * Returns inspection items grouped by category, preserving order.
 * Useful for rendering category-sectioned UIs without runtime grouping cost.
 */
function buildCategoryGroups(): Readonly<Record<InspectionItemCategory, readonly InspectionItem[]>> {
  const groups: Record<string, InspectionItem[]> = {}
  for (const item of INSPECTION_ITEMS) {
    const list = groups[item.category] ?? []
    groups[item.category] = [...list, item]
  }
  return Object.freeze(groups) as Readonly<Record<InspectionItemCategory, readonly InspectionItem[]>>
}

export const categoryGroups = buildCategoryGroups()
