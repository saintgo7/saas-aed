"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { scopeForUser } from "@/lib/tenant/scope-for-user"
import { db, schema } from "@/lib/db"

// ─────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────
const submitSchema = z.object({
  inspectionId: z.string().uuid("올바르지 않은 점검 식별자입니다.")
})

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
async function requireSession() {
  const session = await auth()
  if (!session?.user) throw new Error("로그인이 필요합니다.")
  return session
}

const TENANT_WIDE_ROLES: ReadonlyArray<string> = [
  "SUPER_ADMIN",
  "HQ_ADMIN",
  "SYSTEM_ADMIN",
  "ADMIN"
]

const DEPT_ROLES: ReadonlyArray<string> = ["DEPT_MANAGER", "INSPECTOR"]

// ─────────────────────────────────────────
// submitInspection
// ─────────────────────────────────────────
export async function submitInspection(
  inspectionId: string
): Promise<{ ok: true; alreadySubmitted: boolean }> {
  const session = await requireSession()

  let parsed: { inspectionId: string }
  try {
    parsed = submitSchema.parse({ inspectionId })
  } catch (error) {
    console.error("[inspections-submit] validation failed", { error })
    throw new Error("점검 식별자가 올바르지 않습니다.")
  }

  try {
    // Step 1: verify inspection is in user's scope (tenant + dept).
    const scope = scopeForUser(session.user)
    const inspectionRows = await db
      .select()
      .from(schema.inspections)
      .where(
        and(
          eq(schema.inspections.tenantId, session.user.tenantId),
          eq(schema.inspections.id, parsed.inspectionId)
        )
      )
      .limit(1)
    const inspection = inspectionRows[0]
    if (!inspection) {
      throw new Error("해당 점검 기록을 찾을 수 없습니다.")
    }

    const deviceRows = await scope.devices().findById(inspection.deviceId)
    if (deviceRows.length === 0) {
      // Either device missing or out-of-scope for this user.
      throw new Error("해당 점검 기록에 접근할 수 없습니다.")
    }
    const device = deviceRows[0]
    if (!device) {
      throw new Error("해당 점검 기록에 접근할 수 없습니다.")
    }

    // Step 2: role-based authorization.
    const role = session.user.role
    const isTenantWide = TENANT_WIDE_ROLES.includes(role)
    const isDeptMember =
      DEPT_ROLES.includes(role) &&
      session.user.departmentId !== null &&
      device.departmentId === session.user.departmentId
    if (!isTenantWide && !isDeptMember) {
      throw new Error("점검 송신 권한이 없습니다.")
    }

    // Step 3: idempotency — already submitted?
    if (inspection.submittedAt) {
      return { ok: true, alreadySubmitted: true }
    }

    // Step 4: pre-conditions — signature + at least one report.
    const hasSignature = Boolean(inspection.signatureSha256)
    const hasReport = Boolean(inspection.pdfUrl) || Boolean(inspection.docxUrl)
    if (!hasSignature || !hasReport) {
      throw new Error("서명과 리포트 생성을 먼저 완료하세요")
    }

    // Step 5: mark submitted.
    await db
      .update(schema.inspections)
      .set({ submittedAt: new Date() })
      .where(
        and(
          eq(schema.inspections.tenantId, session.user.tenantId),
          eq(schema.inspections.id, parsed.inspectionId)
        )
      )

    revalidatePath("/dashboard")
    revalidatePath("/hq")
    revalidatePath(`/inspections/${parsed.inspectionId}`)
    return { ok: true, alreadySubmitted: false }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith("해당 점검") ||
        error.message.startsWith("점검 송신") ||
        error.message.startsWith("서명과 리포트") ||
        error.message.startsWith("점검 식별자") ||
        error.message.startsWith("로그인"))
    ) {
      throw error
    }
    console.error("[inspections-submit] submitInspection failed", {
      inspectionId,
      error
    })
    throw new Error("점검 송신 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.")
  }
}
