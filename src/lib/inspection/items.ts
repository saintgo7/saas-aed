import { z } from "zod"

/**
 * 12-item monthly AED self-inspection checklist.
 *
 * Categories:
 *  - OPERATION (5)  : functional checks (power/pads/battery/connectors/exterior)
 *  - BOX (4)        : storage cabinet (alarm/guide/emergency contact/CPR card)
 *  - LOCATION (2)   : physical placement (entrance visibility/directional sign)
 *  - DOCS (1)       : on-site documentation
 *  - ACCESS (1, opt): 24h availability
 *
 * Codes are stable identifiers — never rename. Add new items by appending.
 */
export const INSPECTION_ITEMS = [
  // OPERATION ---------------------------------------------------------------
  {
    code: "OP_POWER",
    category: "OPERATION",
    labelKo: "본체 전원 표시등 점멸",
    labelEn: "Main power indicator blinking"
  },
  {
    code: "OP_PAD",
    category: "OPERATION",
    labelKo: "환자 부착용 패드 유무",
    labelEn: "Patient pads present"
  },
  {
    code: "OP_BATTERY",
    category: "OPERATION",
    labelKo: "배터리 잔량 정상",
    labelEn: "Battery level normal"
  },
  {
    code: "OP_CONNECTOR",
    category: "OPERATION",
    labelKo: "패드 커넥터 체결 상태",
    labelEn: "Pad connector secured"
  },
  {
    code: "OP_EXTERIOR",
    category: "OPERATION",
    labelKo: "본체 외관 손상 없음",
    labelEn: "No exterior damage"
  },

  // BOX (storage cabinet) ---------------------------------------------------
  {
    code: "BX_ALARM",
    category: "BOX",
    labelKo: "보관함 도난 방지 알람 작동",
    labelEn: "Cabinet anti-theft alarm working"
  },
  {
    code: "BX_GUIDE",
    category: "BOX",
    labelKo: "보관함 사용 안내 부착",
    labelEn: "Usage guide posted on cabinet"
  },
  {
    code: "BX_EMG",
    category: "BOX",
    labelKo: "응급 연락망(119) 표기",
    labelEn: "Emergency contact (119) labeled"
  },
  {
    code: "BX_CPR",
    category: "BOX",
    labelKo: "심폐소생술 안내 카드 비치",
    labelEn: "CPR guide card present"
  },
  {
    code: "BX_EXP",
    category: "BOX",
    labelKo: "패드/배터리 유효기간 양호",
    labelEn: "Pad/battery expiry within validity"
  },

  // LOCATION ---------------------------------------------------------------
  {
    code: "LOC_ENT",
    category: "LOCATION",
    labelKo: "출입구에서 시야 확보",
    labelEn: "Visible from entrance"
  },
  {
    code: "LOC_DIR",
    category: "LOCATION",
    labelKo: "위치 안내 표지판 부착",
    labelEn: "Directional signage installed"
  },

  // DOCS -------------------------------------------------------------------
  {
    code: "DOC_FILE",
    category: "DOCS",
    labelKo: "점검대장/사용설명서 비치",
    labelEn: "Inspection log and manual present"
  },

  // ACCESS -----------------------------------------------------------------
  {
    code: "TIME_24",
    category: "ACCESS",
    labelKo: "24시간 접근 가능 (해당 시)",
    labelEn: "24-hour accessibility (if applicable)"
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
