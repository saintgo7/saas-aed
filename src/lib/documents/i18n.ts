// Localized strings for AED inspection reports (DOCX + PDF).
//
// Keep all user-facing text here. Code identifiers stay English.

import type { InspectionItemCode, ReportLocale } from "./types"

type ReportLabels = {
  title: string
  subtitleYearMonth: string // e.g. "점검 연월"
  organization: string
  contactEmail: string

  sectionDevice: string
  deviceManufacturer: string
  deviceModel: string
  deviceSerial: string
  deviceLocation: string
  deviceExpiresAt: string
  devicePadReplaceAt: string

  sectionItems: string
  colCode: string
  colItemName: string
  colResult: string
  colRemark: string

  resultOk: string // 이상없음
  resultNg: string // 이상있음

  sectionSummary: string
  summaryTotal: string // 총 항목
  summaryOk: string
  summaryNg: string

  sectionInspector: string
  inspectorName: string
  inspectorEmail: string
  inspectorPhone: string

  sectionSignature: string
  signatureMissing: string

  sectionNotes: string
  notesNone: string

  inspectedAt: string
  footerPage: (current: number, total: number) => string

  itemNames: Record<InspectionItemCode, string>
}

const ko: ReportLabels = {
  title: "AED 점검표",
  subtitleYearMonth: "점검 연월",
  organization: "기관명",
  contactEmail: "담당자 이메일",

  sectionDevice: "장비 정보",
  deviceManufacturer: "제조사",
  deviceModel: "모델명",
  deviceSerial: "일련번호",
  deviceLocation: "설치 위치",
  deviceExpiresAt: "본체 유효기간",
  devicePadReplaceAt: "패드 교체 예정일",

  sectionItems: "점검 항목",
  colCode: "코드",
  colItemName: "항목",
  colResult: "결과",
  colRemark: "비고",

  resultOk: "이상없음",
  resultNg: "이상있음",

  sectionSummary: "결과 요약",
  summaryTotal: "총 점검 항목",
  summaryOk: "이상없음",
  summaryNg: "이상있음",

  sectionInspector: "점검자 정보",
  inspectorName: "성명",
  inspectorEmail: "이메일",
  inspectorPhone: "연락처",

  sectionSignature: "서명",
  signatureMissing: "[서명 누락]",

  sectionNotes: "비고",
  notesNone: "(없음)",

  inspectedAt: "점검 일시",
  footerPage: (current, total) => `${current} / ${total}`,

  itemNames: {
    OP_POWER: "본체 전원 표시등 점멸",
    OP_PAD: "환자 부착용 패드",
    OP_BATTERY: "건전지 충전 상태",
    BX_ALARM: "도난경보",
    BX_GUIDE: "보관함 안내문구",
    BX_EMG: "비상연락망",
    BX_CPR: "심폐소생술 안내",
    BX_EXP: "유효기간 표시",
    LOC_ENT: "입구 안내 표지",
    LOC_DIR: "위치/방향 표지",
    DOC_FILE: "관리서류",
    TIME_24: "24시간 이용",
  },
}

const en: ReportLabels = {
  title: "AED Inspection Report",
  subtitleYearMonth: "Inspection Period",
  organization: "Organization",
  contactEmail: "Contact Email",

  sectionDevice: "Device Information",
  deviceManufacturer: "Manufacturer",
  deviceModel: "Model",
  deviceSerial: "Serial Number",
  deviceLocation: "Installation Location",
  deviceExpiresAt: "Device Expiry",
  devicePadReplaceAt: "Pad Replacement Due",

  sectionItems: "Inspection Items",
  colCode: "Code",
  colItemName: "Item",
  colResult: "Result",
  colRemark: "Remark",

  resultOk: "OK",
  resultNg: "NG",

  sectionSummary: "Summary",
  summaryTotal: "Total Items",
  summaryOk: "OK",
  summaryNg: "NG",

  sectionInspector: "Inspector",
  inspectorName: "Name",
  inspectorEmail: "Email",
  inspectorPhone: "Phone",

  sectionSignature: "Signature",
  signatureMissing: "[Signature Missing]",

  sectionNotes: "Notes",
  notesNone: "(none)",

  inspectedAt: "Inspected At",
  footerPage: (current, total) => `${current} / ${total}`,

  itemNames: {
    OP_POWER: "Main unit power indicator",
    OP_PAD: "Patient electrode pads",
    OP_BATTERY: "Battery charge status",
    BX_ALARM: "Anti-theft alarm",
    BX_GUIDE: "Cabinet usage notice",
    BX_EMG: "Emergency contact list",
    BX_CPR: "CPR instructions",
    BX_EXP: "Expiration date label",
    LOC_ENT: "Entrance signage",
    LOC_DIR: "Direction/location signage",
    DOC_FILE: "Management documents",
    TIME_24: "24-hour accessibility",
  },
}

export const REPORT_LABELS: Record<ReportLocale, ReportLabels> = { ko, en } as const

export function getLabels(locale: ReportLocale): ReportLabels {
  return REPORT_LABELS[locale]
}
