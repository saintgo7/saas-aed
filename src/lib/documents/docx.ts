// DOCX generator for AED inspection reports.
//
// 1:1 port of the 보건복지부 자동심장충격기 점검표 HWPX form
// (docs/forms/aed-inspection-form-mohw.txt).
//
// Layout overview (top → bottom):
//   1. Title "자동심장충격기 점검표" (centered, bold)
//   2. Meta line: 기관 · 점검 연월 (right-aligned, small)
//   3. 장비정보 table (4 cols: 제조사 · 제품명/모델명 · 제조번호 · 제조 연월일)
//   4. 장비유지기간 table (3 cols: 장비구매일자 · 본체유효사용가능기한 · 교체예정일자)
//   5. 설치위치 row (single row)
//   6. Main inspection table (5 cols: 연번 · 점검항목 · 점검결과(헤더) · 이상있음 · 이상없음)
//      - Group 1 (3 sub-items) with extra "패드 교체 예정일자" / "건전지 교체 예정일자" rows
//      - Group 2 (5 sub-items)
//      - Group 3 (2 sub-items)
//      - Group 4 (single row)
//      - Group 5 (관리자 변경사항: 있음/없음 + 관리자 이름/전화번호)
//      - Group 6 (24시간 이용 가능 / 24시간 사용 불가)
//   7. Footer: 점검일 (left) + 점검자 / 서명 (right)
//
// Korean glyph rendering relies on the reader having "Malgun Gothic" /
// "Pretendard" installed; Word resolves fonts client-side, we just declare them.

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
  PageOrientation,
  type IRunOptions,
} from "docx"

import { INSPECTION_ITEMS } from "@/lib/inspection/items"
import { getLabels } from "./i18n"
import type { InspectionReportData, ReportLocale } from "./types"

// ----- Constants ------------------------------------------------------------

const DEFAULT_FONT = "Malgun Gothic"
const TABLE_WIDTH_DXA = 9000
const CHECK_MARK = "✓"

// Four-column main table widths (sum = 9000). The 점검결과 header spans
// the last two columns (이상있음 / 이상없음) via columnSpan.
const MAIN_COL_NO = 700
const MAIN_COL_ITEM = 5300
const MAIN_COL_NG = 1500
const MAIN_COL_OK = 1500

const TABLE_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 6, color: "555555" },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: "555555" },
  left: { style: BorderStyle.SINGLE, size: 6, color: "555555" },
  right: { style: BorderStyle.SINGLE, size: 6, color: "555555" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
}

const HEADER_SHADING = {
  fill: "EAEAEA",
  color: "auto",
  type: ShadingType.CLEAR,
} as const

const GROUP_SHADING = {
  fill: "F4F4F4",
  color: "auto",
  type: ShadingType.CLEAR,
} as const

// ----- Helpers --------------------------------------------------------------

function runText(text: string, opts: Omit<IRunOptions, "text"> = {}): TextRun {
  return new TextRun({ text, font: DEFAULT_FONT, ...opts })
}

function emptyP(): Paragraph {
  return new Paragraph({ children: [runText("")] })
}

function formatDate(d: Date | undefined): string {
  if (!d) return "-"
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDateKorean(d: Date): string {
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(
    d.getDate(),
  ).padStart(2, "0")}일`
}

type CellOpts = {
  width?: number
  shading?: { fill: string; color: string; type: typeof ShadingType.CLEAR }
  align?: (typeof AlignmentType)[keyof typeof AlignmentType]
  vAlign?: (typeof VerticalAlignTable)[keyof typeof VerticalAlignTable]
  rowSpan?: number
  columnSpan?: number
  bold?: boolean
  size?: number
}

function textCell(text: string, opts: CellOpts = {}): TableCell {
  const para = new Paragraph({
    alignment: opts.align,
    children: [runText(text, { bold: opts.bold, size: opts.size })],
  })
  return new TableCell({
    width:
      opts.width !== undefined
        ? { size: opts.width, type: WidthType.DXA }
        : undefined,
    shading: opts.shading,
    verticalAlign: opts.vAlign ?? VerticalAlignTable.CENTER,
    rowSpan: opts.rowSpan,
    columnSpan: opts.columnSpan,
    children: [para],
  })
}

function multiCell(children: Paragraph[], opts: CellOpts = {}): TableCell {
  return new TableCell({
    width:
      opts.width !== undefined
        ? { size: opts.width, type: WidthType.DXA }
        : undefined,
    shading: opts.shading,
    verticalAlign: opts.vAlign ?? VerticalAlignTable.CENTER,
    rowSpan: opts.rowSpan,
    columnSpan: opts.columnSpan,
    children,
  })
}

// ----- Section builders -----------------------------------------------------

/**
 * 장비정보 — 4 columns wide (제조사 / 제품명 / 제조번호 / 제조 연월일).
 * Two rows: header labels + values.
 */
function buildDeviceInfoTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const colWidth = TABLE_WIDTH_DXA / 4

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      textCell(L.manufacturer, { width: colWidth, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
      textCell(L.model, { width: colWidth, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
      textCell(L.serial, { width: colWidth, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
      textCell(L.manufacturedAt, { width: colWidth, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
    ],
  })

  const valueRow = new TableRow({
    children: [
      textCell(data.device.manufacturer, { width: colWidth, align: AlignmentType.CENTER }),
      textCell(data.device.model, { width: colWidth, align: AlignmentType.CENTER }),
      textCell(data.device.serial, { width: colWidth, align: AlignmentType.CENTER }),
      textCell(formatDate(data.device.manufacturedAt), { width: colWidth, align: AlignmentType.CENTER }),
    ],
  })

  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [colWidth, colWidth, colWidth, colWidth],
    rows: [headerRow, valueRow],
    borders: TABLE_BORDER,
  })
}

/**
 * 장비유지기간 — 3 columns: 장비구매일자 / 본체유효사용가능기한 / 교체예정일자.
 */
function buildMaintenanceTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const colWidth = TABLE_WIDTH_DXA / 3

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      textCell(L.purchasedAt, { width: colWidth, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
      textCell(L.expiresAt, { width: colWidth, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
      textCell(L.padReplaceAt, { width: colWidth, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
    ],
  })

  const valueRow = new TableRow({
    children: [
      textCell(formatDate(data.device.purchasedAt), { width: colWidth, align: AlignmentType.CENTER }),
      textCell(formatDate(data.device.expiresAt), { width: colWidth, align: AlignmentType.CENTER }),
      textCell(formatDate(data.device.padReplaceAt), { width: colWidth, align: AlignmentType.CENTER }),
    ],
  })

  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [colWidth, colWidth, colWidth],
    rows: [headerRow, valueRow],
    borders: TABLE_BORDER,
  })
}

/**
 * 설치위치 — single label/value row spanning the full width.
 */
function buildLocationTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const labelW = 1800
  const valueW = TABLE_WIDTH_DXA - labelW

  const row = new TableRow({
    children: [
      textCell(L.location, { width: labelW, shading: HEADER_SHADING, align: AlignmentType.CENTER, bold: true }),
      textCell(data.device.location, { width: valueW, align: AlignmentType.LEFT }),
    ],
  })

  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [labelW, valueW],
    rows: [row],
    borders: TABLE_BORDER,
  })
}

// ----- Main inspection table ------------------------------------------------

type ItemResult = "OK" | "NG" | undefined

function resultMark(value: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [runText(value, { bold: true, size: 22 })],
  })
}

function checkCells(result: ItemResult, ngWidth: number, okWidth: number): TableCell[] {
  const ngText = result === "NG" ? CHECK_MARK : ""
  const okText = result === "OK" ? CHECK_MARK : ""
  return [
    new TableCell({
      width: { size: ngWidth, type: WidthType.DXA },
      verticalAlign: VerticalAlignTable.CENTER,
      children: [resultMark(ngText)],
    }),
    new TableCell({
      width: { size: okWidth, type: WidthType.DXA },
      verticalAlign: VerticalAlignTable.CENTER,
      children: [resultMark(okText)],
    }),
  ]
}

function buildItemRow(
  noText: string,
  itemText: string,
  result: ItemResult,
): TableRow {
  return new TableRow({
    height: { value: 360, rule: HeightRule.ATLEAST },
    children: [
      textCell(noText, { width: MAIN_COL_NO, align: AlignmentType.CENTER }),
      textCell(itemText, { width: MAIN_COL_ITEM, align: AlignmentType.LEFT }),
      ...checkCells(result, MAIN_COL_NG, MAIN_COL_OK),
    ],
  })
}

function buildGroupHeaderRow(no: number, name: string): TableRow {
  return new TableRow({
    height: { value: 380, rule: HeightRule.ATLEAST },
    children: [
      textCell(String(no), {
        width: MAIN_COL_NO,
        shading: GROUP_SHADING,
        align: AlignmentType.CENTER,
        bold: true,
      }),
      textCell(name, {
        width: MAIN_COL_ITEM + MAIN_COL_NG + MAIN_COL_OK,
        shading: GROUP_SHADING,
        align: AlignmentType.LEFT,
        bold: true,
        columnSpan: 3,
      }),
    ],
  })
}

function buildAnnotationRow(text: string): TableRow {
  // Italic-ish small annotation in 점검항목 column, no result marks
  return new TableRow({
    height: { value: 280, rule: HeightRule.ATLEAST },
    children: [
      textCell("", { width: MAIN_COL_NO }),
      multiCell(
        [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              runText(text, { color: "555555", size: 18 }),
            ],
          }),
        ],
        { width: MAIN_COL_ITEM + MAIN_COL_NG + MAIN_COL_OK, columnSpan: 3 },
      ),
    ],
  })
}

function buildMainInspectionTable(
  data: InspectionReportData,
  locale: ReportLocale,
): Table {
  const L = getLabels(locale)
  const items = data.items as Record<string, "OK" | "NG">

  // Column header row with merged 점검결과 spanning 이상있음 + 이상없음.
  // Row1: [연번 (rowSpan 2)] [점검항목 (rowSpan 2)] [점검결과 (colSpan 2)]
  // Row2:                                                 [이상있음] [이상없음]
  const headerRow1 = new TableRow({
    tableHeader: true,
    height: { value: 360, rule: HeightRule.ATLEAST },
    children: [
      textCell(L.no, {
        width: MAIN_COL_NO,
        shading: HEADER_SHADING,
        align: AlignmentType.CENTER,
        bold: true,
        rowSpan: 2,
      }),
      textCell(L.item, {
        width: MAIN_COL_ITEM,
        shading: HEADER_SHADING,
        align: AlignmentType.CENTER,
        bold: true,
        rowSpan: 2,
      }),
      textCell(L.result, {
        width: MAIN_COL_NG + MAIN_COL_OK,
        shading: HEADER_SHADING,
        align: AlignmentType.CENTER,
        bold: true,
        columnSpan: 2,
      }),
    ],
  })

  const headerRow2 = new TableRow({
    tableHeader: true,
    height: { value: 320, rule: HeightRule.ATLEAST },
    children: [
      textCell(L.abnormal, {
        width: MAIN_COL_NG,
        shading: HEADER_SHADING,
        align: AlignmentType.CENTER,
        bold: true,
      }),
      textCell(L.normal, {
        width: MAIN_COL_OK,
        shading: HEADER_SHADING,
        align: AlignmentType.CENTER,
        bold: true,
      }),
    ],
  })

  const rows: TableRow[] = [headerRow1, headerRow2]

  // ----- Group 1 ~ 4 derived from INSPECTION_ITEMS -----
  for (const groupNo of [1, 2, 3, 4] as const) {
    const groupItems = INSPECTION_ITEMS.filter((i) => i.group === groupNo)
    if (groupItems.length === 0) continue

    rows.push(
      buildGroupHeaderRow(
        groupNo,
        L.groupNames[groupNo as keyof typeof L.groupNames],
      ),
    )

    for (const it of groupItems) {
      const labelKo = it.labelKo
      const labelEn = it.labelEn
      const baseLabel = locale === "ko" ? labelKo : labelEn
      const display = it.sub ? `${it.sub} ${baseLabel}` : baseLabel
      rows.push(buildItemRow("", display, items[it.code]))

      // Inline annotations matching HWPX form
      if (it.code === "OP_PAD") {
        rows.push(
          buildAnnotationRow(
            `⦁ ${L.padReplaceAt} : ${formatDate(data.device.padReplaceAt)}`,
          ),
        )
      } else if (it.code === "OP_BATTERY") {
        rows.push(
          buildAnnotationRow(
            `⦁ ${L.batteryReplaceAt} : ${formatDate(data.device.batteryReplaceAt)}`,
          ),
        )
      }
    }
  }

  // ----- Group 5: 관리자 변경사항 (있음 / 없음) -----
  rows.push(
    new TableRow({
      height: { value: 380, rule: HeightRule.ATLEAST },
      children: [
        textCell("5", {
          width: MAIN_COL_NO,
          shading: GROUP_SHADING,
          align: AlignmentType.CENTER,
          bold: true,
        }),
        textCell(L.managerChange, {
          width: MAIN_COL_ITEM,
          shading: GROUP_SHADING,
          align: AlignmentType.LEFT,
          bold: true,
        }),
        textCell(L.hasChange, {
          width: MAIN_COL_NG,
          shading: GROUP_SHADING,
          align: AlignmentType.CENTER,
          bold: true,
        }),
        textCell(L.noChange, {
          width: MAIN_COL_OK,
          shading: GROUP_SHADING,
          align: AlignmentType.CENTER,
          bold: true,
        }),
      ],
    }),
  )

  const managerHasChange = data.manager?.hasChange ?? false
  const managerName = data.manager?.name ?? ""
  const managerPhone = data.manager?.phone ?? ""
  rows.push(
    new TableRow({
      height: { value: 360, rule: HeightRule.ATLEAST },
      children: [
        textCell("", { width: MAIN_COL_NO }),
        textCell(
          `① ${L.managerName} : ${managerName || "    "}    ${L.managerPhone} : ${managerPhone || "    "}`,
          { width: MAIN_COL_ITEM, align: AlignmentType.LEFT },
        ),
        textCell(managerHasChange ? CHECK_MARK : "", {
          width: MAIN_COL_NG,
          align: AlignmentType.CENTER,
          bold: true,
          size: 22,
        }),
        textCell(!managerHasChange ? CHECK_MARK : "", {
          width: MAIN_COL_OK,
          align: AlignmentType.CENTER,
          bold: true,
          size: 22,
        }),
      ],
    }),
  )

  // ----- Group 6: 장비 사용 가능 시간 -----
  rows.push(buildGroupHeaderRow(6, L.operatingHours))

  const available24h = data.device.available24h ?? items["TIME_24"] === "OK"
  rows.push(
    new TableRow({
      height: { value: 360, rule: HeightRule.ATLEAST },
      children: [
        textCell("", { width: MAIN_COL_NO }),
        textCell(`① ${L.available24h}`, {
          width: MAIN_COL_ITEM,
          align: AlignmentType.LEFT,
        }),
        textCell(available24h ? CHECK_MARK : "", {
          width: MAIN_COL_NG,
          align: AlignmentType.CENTER,
          bold: true,
          size: 22,
        }),
        textCell("", { width: MAIN_COL_OK }),
      ],
    }),
  )
  rows.push(
    new TableRow({
      height: { value: 360, rule: HeightRule.ATLEAST },
      children: [
        textCell("", { width: MAIN_COL_NO }),
        textCell(`② ${L.notAvailable24h}`, {
          width: MAIN_COL_ITEM,
          align: AlignmentType.LEFT,
        }),
        textCell(!available24h ? CHECK_MARK : "", {
          width: MAIN_COL_NG,
          align: AlignmentType.CENTER,
          bold: true,
          size: 22,
        }),
        textCell("", { width: MAIN_COL_OK }),
      ],
    }),
  )

  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [MAIN_COL_NO, MAIN_COL_ITEM, MAIN_COL_NG, MAIN_COL_OK],
    rows,
    borders: TABLE_BORDER,
  })
}

// ----- Footer (date + signature) --------------------------------------------

function decodeSignature(dataUrl: string): { buffer: Buffer; type: "png" | "jpg" } {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(dataUrl)
  if (!match) {
    throw new Error("Invalid signatureDataUrl: expected base64 png/jpeg data URL")
  }
  const ext = match[1] === "png" ? "png" : "jpg"
  const buf = Buffer.from(match[2] ?? "", "base64")
  if (buf.length === 0) {
    throw new Error("Invalid signatureDataUrl: empty payload")
  }
  return { buffer: buf, type: ext }
}

/**
 * Footer table: [점검일 : YYYY년 MM월 DD일] | [점검자 : NAME (서명)] (with image)
 */
function buildFooterTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const left = TABLE_WIDTH_DXA / 2
  const right = TABLE_WIDTH_DXA - left

  const dateText =
    locale === "ko"
      ? `${L.inspectionDate} : ${formatDateKorean(data.inspectedAt)}`
      : `${L.inspectionDate} : ${formatDate(data.inspectedAt)}`

  const inspectorChildren: Paragraph[] = []
  inspectorChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        runText(`${L.inspector} : ${data.inspector.name}    ${L.signature}`, {
          bold: true,
        }),
      ],
    }),
  )

  if (data.signatureDataUrl) {
    try {
      const { buffer, type } = decodeSignature(data.signatureDataUrl)
      inspectorChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new ImageRun({
              data: buffer,
              transformation: { width: 100, height: 40 },
              type,
            }),
          ],
        }),
      )
    } catch (error) {
      console.error("Failed to decode signature image:", error)
      inspectorChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [runText(L.signatureMissing, { color: "888888" })],
        }),
      )
    }
  }

  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [left, right],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          multiCell([new Paragraph({ alignment: AlignmentType.LEFT, children: [runText(dateText, { bold: true })] })], {
            width: left,
            vAlign: VerticalAlignTable.TOP,
          }),
          multiCell(inspectorChildren, {
            width: right,
            vAlign: VerticalAlignTable.TOP,
          }),
        ],
      }),
    ],
  })
}

// ----- Public API -----------------------------------------------------------

/**
 * Build the AED inspection report as a DOCX buffer.
 */
export async function generateDocx(
  data: InspectionReportData,
  locale: ReportLocale = "ko",
): Promise<Buffer> {
  const L = getLabels(locale)

  const titleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [runText(L.title, { bold: true, size: 36 })],
  })

  const metaParagraph = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 160 },
    children: [
      runText(
        `${L.organization} : ${data.organization.name}    ${L.subtitleYearMonth} : ${data.yearMonth}`,
        { size: 18, color: "555555" },
      ),
    ],
  })

  const sectionHeader = (text: string): Paragraph =>
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [runText(text, { bold: true, size: 22 })],
    })

  const notesText = data.notes && data.notes.trim().length > 0 ? data.notes : L.notesNone

  const notesParagraph = new Paragraph({
    spacing: { before: 120 },
    children: [runText(`※ ${L.notesLabel} : ${notesText}`, { size: 18, color: "444444" })],
  })

  const doc = new Document({
    creator: "saas-aed",
    title: L.title,
    styles: {
      default: {
        document: { run: { font: DEFAULT_FONT, size: 20 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 },
          },
        },
        children: [
          titleParagraph,
          metaParagraph,

          sectionHeader(L.deviceInfo),
          buildDeviceInfoTable(data, locale),
          emptyP(),

          sectionHeader(L.maintenance),
          buildMaintenanceTable(data, locale),
          emptyP(),

          buildLocationTable(data, locale),
          emptyP(),

          buildMainInspectionTable(data, locale),

          notesParagraph,
          emptyP(),
          buildFooterTable(data, locale),
        ],
      },
    ],
  })

  try {
    return await Packer.toBuffer(doc)
  } catch (error) {
    console.error("Failed to pack DOCX:", error)
    throw new Error("Failed to generate DOCX report")
  }
}
