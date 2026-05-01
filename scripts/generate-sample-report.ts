// Generate a real sample inspection report using the actual document pipeline.
// Reads the first seeded device + inserts a sample inspection record, then
// calls generateDocx() / generatePdf() directly (no R2 upload) and writes the
// artifacts under docs/book/assets/sample-report/.

import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { eq } from "drizzle-orm"
import { db, schema } from "../src/lib/db"
import { generateDocx } from "../src/lib/documents/docx"
import { generatePdf } from "../src/lib/documents/pdf"
import type { InspectionReportData } from "../src/lib/documents/types"

async function main() {
  const orgs = await db.select().from(schema.organizations).limit(1)
  const org = orgs[0]
  if (!org) throw new Error("no organization seeded; run pnpm seed:dev first")

  const devices = await db.select().from(schema.devices).where(eq(schema.devices.tenantId, org.id)).limit(1)
  const device = devices[0]
  if (!device) throw new Error("no device seeded")

  const inspectors = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, org.id))
    .limit(10)
  const inspector = inspectors.find((u) => u.role === "INSPECTOR")
  if (!inspector) throw new Error("no inspector seeded")

  const data: InspectionReportData = {
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
    yearMonth: "2026-05",
    items: {
      OP_POWER: "OK",
      OP_PAD: "OK",
      OP_BATTERY: "OK",
      BX_ALARM: "OK",
      BX_GUIDE: "OK",
      BX_EMG: "OK",
      BX_CPR: "OK",
      BX_EXP: "NG",
      LOC_ENT: "OK",
      LOC_DIR: "OK",
      DOC_FILE: "OK",
      TIME_24: "OK"
    },
    notes: "본체 외관 상단 측면 미세 흠집 확인 — 작동에는 영향 없으나 모니터링 필요.",
    inspectedAt: new Date()
  }

  const outDir = join(process.cwd(), "docs/book/assets/sample-report")
  await mkdir(outDir, { recursive: true })

  console.log("[sample-report] generating DOCX (ko)...")
  const docxKo = await generateDocx(data, "ko")
  await writeFile(join(outDir, "sample-report-ko.docx"), docxKo)

  console.log("[sample-report] generating DOCX (en)...")
  const docxEn = await generateDocx(data, "en")
  await writeFile(join(outDir, "sample-report-en.docx"), docxEn)

  let pdfKoOk = true
  try {
    console.log("[sample-report] generating PDF (ko)...")
    const pdfKo = await generatePdf(data, "ko")
    await writeFile(join(outDir, "sample-report-ko.pdf"), pdfKo)
  } catch (err) {
    pdfKoOk = false
    console.warn("[sample-report] PDF (ko) skipped:", (err as Error).message)
  }

  let pdfEnOk = true
  try {
    console.log("[sample-report] generating PDF (en)...")
    const pdfEn = await generatePdf(data, "en")
    await writeFile(join(outDir, "sample-report-en.pdf"), pdfEn)
  } catch (err) {
    pdfEnOk = false
    console.warn("[sample-report] PDF (en) skipped:", (err as Error).message)
  }

  console.log("\n✓ sample-report-ko.docx (" + docxKo.byteLength + " bytes)")
  console.log("✓ sample-report-en.docx (" + docxEn.byteLength + " bytes)")
  if (pdfKoOk) console.log("✓ sample-report-ko.pdf")
  if (pdfEnOk) console.log("✓ sample-report-en.pdf")
  console.log("\nLocation:", outDir)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
