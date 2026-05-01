// PDF generator for AED inspection reports.
//
// Dependency: `@react-pdf/renderer` (already in package.json).
// Korean glyphs require a registered TTF — we register Pretendard from
// /public/fonts/Pretendard-Regular.ttf (and -Bold.ttf when available).
// Drop the TTFs into public/fonts/ before generating Korean PDFs.

import * as React from "react"
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import path from "node:path"

import { getLabels } from "./i18n"
import {
  INSPECTION_ITEM_CODES,
  type InspectionItemCode,
  type InspectionReportData,
  type ReportLocale,
} from "./types"

// ---------- Font registration -------------------------------------------------

let fontsRegistered = false

function registerFontsOnce(): void {
  if (fontsRegistered) return
  // Resolve from project root so this works in dev (next dev) and prod (next start).
  const fontDir = path.join(process.cwd(), "public", "fonts")
  try {
    Font.register({
      family: "Pretendard",
      fonts: [
        { src: path.join(fontDir, "Pretendard-Regular.ttf"), fontWeight: 400 },
        { src: path.join(fontDir, "Pretendard-Bold.ttf"), fontWeight: 700 },
      ],
    })
    // Disable hyphenation so Korean lines do not break with hyphens.
    Font.registerHyphenationCallback((word) => [word])
    fontsRegistered = true
  } catch (error) {
    console.error("Pretendard font registration failed:", error)
    throw new Error(
      "Pretendard fonts not found. Place Pretendard-Regular.ttf and Pretendard-Bold.ttf in public/fonts/.",
    )
  }
}

// ---------- Styles ------------------------------------------------------------

// Column widths in % — must mirror DOCX layout proportions.
// Device/Inspector/Summary tables: [25%, 75%]
// Items table: [15%, 49%, 13%, 23%] (sums to 100%)
const COLS = {
  label: "25%",
  value: "75%",
  itemCode: "15%",
  itemName: "49%",
  itemResult: "13%",
  itemRemark: "23%",
} as const

const styles = StyleSheet.create({
  page: {
    paddingTop: 68, // ~24mm
    paddingBottom: 68,
    paddingHorizontal: 68,
    fontFamily: "Pretendard",
    fontSize: 10,
    color: "#1a1a1a",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    textAlign: "center",
    color: "#444",
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#666",
    borderBottomStyle: "solid",
  },
  table: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#999",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#bbb",
  },
  rowLast: {
    flexDirection: "row",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#999",
  },
  cellLabel: {
    backgroundColor: "#f2f2f2",
    padding: 6,
    fontWeight: 700,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: "#bbb",
  },
  cellValue: {
    padding: 6,
  },
  cellHeader: {
    padding: 6,
    fontWeight: 700,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: "#bbb",
  },
  cellHeaderLast: {
    padding: 6,
    fontWeight: 700,
  },
  cellBody: {
    padding: 6,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: "#bbb",
  },
  cellBodyLast: {
    padding: 6,
  },
  resultOk: { color: "#1E8449", fontWeight: 700, textAlign: "center" },
  resultNg: { color: "#C0392B", fontWeight: 700, textAlign: "center" },
  resultNone: { color: "#555", textAlign: "center" },
  signatureBox: {
    height: 80,
    width: 180,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  signatureMissing: {
    color: "#888",
    fontStyle: "italic",
  },
  notes: {
    padding: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#999",
    minHeight: 40,
  },
  inspectedAt: {
    marginTop: 16,
    fontSize: 10,
    color: "#444",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 68,
    right: 68,
    fontSize: 9,
    color: "#888",
    textAlign: "center",
  },
})

// ---------- Helpers -----------------------------------------------------------

function formatDate(d: Date): string {
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

// ---------- Sub-components ----------------------------------------------------

type LabelValueRow = { label: string; value: string; isLast?: boolean }

function KeyValueTable({ rows }: { rows: LabelValueRow[] }): React.ReactElement {
  return (
    <View style={styles.table}>
      {rows.map((r, i) => (
        <View key={r.label} style={i === rows.length - 1 ? styles.rowLast : styles.row}>
          <View style={[styles.cellLabel, { width: COLS.label }]}>
            <Text>{r.label}</Text>
          </View>
          <View style={[styles.cellValue, { width: COLS.value }]}>
            <Text>{r.value}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function ItemsTable({
  data,
  locale,
}: {
  data: InspectionReportData
  locale: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <View style={[styles.cellHeader, { width: COLS.itemCode }]}>
          <Text>{L.colCode}</Text>
        </View>
        <View style={[styles.cellHeader, { width: COLS.itemName }]}>
          <Text>{L.colItemName}</Text>
        </View>
        <View style={[styles.cellHeader, { width: COLS.itemResult }]}>
          <Text>{L.colResult}</Text>
        </View>
        <View style={[styles.cellHeaderLast, { width: COLS.itemRemark }]}>
          <Text>{L.colRemark}</Text>
        </View>
      </View>
      {INSPECTION_ITEM_CODES.map((code, i) => {
        const isLast = i === INSPECTION_ITEM_CODES.length - 1
        const result = data.items[code]
        const resultLabel =
          result === "OK" ? L.resultOk : result === "NG" ? L.resultNg : "-"
        const resultStyle =
          result === "OK"
            ? styles.resultOk
            : result === "NG"
              ? styles.resultNg
              : styles.resultNone
        return (
          <View key={code} style={isLast ? styles.rowLast : styles.row}>
            <View style={[styles.cellBody, { width: COLS.itemCode }]}>
              <Text>{code}</Text>
            </View>
            <View style={[styles.cellBody, { width: COLS.itemName }]}>
              <Text>{L.itemNames[code as InspectionItemCode]}</Text>
            </View>
            <View style={[styles.cellBody, { width: COLS.itemResult }]}>
              <Text style={resultStyle}>{resultLabel}</Text>
            </View>
            <View style={[styles.cellBodyLast, { width: COLS.itemRemark }]}>
              <Text> </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

function Signature({
  data,
  locale,
}: {
  data: InspectionReportData
  locale: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  if (!data.signatureDataUrl) {
    return (
      <View style={styles.signatureBox}>
        <Text style={styles.signatureMissing}>{L.signatureMissing}</Text>
      </View>
    )
  }
  return (
    <View style={styles.signatureBox}>
      {/* react-pdf accepts data URLs directly. */}
      <Image src={data.signatureDataUrl} style={{ width: 178, height: 78 }} />
    </View>
  )
}

// ---------- Public component --------------------------------------------------

export function InspectionReport({
  data,
  locale = "ko",
}: {
  data: InspectionReportData
  locale?: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  const total = INSPECTION_ITEM_CODES.length
  const okCount = INSPECTION_ITEM_CODES.filter((c) => data.items[c] === "OK").length
  const ngCount = INSPECTION_ITEM_CODES.filter((c) => data.items[c] === "NG").length
  const notesText = data.notes && data.notes.trim().length > 0 ? data.notes : L.notesNone

  return (
    <Document title={L.title} author="saas-aed">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{L.title}</Text>
        <Text style={styles.subtitle}>
          {data.organization.name} · {L.subtitleYearMonth}: {data.yearMonth}
        </Text>

        <Text style={styles.sectionHeading}>{L.sectionDevice}</Text>
        <KeyValueTable
          rows={[
            { label: L.deviceManufacturer, value: data.device.manufacturer },
            { label: L.deviceModel, value: data.device.model },
            { label: L.deviceSerial, value: data.device.serial },
            { label: L.deviceLocation, value: data.device.location },
            { label: L.deviceExpiresAt, value: formatDate(data.device.expiresAt) },
            { label: L.devicePadReplaceAt, value: formatDate(data.device.padReplaceAt) },
          ]}
        />

        <Text style={styles.sectionHeading}>{L.sectionItems}</Text>
        <ItemsTable data={data} locale={locale} />

        <Text style={styles.sectionHeading}>{L.sectionSummary}</Text>
        <KeyValueTable
          rows={[
            { label: L.summaryTotal, value: String(total) },
            { label: L.summaryOk, value: String(okCount) },
            { label: L.summaryNg, value: String(ngCount) },
          ]}
        />

        <Text style={styles.sectionHeading}>{L.sectionInspector}</Text>
        <KeyValueTable
          rows={[
            { label: L.inspectorName, value: data.inspector.name },
            { label: L.inspectorEmail, value: data.inspector.email },
            { label: L.inspectorPhone, value: data.inspector.phone ?? "-" },
          ]}
        />

        <Text style={styles.sectionHeading}>{L.sectionSignature}</Text>
        <Signature data={data} locale={locale} />

        <Text style={styles.sectionHeading}>{L.sectionNotes}</Text>
        <View style={styles.notes}>
          <Text>{notesText}</Text>
        </View>

        <Text style={styles.inspectedAt}>
          {L.inspectedAt}: {formatDateTime(data.inspectedAt)}
        </Text>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            L.footerPage(pageNumber, totalPages)
          }
          fixed
        />
      </Page>
    </Document>
  )
}

/**
 * Render the AED inspection report to a PDF buffer.
 */
export async function generatePdf(
  data: InspectionReportData,
  locale: ReportLocale = "ko",
): Promise<Buffer> {
  registerFontsOnce()
  try {
    const buffer = await renderToBuffer(<InspectionReport data={data} locale={locale} />)
    return buffer
  } catch (error) {
    console.error("Failed to render PDF:", error)
    throw new Error("Failed to generate PDF report")
  }
}
