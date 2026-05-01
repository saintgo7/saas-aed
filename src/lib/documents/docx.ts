// DOCX generator for AED inspection reports.
//
// Dependency: `docx` (already in package.json).
// Korean glyph rendering relies on the reader having "Malgun Gothic" / "Pretendard"
// installed (Word renders fonts client-side; we just declare the run font).

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  PageOrientation,
  type ITableCellOptions,
  type IRunOptions,
} from "docx"

import { getLabels } from "./i18n"
import {
  INSPECTION_ITEM_CODES,
  type InspectionItemCode,
  type InspectionReportData,
  type ReportLocale,
} from "./types"

// Default font: prefer Pretendard (project standard), fall back to Malgun Gothic.
const DEFAULT_FONT = "Malgun Gothic"

// Column widths in DXA (1/20 pt). Tuned for A4 portrait with 24mm margins.
// Total table width target: ~9000 DXA.
const DEVICE_COL_WIDTHS = [2400, 6600] as const // label / value
const ITEMS_COL_WIDTHS = [1400, 4400, 1200, 2000] as const // code / name / result / remark
const SUMMARY_COL_WIDTHS = [3000, 6000] as const
const INSPECTOR_COL_WIDTHS = [2400, 6600] as const

const TABLE_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
}

function runText(text: string, opts: Omit<IRunOptions, "text"> = {}): TextRun {
  return new TextRun({ text, font: DEFAULT_FONT, ...opts })
}

function paragraph(text: string, opts: { bold?: boolean; align?: AlignmentType } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    children: [runText(text, { bold: opts.bold })],
  })
}

function cell(
  children: Paragraph[],
  width: number,
  extra: Partial<ITableCellOptions> = {},
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children,
    ...extra,
  })
}

function labelCell(label: string, width: number): TableCell {
  return cell([paragraph(label, { bold: true })], width, {
    shading: { fill: "F2F2F2", color: "auto", type: ShadingType.CLEAR },
  })
}

function valueCell(value: string, width: number): TableCell {
  return cell([paragraph(value)], width)
}

function formatDate(d: Date): string {
  // YYYY-MM-DD — locale-agnostic, unambiguous.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDateTime(d: Date): string {
  const date = formatDate(d)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${date} ${hh}:${mm}`
}

function buildDeviceTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const rows: TableRow[] = [
    new TableRow({
      children: [
        labelCell(L.deviceManufacturer, DEVICE_COL_WIDTHS[0]),
        valueCell(data.device.manufacturer, DEVICE_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.deviceModel, DEVICE_COL_WIDTHS[0]),
        valueCell(data.device.model, DEVICE_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.deviceSerial, DEVICE_COL_WIDTHS[0]),
        valueCell(data.device.serial, DEVICE_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.deviceLocation, DEVICE_COL_WIDTHS[0]),
        valueCell(data.device.location, DEVICE_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.deviceExpiresAt, DEVICE_COL_WIDTHS[0]),
        valueCell(formatDate(data.device.expiresAt), DEVICE_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.devicePadReplaceAt, DEVICE_COL_WIDTHS[0]),
        valueCell(formatDate(data.device.padReplaceAt), DEVICE_COL_WIDTHS[1]),
      ],
    }),
  ]
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows,
    borders: TABLE_BORDER,
  })
}

function buildItemsTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const header = new TableRow({
    tableHeader: true,
    children: [
      labelCell(L.colCode, ITEMS_COL_WIDTHS[0]),
      labelCell(L.colItemName, ITEMS_COL_WIDTHS[1]),
      labelCell(L.colResult, ITEMS_COL_WIDTHS[2]),
      labelCell(L.colRemark, ITEMS_COL_WIDTHS[3]),
    ],
  })

  const bodyRows = INSPECTION_ITEM_CODES.map((code) => {
    const result = data.items[code]
    const resultLabel =
      result === "OK" ? L.resultOk : result === "NG" ? L.resultNg : "-"
    const resultColor = result === "NG" ? "C0392B" : result === "OK" ? "1E8449" : "555555"
    return new TableRow({
      children: [
        valueCell(code, ITEMS_COL_WIDTHS[0]),
        valueCell(L.itemNames[code as InspectionItemCode], ITEMS_COL_WIDTHS[1]),
        new TableCell({
          width: { size: ITEMS_COL_WIDTHS[2], type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [runText(resultLabel, { bold: true, color: resultColor })],
            }),
          ],
        }),
        valueCell("", ITEMS_COL_WIDTHS[3]),
      ],
    })
  })

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [header, ...bodyRows],
    borders: TABLE_BORDER,
  })
}

function buildSummaryTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const total = INSPECTION_ITEM_CODES.length
  const okCount = INSPECTION_ITEM_CODES.filter((c) => data.items[c] === "OK").length
  const ngCount = INSPECTION_ITEM_CODES.filter((c) => data.items[c] === "NG").length

  const rows: TableRow[] = [
    new TableRow({
      children: [
        labelCell(L.summaryTotal, SUMMARY_COL_WIDTHS[0]),
        valueCell(String(total), SUMMARY_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.summaryOk, SUMMARY_COL_WIDTHS[0]),
        valueCell(String(okCount), SUMMARY_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.summaryNg, SUMMARY_COL_WIDTHS[0]),
        new TableCell({
          width: { size: SUMMARY_COL_WIDTHS[1], type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [
                runText(String(ngCount), {
                  bold: true,
                  color: ngCount > 0 ? "C0392B" : "1E8449",
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ]

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows,
    borders: TABLE_BORDER,
  })
}

function buildInspectorTable(data: InspectionReportData, locale: ReportLocale): Table {
  const L = getLabels(locale)
  const rows: TableRow[] = [
    new TableRow({
      children: [
        labelCell(L.inspectorName, INSPECTOR_COL_WIDTHS[0]),
        valueCell(data.inspector.name, INSPECTOR_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.inspectorEmail, INSPECTOR_COL_WIDTHS[0]),
        valueCell(data.inspector.email, INSPECTOR_COL_WIDTHS[1]),
      ],
    }),
    new TableRow({
      children: [
        labelCell(L.inspectorPhone, INSPECTOR_COL_WIDTHS[0]),
        valueCell(data.inspector.phone ?? "-", INSPECTOR_COL_WIDTHS[1]),
      ],
    }),
  ]

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows,
    borders: TABLE_BORDER,
  })
}

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

function buildSignatureParagraph(
  data: InspectionReportData,
  locale: ReportLocale,
): Paragraph {
  const L = getLabels(locale)
  if (!data.signatureDataUrl) {
    return new Paragraph({
      children: [runText(L.signatureMissing, { italics: true, color: "888888" })],
    })
  }
  try {
    const { buffer, type } = decodeSignature(data.signatureDataUrl)
    return new Paragraph({
      children: [
        new ImageRun({
          data: buffer,
          transformation: { width: 180, height: 80 },
          type,
        }),
      ],
    })
  } catch (error) {
    console.error("Failed to decode signature image:", error)
    return new Paragraph({
      children: [runText(L.signatureMissing, { italics: true, color: "888888" })],
    })
  }
}

/**
 * Build the AED inspection report as a DOCX buffer.
 */
export async function generateDocx(
  data: InspectionReportData,
  locale: ReportLocale = "ko",
): Promise<Buffer> {
  const L = getLabels(locale)

  const titleParagraph = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [runText(L.title, { bold: true, size: 36 })],
  })

  const subTitleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      runText(`${data.organization.name}  ·  ${L.subtitleYearMonth}: ${data.yearMonth}`, {
        size: 22,
      }),
    ],
  })

  const sectionHeader = (text: string): Paragraph =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [runText(text, { bold: true, size: 26 })],
    })

  const notesText = data.notes && data.notes.trim().length > 0 ? data.notes : L.notesNone

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
            margin: { top: 1360, right: 1360, bottom: 1360, left: 1360 }, // ~24mm
          },
        },
        children: [
          titleParagraph,
          subTitleParagraph,

          sectionHeader(L.sectionDevice),
          buildDeviceTable(data, locale),

          sectionHeader(L.sectionItems),
          buildItemsTable(data, locale),

          sectionHeader(L.sectionSummary),
          buildSummaryTable(data, locale),

          sectionHeader(L.sectionInspector),
          buildInspectorTable(data, locale),

          sectionHeader(L.sectionSignature),
          buildSignatureParagraph(data, locale),

          sectionHeader(L.sectionNotes),
          new Paragraph({ children: [runText(notesText)] }),

          new Paragraph({
            spacing: { before: 240 },
            children: [
              runText(`${L.inspectedAt}: ${formatDateTime(data.inspectedAt)}`, {
                size: 20,
              }),
            ],
          }),
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
