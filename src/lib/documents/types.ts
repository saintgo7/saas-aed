// AED inspection report data types and validation schemas.
//
// These types are shared by the DOCX/PDF generators and the storage adapter.
// All identifiers are English; user-facing strings live in i18n.ts.

import { z } from "zod"

/**
 * Inspection result for a single checklist item.
 * - "OK" : 이상없음 / no issue
 * - "NG" : 이상있음 / issue found
 */
export const inspectionResultSchema = z.enum(["OK", "NG"])
export type InspectionResult = z.infer<typeof inspectionResultSchema>

/** 12 inspection item codes — must match src/lib/inspection/items.ts */
export const INSPECTION_ITEM_CODES = [
  "OP_POWER",
  "OP_PAD",
  "OP_BATTERY",
  "BX_ALARM",
  "BX_GUIDE",
  "BX_EMG",
  "BX_CPR",
  "BX_EXP",
  "LOC_ENT",
  "LOC_DIR",
  "DOC_FILE",
  "TIME_24",
] as const
export type InspectionItemCode = (typeof INSPECTION_ITEM_CODES)[number]

export const organizationSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email(),
})

export const deviceSchema = z.object({
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  serial: z.string().min(1),
  location: z.string().min(1),
  // Optional MOHW fields — present when sourced from the devices table.
  manufacturedAt: z.date().optional(),
  purchasedAt: z.date().optional(),
  expiresAt: z.date(),
  padReplaceAt: z.date(),
  batteryReplaceAt: z.date().optional(),
  available24h: z.boolean().optional(),
})

export const inspectorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
})

/**
 * Group 5 of the MOHW form: 관리자 변경사항.
 * `hasChange` flips the 있음/없음 checkbox.
 */
export const managerSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  hasChange: z.boolean(),
})

/** "YYYY-MM" format. */
export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "yearMonth must be YYYY-MM")

export const itemsRecordSchema = z.record(z.string(), inspectionResultSchema)

export const inspectionReportDataSchema = z.object({
  organization: organizationSchema,
  device: deviceSchema,
  inspector: inspectorSchema,
  manager: managerSchema.optional(),
  yearMonth: yearMonthSchema,
  items: itemsRecordSchema,
  notes: z.string().nullable().optional(),
  signatureDataUrl: z
    .string()
    .regex(
      /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/,
      "signatureDataUrl must be a base64 data URL (png/jpeg)",
    )
    .optional(),
  inspectedAt: z.date(),
})

export type InspectionReportData = z.infer<typeof inspectionReportDataSchema>

export type ReportLocale = "ko" | "en"

export const reportLocaleSchema = z.enum(["ko", "en"])
