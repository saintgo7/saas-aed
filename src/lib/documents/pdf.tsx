// PDF generator for AED inspection reports.
//
// 1:1 visual port of the 보건복지부 자동심장충격기 점검표 HWPX form
// (docs/forms/aed-inspection-form-mohw.txt). Mirrors docx.ts so the two
// outputs are visually comparable side-by-side.
//
// Dependency: `@react-pdf/renderer`. Korean glyphs require a registered font;
// we register Pretendard from /public/fonts/Pretendard-{Regular,Bold}.otf.

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
import fs from "node:fs"
import path from "node:path"

import { INSPECTION_ITEMS } from "@/lib/inspection/items"
import { getLabels } from "./i18n"
import type { InspectionReportData, ReportLocale } from "./types"

// ---------- Font registration -------------------------------------------------

let fontsRegistered = false

function registerFontsOnce(): void {
  if (fontsRegistered) return
  const fontDir = path.resolve(process.cwd(), "public", "fonts")
  const regularPath = path.join(fontDir, "Pretendard-Regular.otf")
  const boldPath = path.join(fontDir, "Pretendard-Bold.otf")
  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
    throw new Error(
      `Pretendard fonts not found. Place Pretendard-Regular.otf and Pretendard-Bold.otf in ${fontDir}.`,
    )
  }
  try {
    Font.register({
      family: "Pretendard",
      fonts: [
        { src: regularPath, fontWeight: 400 },
        { src: boldPath, fontWeight: 700 },
      ],
    })
    Font.registerHyphenationCallback((word) => [word])
    fontsRegistered = true
  } catch (error) {
    console.error("Pretendard font registration failed:", error)
    throw new Error(
      "Pretendard font registration failed. Check that the OTF files in public/fonts/ are valid.",
    )
  }
}

// ---------- Styles ------------------------------------------------------------

const BORDER_DARK = "#555"
const BORDER_LIGHT = "#888"
const HEADER_BG = "#EAEAEA"
const GROUP_BG = "#F4F4F4"

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: "Pretendard",
    fontSize: 8.5,
    color: "#1a1a1a",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 3,
  },
  meta: {
    fontSize: 8.5,
    color: "#555",
    textAlign: "right",
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 6,
    marginBottom: 2,
  },

  // Tables
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: BORDER_DARK,
    borderLeftColor: BORDER_DARK,
    borderTopStyle: "solid",
    borderLeftStyle: "solid",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
    borderBottomStyle: "solid",
  },
  rowDark: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DARK,
    borderBottomStyle: "solid",
  },
  cell: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: BORDER_LIGHT,
    borderRightStyle: "solid",
    justifyContent: "center",
  },
  cellHeader: {
    padding: 3,
    backgroundColor: HEADER_BG,
    borderRightWidth: 1,
    borderRightColor: BORDER_DARK,
    borderRightStyle: "solid",
    justifyContent: "center",
  },
  cellGroup: {
    padding: 3,
    backgroundColor: GROUP_BG,
    borderRightWidth: 1,
    borderRightColor: BORDER_LIGHT,
    borderRightStyle: "solid",
    justifyContent: "center",
  },
  textCenter: { textAlign: "center" },
  textLeft: { textAlign: "left" },
  textRight: { textAlign: "right" },
  bold: { fontWeight: 700 },
  small: { fontSize: 8, color: "#555" },
  check: { fontWeight: 700, fontSize: 11, textAlign: "center" },

  // Footer
  footerRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerCol: {
    flexDirection: "column",
  },
  footerLabel: {
    fontWeight: 700,
    fontSize: 10,
  },
  signatureImage: {
    width: 100,
    height: 40,
    marginTop: 2,
  },
  notes: {
    marginTop: 6,
    fontSize: 8.5,
    color: "#444",
  },
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
})

// ---------- Helpers -----------------------------------------------------------

function formatDate(d?: Date): string {
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

const CHECK = "✓"

// ---------- Sub-components ----------------------------------------------------

type CellProps = {
  width: string
  children?: React.ReactNode
  variant?: "header" | "group" | "default"
  align?: "left" | "center" | "right"
  isLastInRow?: boolean
  bold?: boolean
}

function Cell({
  width,
  children,
  variant = "default",
  align = "left",
  isLastInRow = false,
  bold = false,
}: CellProps): React.ReactElement {
  const base =
    variant === "header"
      ? styles.cellHeader
      : variant === "group"
        ? styles.cellGroup
        : styles.cell
  const style = [
    base,
    { width },
    isLastInRow ? { borderRightWidth: 0 } : {},
  ]
  const alignStyle =
    align === "center"
      ? styles.textCenter
      : align === "right"
        ? styles.textRight
        : styles.textLeft
  return (
    <View style={style}>
      {typeof children === "string" ? (
        <Text style={[alignStyle, bold ? styles.bold : {}]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
}

// ---------- Section: 장비정보 (4 cols) ---------------------------------------

function DeviceInfoTable({
  data,
  locale,
}: {
  data: InspectionReportData
  locale: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  const w = "25%"
  return (
    <View style={styles.table}>
      <View style={styles.rowDark}>
        <Cell width={w} variant="header" align="center" bold>
          {L.manufacturer}
        </Cell>
        <Cell width={w} variant="header" align="center" bold>
          {L.model}
        </Cell>
        <Cell width={w} variant="header" align="center" bold>
          {L.serial}
        </Cell>
        <Cell width={w} variant="header" align="center" bold isLastInRow>
          {L.manufacturedAt}
        </Cell>
      </View>
      <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: BORDER_DARK }]}>
        <Cell width={w} align="center">
          {data.device.manufacturer}
        </Cell>
        <Cell width={w} align="center">
          {data.device.model}
        </Cell>
        <Cell width={w} align="center">
          {data.device.serial}
        </Cell>
        <Cell width={w} align="center" isLastInRow>
          {formatDate(data.device.manufacturedAt)}
        </Cell>
      </View>
    </View>
  )
}

// ---------- Section: 장비유지기간 (3 cols) ----------------------------------

function MaintenanceTable({
  data,
  locale,
}: {
  data: InspectionReportData
  locale: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  const w = "33.33%"
  return (
    <View style={styles.table}>
      <View style={styles.rowDark}>
        <Cell width={w} variant="header" align="center" bold>
          {L.purchasedAt}
        </Cell>
        <Cell width={w} variant="header" align="center" bold>
          {L.expiresAt}
        </Cell>
        <Cell width={w} variant="header" align="center" bold isLastInRow>
          {L.padReplaceAt}
        </Cell>
      </View>
      <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: BORDER_DARK }]}>
        <Cell width={w} align="center">
          {formatDate(data.device.purchasedAt)}
        </Cell>
        <Cell width={w} align="center">
          {formatDate(data.device.expiresAt)}
        </Cell>
        <Cell width={w} align="center" isLastInRow>
          {formatDate(data.device.padReplaceAt)}
        </Cell>
      </View>
    </View>
  )
}

// ---------- Section: 설치위치 ------------------------------------------------

function LocationTable({
  data,
  locale,
}: {
  data: InspectionReportData
  locale: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  return (
    <View style={styles.table}>
      <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: BORDER_DARK }]}>
        <Cell width="20%" variant="header" align="center" bold>
          {L.location}
        </Cell>
        <Cell width="80%" align="left" isLastInRow>
          {data.device.location}
        </Cell>
      </View>
    </View>
  )
}

// ---------- Section: Main inspection table ----------------------------------

const COL_NO = "8%"
const COL_ITEM = "59%"
const COL_NG = "16.5%"
const COL_OK = "16.5%"

function CheckCell({
  marked,
  isLastInRow = false,
}: {
  marked: boolean
  isLastInRow?: boolean
}): React.ReactElement {
  return (
    <Cell width={isLastInRow ? COL_OK : COL_NG} align="center" isLastInRow={isLastInRow}>
      <Text style={styles.check}>{marked ? CHECK : ""}</Text>
    </Cell>
  )
}

function MainTable({
  data,
  locale,
}: {
  data: InspectionReportData
  locale: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  const items = data.items as Record<string, "OK" | "NG">

  const rows: React.ReactElement[] = []

  // Header (two rows): merged 점검결과 over 이상있음 / 이상없음
  rows.push(
    <View key="hdr1" style={styles.rowDark}>
      <Cell width={COL_NO} variant="header" align="center" bold>
        {L.no}
      </Cell>
      <Cell width={COL_ITEM} variant="header" align="center" bold>
        {L.item}
      </Cell>
      <View style={[styles.cellHeader, { width: "33%", borderRightWidth: 0 }]}>
        <Text style={[styles.textCenter, styles.bold]}>{L.result}</Text>
        <View
          style={{
            flexDirection: "row",
            marginTop: 4,
            paddingTop: 3,
            borderTopWidth: 1,
            borderTopColor: BORDER_DARK,
            borderTopStyle: "solid",
          }}
        >
          <Text style={[styles.textCenter, styles.bold, { width: "50%" }]}>
            {L.abnormal}
          </Text>
          <Text style={[styles.textCenter, styles.bold, { width: "50%" }]}>
            {L.normal}
          </Text>
        </View>
      </View>
    </View>,
  )

  // Group 1~4 derived from INSPECTION_ITEMS
  for (const groupNo of [1, 2, 3, 4] as const) {
    const groupItems = INSPECTION_ITEMS.filter((i) => i.group === groupNo)
    if (groupItems.length === 0) continue

    rows.push(
      <View key={`g${groupNo}`} style={styles.row}>
        <Cell width={COL_NO} variant="group" align="center" bold>
          {String(groupNo)}
        </Cell>
        <Cell width="92%" variant="group" align="left" bold isLastInRow>
          {L.groupNames[groupNo]}
        </Cell>
      </View>,
    )

    for (const it of groupItems) {
      const baseLabel = locale === "ko" ? it.labelKo : it.labelEn
      const display = it.sub ? `${it.sub} ${baseLabel}` : baseLabel
      const result = items[it.code]

      rows.push(
        <View key={it.code} style={styles.row}>
          <Cell width={COL_NO} align="center">
            {""}
          </Cell>
          <Cell width={COL_ITEM} align="left">
            {display}
          </Cell>
          <CheckCell marked={result === "NG"} />
          <CheckCell marked={result === "OK"} isLastInRow />
        </View>,
      )

      if (it.code === "OP_PAD") {
        rows.push(
          <View key={`${it.code}-ann`} style={styles.row}>
            <Cell width={COL_NO} align="center">
              {""}
            </Cell>
            <Cell width="92%" align="left" isLastInRow>
              <Text style={styles.small}>
                ⦁ {L.padReplaceAt} : {formatDate(data.device.padReplaceAt)}
              </Text>
            </Cell>
          </View>,
        )
      } else if (it.code === "OP_BATTERY") {
        rows.push(
          <View key={`${it.code}-ann`} style={styles.row}>
            <Cell width={COL_NO} align="center">
              {""}
            </Cell>
            <Cell width="92%" align="left" isLastInRow>
              <Text style={styles.small}>
                ⦁ {L.batteryReplaceAt} : {formatDate(data.device.batteryReplaceAt)}
              </Text>
            </Cell>
          </View>,
        )
      }
    }
  }

  // Group 5: 관리자 변경사항
  const managerHasChange = data.manager?.hasChange ?? false
  const managerName = data.manager?.name ?? ""
  const managerPhone = data.manager?.phone ?? ""

  rows.push(
    <View key="g5-hdr" style={styles.row}>
      <Cell width={COL_NO} variant="group" align="center" bold>
        5
      </Cell>
      <Cell width={COL_ITEM} variant="group" align="left" bold>
        {L.managerChange}
      </Cell>
      <Cell width={COL_NG} variant="group" align="center" bold>
        {L.hasChange}
      </Cell>
      <Cell width={COL_OK} variant="group" align="center" bold isLastInRow>
        {L.noChange}
      </Cell>
    </View>,
  )
  rows.push(
    <View key="g5-row" style={styles.row}>
      <Cell width={COL_NO} align="center">
        {""}
      </Cell>
      <Cell width={COL_ITEM} align="left">
        {`① ${L.managerName} : ${managerName || "    "}    ${L.managerPhone} : ${managerPhone || "    "}`}
      </Cell>
      <CheckCell marked={managerHasChange} />
      <CheckCell marked={!managerHasChange} isLastInRow />
    </View>,
  )

  // Group 6: 24시간 이용 가능 / 24시간 사용 불가
  const available24h = data.device.available24h ?? items["TIME_24"] === "OK"
  rows.push(
    <View key="g6" style={styles.row}>
      <Cell width={COL_NO} variant="group" align="center" bold>
        6
      </Cell>
      <Cell width="92%" variant="group" align="left" bold isLastInRow>
        {L.operatingHours}
      </Cell>
    </View>,
  )
  rows.push(
    <View key="g6-1" style={styles.row}>
      <Cell width={COL_NO} align="center">
        {""}
      </Cell>
      <Cell width={COL_ITEM} align="left">
        {`① ${L.available24h}`}
      </Cell>
      <CheckCell marked={available24h} />
      <Cell width={COL_OK} align="center" isLastInRow>
        {""}
      </Cell>
    </View>,
  )
  rows.push(
    <View
      key="g6-2"
      style={[styles.row, { borderBottomWidth: 1, borderBottomColor: BORDER_DARK }]}
    >
      <Cell width={COL_NO} align="center">
        {""}
      </Cell>
      <Cell width={COL_ITEM} align="left">
        {`② ${L.notAvailable24h}`}
      </Cell>
      <CheckCell marked={!available24h} />
      <Cell width={COL_OK} align="center" isLastInRow>
        {""}
      </Cell>
    </View>,
  )

  return <View style={styles.table}>{rows}</View>
}

// ---------- Footer (date + signature) ---------------------------------------

function FooterBlock({
  data,
  locale,
}: {
  data: InspectionReportData
  locale: ReportLocale
}): React.ReactElement {
  const L = getLabels(locale)
  const dateText =
    locale === "ko"
      ? `${L.inspectionDate} : ${formatDateKorean(data.inspectedAt)}`
      : `${L.inspectionDate} : ${formatDate(data.inspectedAt)}`

  return (
    <View style={styles.footerRow}>
      <View style={styles.footerCol}>
        <Text style={styles.footerLabel}>{dateText}</Text>
      </View>
      <View style={[styles.footerCol, { alignItems: "flex-end" }]}>
        <Text style={styles.footerLabel}>
          {L.inspector} : {data.inspector.name}    {L.signature}
        </Text>
        {data.signatureDataUrl ? (
          <Image src={data.signatureDataUrl} style={styles.signatureImage} />
        ) : null}
      </View>
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
  const notesText = data.notes && data.notes.trim().length > 0 ? data.notes : L.notesNone

  return (
    <Document title={L.title} author="saas-aed">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{L.title}</Text>
        <Text style={styles.meta}>
          {L.organization} : {data.organization.name}    {L.subtitleYearMonth} :{" "}
          {data.yearMonth}
        </Text>

        <Text style={styles.sectionHeading}>{L.deviceInfo}</Text>
        <DeviceInfoTable data={data} locale={locale} />

        <Text style={styles.sectionHeading}>{L.maintenance}</Text>
        <MaintenanceTable data={data} locale={locale} />

        <View style={{ marginTop: 6 }}>
          <LocationTable data={data} locale={locale} />
        </View>

        <View style={{ marginTop: 8 }}>
          <MainTable data={data} locale={locale} />
        </View>

        <Text style={styles.notes}>
          ※ {L.notesLabel} : {notesText}
        </Text>

        <FooterBlock data={data} locale={locale} />

        <Text
          style={styles.pageFooter}
          render={({ pageNumber, totalPages }) => L.footerPage(pageNumber, totalPages)}
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
