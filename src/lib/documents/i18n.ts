// Localized strings for AED inspection reports (DOCX + PDF).
//
// Keep all user-facing text here. Code identifiers stay English.
// Keys mirror the official 보건복지부 자동심장충격기 점검표 HWPX form
// (see docs/forms/aed-inspection-form-mohw.txt).

import type { InspectionItemCode, ReportLocale } from "./types"

type GroupNames = {
  1: string // 본체 작동 상태 확인
  2: string // 보관함 상태
  3: string // 자동심장충격기 위치안내 표시
  4: string // 관리서류 작성 및 비치 여부
  5: string // 관리자 변경사항
  6: string // 장비 사용 가능 시간
}

type ReportLabels = {
  // ----- Heading / meta -----
  title: string
  subtitleYearMonth: string
  organization: string
  contactEmail: string

  // ----- Section labels matching HWPX form -----
  deviceInfo: string // 장비정보
  maintenance: string // 장비유지기간
  location: string // 설치위치

  // ----- Device fields -----
  manufacturer: string // 제조사
  model: string // 제품명 또는 모델명
  serial: string // 제조번호
  manufacturedAt: string // 제조 연월일
  purchasedAt: string // 장비구매일자
  expiresAt: string // 본체유효사용가능기한
  padReplaceAt: string // 패드 교체 예정일자
  batteryReplaceAt: string // 건전지 교체 예정일자

  // ----- Inspection table headers -----
  no: string // 연번
  item: string // 점검항목
  result: string // 점검결과
  abnormal: string // 이상있음
  normal: string // 이상없음

  // ----- Group 5 / 6 specific labels -----
  managerChange: string // 관리자 변경사항
  hasChange: string // 있음
  noChange: string // 없음
  managerName: string // 관리자 이름
  managerPhone: string // 관리자 전화번호(비상연락처)

  operatingHours: string // 장비 사용 가능 시간
  available24h: string // 24시간 이용 가능
  notAvailable24h: string // 24시간 사용 불가

  // ----- Footer -----
  inspectionDate: string // 점검일
  inspector: string // 점검자
  signature: string // (서명)

  // ----- Misc -----
  groupNames: GroupNames
  notesNone: string
  notesLabel: string
  signatureMissing: string
  footerPage: (current: number, total: number) => string

  // ----- Per-item labels (12 codes) -----
  itemNames: Record<InspectionItemCode, string>

  // ----- Legacy aliases retained for tests / older callers -----
  sectionDevice: string
  sectionItems: string
  sectionSummary: string
  sectionInspector: string
  sectionSignature: string
  sectionNotes: string
  deviceManufacturer: string
  deviceModel: string
  deviceSerial: string
  deviceLocation: string
  deviceExpiresAt: string
  devicePadReplaceAt: string
  colCode: string
  colItemName: string
  colResult: string
  colRemark: string
  resultOk: string
  resultNg: string
  summaryTotal: string
  summaryOk: string
  summaryNg: string
  inspectorName: string
  inspectorEmail: string
  inspectorPhone: string
  inspectedAt: string
}

// ---------------------------------------------------------------------------
// Korean (보건복지부 양식)
// ---------------------------------------------------------------------------
const ko: ReportLabels = {
  title: "자동심장충격기 점검표",
  subtitleYearMonth: "점검 연월",
  organization: "기관명",
  contactEmail: "담당자 이메일",

  deviceInfo: "장비정보",
  maintenance: "장비유지기간",
  location: "설치위치",

  manufacturer: "제조사",
  model: "제품명 또는 모델명",
  serial: "제조번호",
  manufacturedAt: "제조 연월일",
  purchasedAt: "장비구매일자",
  expiresAt: "본체유효사용가능기한",
  padReplaceAt: "패드 교체 예정일자",
  batteryReplaceAt: "건전지 교체 예정일자",

  no: "연번",
  item: "점검항목",
  result: "점검결과",
  abnormal: "이상있음",
  normal: "이상없음",

  managerChange: "관리자 변경사항",
  hasChange: "있음",
  noChange: "없음",
  managerName: "관리자 이름",
  managerPhone: "관리자 전화번호(비상연락처)",

  operatingHours: "장비 사용 가능 시간",
  available24h: "24시간 이용 가능",
  notAvailable24h: "24시간 사용 불가",

  inspectionDate: "점검일",
  inspector: "점검자",
  signature: "(서명)",

  groupNames: {
    1: "본체 작동 상태 확인",
    2: "보관함 상태",
    3: "자동심장충격기 위치안내 표시",
    4: "관리서류 작성 및 비치 여부",
    5: "관리자 변경사항",
    6: "장비 사용 가능 시간",
  },
  notesNone: "(없음)",
  notesLabel: "비고",
  signatureMissing: "[서명 누락]",
  footerPage: (current, total) => `${current} / ${total}`,

  itemNames: {
    OP_POWER: "본체 작동 상태 확인(전원 표시 상태등 점멸)",
    OP_PAD: "환자 부착용 패드 유무",
    OP_BATTERY: "건전지 충전 상태",
    BX_ALARM: "도난경보장치 작동 여부",
    BX_GUIDE: "보관함 각종 안내문구상태",
    BX_EMG: "비상연락망 표시 여부",
    BX_CPR: "심폐소생술 방법 안내책자 여부",
    BX_EXP: "환자부착용 패드 및 건전지 유효기간 표시 여부",
    LOC_ENT: "기관(건물) 입구 안내 표지",
    LOC_DIR: "기관내 설치 위치 및 방향 표지",
    DOC_FILE: "관리서류 작성 및 비치 여부",
    TIME_24: "24시간 이용 가능",
  },

  // Legacy aliases (tests / older callers)
  sectionDevice: "장비정보",
  sectionItems: "점검 항목",
  sectionSummary: "결과 요약",
  sectionInspector: "점검자 정보",
  sectionSignature: "서명",
  sectionNotes: "비고",
  deviceManufacturer: "제조사",
  deviceModel: "제품명 또는 모델명",
  deviceSerial: "제조번호",
  deviceLocation: "설치위치",
  deviceExpiresAt: "본체유효사용가능기한",
  devicePadReplaceAt: "패드 교체 예정일자",
  colCode: "코드",
  colItemName: "항목",
  colResult: "결과",
  colRemark: "비고",
  resultOk: "이상없음",
  resultNg: "이상있음",
  summaryTotal: "총 점검 항목",
  summaryOk: "이상없음",
  summaryNg: "이상있음",
  inspectorName: "성명",
  inspectorEmail: "이메일",
  inspectorPhone: "연락처",
  inspectedAt: "점검 일시",
}

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------
const en: ReportLabels = {
  title: "AED Inspection Report",
  subtitleYearMonth: "Inspection Period",
  organization: "Organization",
  contactEmail: "Contact Email",

  deviceInfo: "Device Information",
  maintenance: "Maintenance Period",
  location: "Installation Location",

  manufacturer: "Manufacturer",
  model: "Product / Model Name",
  serial: "Serial Number",
  manufacturedAt: "Manufactured Date",
  purchasedAt: "Purchase Date",
  expiresAt: "Device Expiry",
  padReplaceAt: "Pad Replacement Due",
  batteryReplaceAt: "Battery Replacement Due",

  no: "No.",
  item: "Inspection Item",
  result: "Result",
  abnormal: "Abnormal",
  normal: "Normal",

  managerChange: "Manager Change",
  hasChange: "Yes",
  noChange: "No",
  managerName: "Manager Name",
  managerPhone: "Manager Phone (Emergency)",

  operatingHours: "Operating Hours",
  available24h: "Available 24 hours",
  notAvailable24h: "Not available 24 hours",

  inspectionDate: "Inspection Date",
  inspector: "Inspector",
  signature: "(Signature)",

  groupNames: {
    1: "Main Unit Operation",
    2: "Cabinet Status",
    3: "AED Location Signage",
    4: "Management Documentation",
    5: "Manager Change",
    6: "Operating Hours",
  },
  notesNone: "(none)",
  notesLabel: "Notes",
  signatureMissing: "[Signature Missing]",
  footerPage: (current, total) => `${current} / ${total}`,

  itemNames: {
    OP_POWER: "Main unit operating status (power indicator blinking)",
    OP_PAD: "Patient electrode pads present",
    OP_BATTERY: "Battery charge state",
    BX_ALARM: "Anti-theft alarm working",
    BX_GUIDE: "Cabinet guidance labels state",
    BX_EMG: "Emergency contact list displayed",
    BX_CPR: "CPR guidance booklet present",
    BX_EXP: "Pad/battery expiry date labeled",
    LOC_ENT: "Building entrance signage",
    LOC_DIR: "Installation location and direction signage",
    DOC_FILE: "Management documentation prepared and present",
    TIME_24: "Available 24 hours",
  },

  // Legacy aliases
  sectionDevice: "Device Information",
  sectionItems: "Inspection Items",
  sectionSummary: "Summary",
  sectionInspector: "Inspector",
  sectionSignature: "Signature",
  sectionNotes: "Notes",
  deviceManufacturer: "Manufacturer",
  deviceModel: "Product / Model Name",
  deviceSerial: "Serial Number",
  deviceLocation: "Installation Location",
  deviceExpiresAt: "Device Expiry",
  devicePadReplaceAt: "Pad Replacement Due",
  colCode: "Code",
  colItemName: "Item",
  colResult: "Result",
  colRemark: "Remark",
  resultOk: "OK",
  resultNg: "NG",
  summaryTotal: "Total Items",
  summaryOk: "OK",
  summaryNg: "NG",
  inspectorName: "Name",
  inspectorEmail: "Email",
  inspectorPhone: "Phone",
  inspectedAt: "Inspected At",
}

export const REPORT_LABELS: Record<ReportLocale, ReportLabels> = { ko, en } as const

export function getLabels(locale: ReportLocale): ReportLabels {
  return REPORT_LABELS[locale]
}
