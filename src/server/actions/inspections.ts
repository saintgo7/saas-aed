"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { db, schema } from "@/lib/db"
import { inspectionItemsSchema } from "@/lib/inspection/items"
import { uploadSignature } from "@/lib/signature/upload"
import { renderAndUploadReport } from "@/lib/documents/render"
import { email } from "@/lib/email"
import InspectionCompleteEmail from "@/lib/email/templates/inspection-complete"

// ─────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────
const createInspectionSchema = z.object({
  deviceId: z.string().uuid("올바르지 않은 장비 식별자입니다."),
  items: inspectionItemsSchema,
  notes: z.string().max(2000).nullable().optional()
})

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>

const signatureDataUrlSchema = z
  .string()
  .regex(
    /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/,
    "올바르지 않은 서명 이미지 형식입니다."
  )

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function currentYearMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

async function requireSession() {
  const session = await auth()
  if (!session?.user) throw new Error("로그인이 필요합니다.")
  return session
}

// ─────────────────────────────────────────
// createInspection
// ─────────────────────────────────────────
export async function createInspection(
  input: CreateInspectionInput
): Promise<{ id: string }> {
  const session = await requireSession()

  let parsed: CreateInspectionInput
  try {
    parsed = createInspectionSchema.parse(input)
  } catch (error) {
    console.error("[inspections] createInspection validation failed", { error })
    throw new Error("점검 항목 입력값을 확인해 주세요.")
  }

  try {
    const scope = withTenant(session.user.tenantId)
    const deviceRows = await scope.devices().findById(parsed.deviceId)
    if (deviceRows.length === 0) {
      throw new Error("해당 장비를 찾을 수 없습니다.")
    }

    const [row] = await scope.inspections().create({
      tenantId: session.user.tenantId,
      deviceId: parsed.deviceId,
      inspectorId: session.user.id,
      yearMonth: currentYearMonth(),
      items: parsed.items,
      notes: parsed.notes ?? null
    })

    revalidatePath("/dashboard")
    revalidatePath("/history")
    revalidatePath(`/devices/${parsed.deviceId}`)

    return { id: row.id }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("해당 장비")) throw error
    console.error("[inspections] createInspection failed", { error })
    throw new Error("점검 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.")
  }
}

// ─────────────────────────────────────────
// attachSignature
// ─────────────────────────────────────────
export async function attachSignature(
  id: string,
  dataUrl: string
): Promise<{ ok: true }> {
  const session = await requireSession()
  if (!id) throw new Error("점검 식별자가 누락되었습니다.")

  let validatedDataUrl: string
  try {
    validatedDataUrl = signatureDataUrlSchema.parse(dataUrl)
  } catch (error) {
    console.error("[inspections] attachSignature validation failed", { error })
    throw new Error("서명 이미지 형식이 올바르지 않습니다.")
  }

  try {
    const inspectionRows = await withTenant(session.user.tenantId)
      .inspections()
      .findById(id)
    if (inspectionRows.length === 0) {
      throw new Error("해당 점검 기록을 찾을 수 없습니다.")
    }

    const { url, sha256 } = await uploadSignature({
      tenantId: session.user.tenantId,
      inspectionId: id,
      dataUrl: validatedDataUrl
    })

    await db
      .update(schema.inspections)
      .set({ signatureUrl: url, signatureSha256: sha256 })
      .where(
        and(
          eq(schema.inspections.tenantId, session.user.tenantId),
          eq(schema.inspections.id, id)
        )
      )

    revalidatePath(`/inspections/${id}/sign`)
    revalidatePath(`/inspections/${id}/send`)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("해당 점검")) throw error
    console.error("[inspections] attachSignature failed", { id, error })
    throw new Error("서명 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.")
  }
}

// ─────────────────────────────────────────
// sendInspection
// ─────────────────────────────────────────
export async function sendInspection(id: string): Promise<{ ok: true }> {
  const session = await requireSession()
  if (!id) throw new Error("점검 식별자가 누락되었습니다.")

  try {
    const inspectionRows = await withTenant(session.user.tenantId)
      .inspections()
      .findById(id)
    if (inspectionRows.length === 0) {
      throw new Error("해당 점검 기록을 찾을 수 없습니다.")
    }
    const inspection = inspectionRows[0]

    const [device] = await withTenant(session.user.tenantId)
      .devices()
      .findById(inspection.deviceId)
    if (!device) throw new Error("해당 장비를 찾을 수 없습니다.")

    const [org] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, session.user.tenantId))
      .limit(1)
    if (!org) throw new Error("소속 조직 정보를 찾을 수 없습니다.")

    const [inspector] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, inspection.inspectorId))
      .limit(1)
    if (!inspector) throw new Error("점검자 정보를 찾을 수 없습니다.")

    // Render and upload DOCX/PDF (other agent provides this implementation).
    const rendered = await renderAndUploadReport({
      inspectionId: id,
      tenantId: session.user.tenantId,
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
      signatureDataUrl: undefined,
      inspectedAt: inspection.createdAt
    })

    await db
      .update(schema.inspections)
      .set({ docxUrl: rendered.docxUrl, pdfUrl: rendered.pdfUrl })
      .where(
        and(
          eq(schema.inspections.tenantId, session.user.tenantId),
          eq(schema.inspections.id, id)
        )
      )

    // Recipients: inspector + all admins of the tenant
    const adminRows = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, session.user.tenantId),
          eq(schema.users.role, "ADMIN")
        )
      )
    const recipients = Array.from(
      new Set([inspector.email, ...adminRows.map((r) => r.email)].filter(Boolean))
    )

    const subject = `[AED 점검 완료] ${device.location} (${inspection.yearMonth})`

    try {
      await email.send({
        to: recipients,
        subject,
        react: InspectionCompleteEmail({
          organizationName: org.name,
          deviceLocation: device.location,
          deviceSerial: device.serial,
          yearMonth: inspection.yearMonth,
          inspectorName: inspector.name,
          docxUrl: rendered.docxUrl,
          pdfUrl: rendered.pdfUrl
        })
      })
    } catch (mailError) {
      console.error("[inspections] sendInspection email failed", { id, mailError })
      throw new Error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    }

    await db.insert(schema.notifications).values({
      tenantId: session.user.tenantId,
      type: "INSPECTION_COMPLETE",
      recipient: recipients.join(","),
      subject,
      payload: { inspectionId: id, deviceId: device.id },
      status: "SENT",
      sentAt: new Date()
    })

    await db
      .update(schema.inspections)
      .set({ emailSentAt: new Date() })
      .where(
        and(
          eq(schema.inspections.tenantId, session.user.tenantId),
          eq(schema.inspections.id, id)
        )
      )

    revalidatePath(`/inspections/${id}/send`)
    revalidatePath("/dashboard")
    return { ok: true }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith("해당 점검") ||
        error.message.startsWith("해당 장비") ||
        error.message.startsWith("소속 조직") ||
        error.message.startsWith("점검자") ||
        error.message.startsWith("이메일 발송"))
    ) {
      throw error
    }
    console.error("[inspections] sendInspection failed", { id, error })
    throw new Error("보고서 발송 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.")
  }
}
