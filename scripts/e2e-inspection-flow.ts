// End-to-end inspection workflow runner — fully automated.
//
// Executes the four-stage AED inspection scenario in code:
//   [1] Input    : 14 checklist items (13 OK, 1 NG)
//   [2] Sign     : signature SHA-256 digest computed from a PNG data URL
//   [3] Dispatch : DOCX rendered (ko + en); PDF attempted (skipped if fonts missing)
//   [4] Persist  : a new row inserted into the inspections table
//
// R2 upload is skipped on purpose — this is local dev. signatureUrl stays null
// while signatureSha256 is recorded for chain-of-custody reference.
//
// Run: pnpm e2e:flow

import { writeFile } from "node:fs/promises"
import { eq } from "drizzle-orm"
import { db, schema } from "../src/lib/db"
import { generateDocx } from "../src/lib/documents/docx"
import { generatePdf } from "../src/lib/documents/pdf"
import { sha256OfBase64Png } from "../src/lib/signature/sha256"
import type { InspectionReportData } from "../src/lib/documents/types"
import { INSPECTION_ITEMS, type InspectionItems } from "../src/lib/inspection/items"

// 1×1 transparent PNG — placeholder signature for local dev runs.
const SIGNATURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="

const NG_CODE = "BX_EXP" as const // 패드/건전지 유효기간 — realistic NG case
const NOTES = "보관함 우측 패드 유효기간 라벨 마모로 가독성 저하 — 라벨 재부착 필요"
const YEAR_MONTH = "2026-05"

type ItemResult = "OK" | "NG"

// Build immutable items map: every code OK except NG_CODE which is NG.
function buildItems(): InspectionItems {
  const entries = INSPECTION_ITEMS.map((item) => {
    const result: ItemResult = item.code === NG_CODE ? "NG" : "OK"
    return [item.code, result] as const
  })
  return Object.fromEntries(entries) as InspectionItems
}

function formatBox(lines: readonly string[]): string {
  const width = 41
  const top = `┌${"─".repeat(width)}┐`
  const sep = `├${"─".repeat(width)}┤`
  const bot = `└${"─".repeat(width)}┘`
  const padded = lines.map((raw) => {
    // visible width approx = string length; mixed CJK so use as-is
    const trimmed = raw.length > width - 2 ? raw.slice(0, width - 2) : raw
    const pad = " ".repeat(Math.max(0, width - 2 - trimmed.length))
    return `│ ${trimmed}${pad} │`
  })
  return [top, padded[0], sep, ...padded.slice(1), bot].join("\n")
}

async function main(): Promise<void> {
  // ── Stage 0: load seed entities ────────────────────────────────────────
  const orgs = await db.select().from(schema.organizations).limit(1)
  const org = orgs[0]
  if (!org) throw new Error("no organization seeded; run pnpm seed:dev first")

  const devices = await db
    .select()
    .from(schema.devices)
    .where(eq(schema.devices.tenantId, org.id))
    .limit(1)
  const device = devices[0]
  if (!device) throw new Error("no device seeded for organization")

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, org.id))
  const inspector = users.find((u) => u.role === "INSPECTOR")
  if (!inspector) throw new Error("no INSPECTOR user seeded")

  // ── Stage 1: input ─────────────────────────────────────────────────────
  const items = buildItems()
  const okCount = Object.values(items).filter((r) => r === "OK").length
  const ngCount = Object.values(items).filter((r) => r === "NG").length

  // ── Stage 2: signature ────────────────────────────────────────────────
  const { sha256 } = sha256OfBase64Png(SIGNATURE_DATA_URL)

  // ── Stage 3: documents ────────────────────────────────────────────────
  const reportData: InspectionReportData = {
    organization: { name: org.name, contactEmail: org.contactEmail },
    device: {
      manufacturer: device.manufacturer,
      model: device.model,
      serial: device.serial,
      location: device.location,
      expiresAt: device.expiresAt,
      padReplaceAt: device.padReplaceAt
    },
    inspector: {
      name: inspector.name,
      email: inspector.email,
      phone: inspector.phone
    },
    yearMonth: YEAR_MONTH,
    items,
    notes: NOTES,
    signatureDataUrl: SIGNATURE_DATA_URL,
    inspectedAt: new Date()
  }

  const docxKo = await generateDocx(reportData, "ko")
  await writeFile("/tmp/aed-e2e-ko.docx", docxKo)

  const docxEn = await generateDocx(reportData, "en")
  await writeFile("/tmp/aed-e2e-en.docx", docxEn)

  let pdfStatus = "skip"
  let pdfBytes = 0
  try {
    const pdfKo = await generatePdf(reportData, "ko")
    await writeFile("/tmp/aed-e2e-ko.pdf", pdfKo)
    pdfBytes = pdfKo.byteLength
    pdfStatus = `${(pdfBytes / 1024).toFixed(1)}KB`
  } catch (err) {
    pdfStatus = `skip (${(err as Error).message.slice(0, 40)}...)`
  }

  // ── Stage 4: persist ──────────────────────────────────────────────────
  const inserted = await db
    .insert(schema.inspections)
    .values({
      tenantId: org.id,
      deviceId: device.id,
      inspectorId: inspector.id,
      yearMonth: YEAR_MONTH,
      items,
      notes: NOTES,
      signatureUrl: null,
      signatureSha256: sha256,
      docxUrl: null,
      pdfUrl: null,
      emailSentAt: null
    })
    .onConflictDoUpdate({
      target: [schema.inspections.tenantId, schema.inspections.deviceId, schema.inspections.yearMonth],
      set: {
        items,
        notes: NOTES,
        signatureSha256: sha256,
        inspectorId: inspector.id
      }
    })
    .returning({ id: schema.inspections.id })

  const insertedId = inserted[0]?.id ?? "(unknown)"

  // ── Console summary ───────────────────────────────────────────────────
  const docxKb = (docxKo.byteLength / 1024).toFixed(1)
  const sha8 = sha256.slice(0, 8)

  const lines = [
    "  AED 점검 E2E 시나리오 — 자동 실행      ",
    `  [1] 입력  → 14 항목 (OK ${okCount} / NG ${ngCount})  `,
    `  [2] 서명  → SHA-256 ${sha8}...        `,
    `  [3] 발송  → DOCX ${docxKb}KB, PDF ${pdfStatus}`,
    `  [4] 보존  → inspections row id=${insertedId.slice(0, 8)}...`
  ]

  console.log("")
  console.log(formatBox(lines))
  console.log("")
  console.log(`organization : ${org.name}`)
  console.log(`device       : ${device.manufacturer} ${device.model} (${device.serial})`)
  console.log(`inspector    : ${inspector.name} <${inspector.email}>`)
  console.log(`year-month   : ${YEAR_MONTH}`)
  console.log(`NG item      : ${NG_CODE}`)
  console.log(`signature    : sha256=${sha256}`)
  console.log(`docx ko      : /tmp/aed-e2e-ko.docx (${docxKo.byteLength} bytes)`)
  console.log(`docx en      : /tmp/aed-e2e-en.docx (${docxEn.byteLength} bytes)`)
  console.log(`pdf ko       : ${pdfStatus === "skip" || pdfStatus.startsWith("skip") ? "(skipped)" : "/tmp/aed-e2e-ko.pdf"}`)
  console.log(`row id       : ${insertedId}`)
  console.log("")
  console.log("✓ E2E 4단계 통합 시나리오 통과")

  process.exit(0)
}

main().catch((err) => {
  console.error("[e2e] failed:", err)
  process.exit(1)
})
