// Ensures the DOCX/PDF artifacts exist for an inspection.
// Used by the /api/inspections/:id/report route to lazy-generate on first
// download (so users can fetch reports even if they skipped the "send" step).

import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { withTenant } from "@/lib/tenant/with-tenant"
import { renderAndUploadReport } from "@/lib/documents/render"

export interface EnsureReportResult {
  readonly docxUrl: string
  readonly pdfUrl: string
  readonly generated: boolean
}

export async function ensureReportGenerated(
  inspectionId: string,
  tenantId: string
): Promise<EnsureReportResult> {
  const [inspection] = await withTenant(tenantId).inspections().findById(inspectionId)
  if (!inspection) throw new Error("INSPECTION_NOT_FOUND")

  if (inspection.docxUrl && inspection.pdfUrl) {
    return { docxUrl: inspection.docxUrl, pdfUrl: inspection.pdfUrl, generated: false }
  }

  const [device] = await withTenant(tenantId).devices().findById(inspection.deviceId)
  if (!device) throw new Error("DEVICE_NOT_FOUND")

  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, tenantId))
    .limit(1)
  if (!org) throw new Error("ORG_NOT_FOUND")

  const [inspector] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, inspection.inspectorId))
    .limit(1)
  if (!inspector) throw new Error("INSPECTOR_NOT_FOUND")

  const rendered = await renderAndUploadReport(
    {
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
        phone: inspector.phone ?? null
      },
      yearMonth: inspection.yearMonth,
      items: inspection.items as Record<string, "OK" | "NG">,
      notes: inspection.notes,
      inspectedAt: inspection.createdAt
    },
    { inspectionId, tenantId }
  )

  await db
    .update(schema.inspections)
    .set({ docxUrl: rendered.docxUrl, pdfUrl: rendered.pdfUrl })
    .where(
      and(
        eq(schema.inspections.tenantId, tenantId),
        eq(schema.inspections.id, inspectionId)
      )
    )

  return { docxUrl: rendered.docxUrl, pdfUrl: rendered.pdfUrl, generated: true }
}
