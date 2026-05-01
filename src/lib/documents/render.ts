// Render & upload AED inspection reports.
//
// Generates DOCX + PDF (per requested locale) and uploads each artifact to R2
// via the storage adapter (src/lib/storage). Returns signed URLs and storage
// keys for downstream persistence.

import { generateDocx } from "./docx"
import { generatePdf } from "./pdf"
import { storage } from "@/lib/storage"
import {
  inspectionReportDataSchema,
  type InspectionReportData,
  type ReportLocale,
} from "./types"

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const PDF_CONTENT_TYPE = "application/pdf"
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

export type RenderUploadContext = {
  tenantId: string
  inspectionId: string
}

export type RenderUploadOptions = {
  locales?: ReportLocale[] // default: ["ko"]
  signedUrlTtlSec?: number
}

export type RenderedReportSet = {
  docxUrl: string
  pdfUrl: string
  docxKey: string
  pdfKey: string
  byLocale: Record<ReportLocale, {
    docxUrl: string
    pdfUrl: string
    docxKey: string
    pdfKey: string
  }>
}

function reportKey(
  ctx: RenderUploadContext,
  locale: ReportLocale,
  ext: "docx" | "pdf",
): string {
  const filename = locale === "ko" ? `report.${ext}` : `report-${locale}.${ext}`
  return `tenants/${ctx.tenantId}/inspections/${ctx.inspectionId}/${filename}`
}

export async function renderAndUploadReport(
  data: InspectionReportData,
  ctx: RenderUploadContext,
  options: RenderUploadOptions = {},
): Promise<RenderedReportSet> {
  const parsed = inspectionReportDataSchema.parse(data)

  if (!ctx.tenantId || !ctx.inspectionId) {
    throw new Error("renderAndUploadReport: tenantId and inspectionId are required")
  }

  const locales = options.locales && options.locales.length > 0 ? options.locales : (["ko"] as ReportLocale[])
  const ttl = options.signedUrlTtlSec ?? SIGNED_URL_TTL_SEC

  const byLocaleEntries = await Promise.all(
    locales.map(async (locale) => {
      const [docxBuf, pdfBuf] = await Promise.all([
        generateDocx(parsed, locale),
        generatePdf(parsed, locale),
      ])

      const docxKey = reportKey(ctx, locale, "docx")
      const pdfKey = reportKey(ctx, locale, "pdf")

      try {
        await Promise.all([
          storage.upload(docxKey, docxBuf, { contentType: DOCX_CONTENT_TYPE }),
          storage.upload(pdfKey, pdfBuf, { contentType: PDF_CONTENT_TYPE }),
        ])
      } catch (error) {
        console.error(`Failed to upload report (${locale}):`, error)
        throw new Error(`Failed to upload inspection report (${locale})`)
      }

      const [docxUrl, pdfUrl] = await Promise.all([
        storage.getSignedUrl(docxKey, ttl),
        storage.getSignedUrl(pdfKey, ttl),
      ])

      return [locale, { docxUrl, pdfUrl, docxKey, pdfKey }] as const
    }),
  )

  const byLocale = byLocaleEntries.reduce(
    (acc, [locale, value]) => ({ ...acc, [locale]: value }),
    {} as RenderedReportSet["byLocale"],
  )

  const primaryLocale = locales[0]
  if (!primaryLocale) {
    throw new Error("renderAndUploadReport: no locales rendered")
  }
  const primary = byLocale[primaryLocale]
  if (!primary) {
    throw new Error("renderAndUploadReport: primary locale result missing")
  }

  return {
    docxUrl: primary.docxUrl,
    pdfUrl: primary.pdfUrl,
    docxKey: primary.docxKey,
    pdfKey: primary.pdfKey,
    byLocale,
  }
}
