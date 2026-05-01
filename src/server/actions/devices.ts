"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { db, schema } from "@/lib/db"

const deviceCreateSchema = z.object({
  manufacturer: z.string().min(1, "제조사를 입력해 주세요."),
  model: z.string().min(1, "모델명을 입력해 주세요."),
  serial: z.string().min(1, "시리얼 번호를 입력해 주세요."),
  manufacturedAt: z.coerce.date(),
  purchasedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  padReplaceAt: z.coerce.date(),
  batteryReplaceAt: z.coerce.date(),
  location: z.string().min(1, "설치 장소를 입력해 주세요."),
  locationDetail: z.string().nullable().optional(),
  available24h: z.boolean().default(true)
})

const deviceUpdateSchema = deviceCreateSchema.partial()

export type DeviceCreateInput = z.infer<typeof deviceCreateSchema>
export type DeviceUpdateInput = z.infer<typeof deviceUpdateSchema>

async function requireAdminSession() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("로그인이 필요합니다.")
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("이 작업을 수행할 권한이 없습니다. 관리자에게 문의해 주세요.")
  }
  return session
}

/**
 * Creates a new device. ADMIN-only.
 */
export async function createDevice(input: DeviceCreateInput): Promise<{ id: string }> {
  const session = await requireAdminSession()

  let parsed: DeviceCreateInput
  try {
    parsed = deviceCreateSchema.parse(input)
  } catch (error) {
    console.error("[devices] createDevice validation failed", { error })
    throw new Error("입력값을 다시 확인해 주세요.")
  }

  try {
    const [row] = await withTenant(session.user.tenantId).devices().create({
      ...parsed,
      tenantId: session.user.tenantId,
      locationDetail: parsed.locationDetail ?? null
    })
    revalidatePath("/devices")
    revalidatePath("/dashboard")
    return { id: row.id }
  } catch (error) {
    console.error("[devices] createDevice failed", { error })
    throw new Error("장비 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.")
  }
}

/**
 * Updates an existing device. ADMIN-only. Tenant-scoped.
 */
export async function updateDevice(
  id: string,
  input: DeviceUpdateInput
): Promise<{ id: string }> {
  const session = await requireAdminSession()

  if (!id) throw new Error("장비 식별자가 누락되었습니다.")

  let parsed: DeviceUpdateInput
  try {
    parsed = deviceUpdateSchema.parse(input)
  } catch (error) {
    console.error("[devices] updateDevice validation failed", { error })
    throw new Error("입력값을 다시 확인해 주세요.")
  }

  try {
    const result = await db
      .update(schema.devices)
      .set(parsed)
      .where(
        and(
          eq(schema.devices.tenantId, session.user.tenantId),
          eq(schema.devices.id, id)
        )
      )
      .returning({ id: schema.devices.id })
    if (result.length === 0) {
      throw new Error("해당 장비를 찾을 수 없습니다.")
    }
    revalidatePath("/devices")
    revalidatePath(`/devices/${id}`)
    return { id: result[0].id }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("해당 장비")) throw error
    console.error("[devices] updateDevice failed", { id, error })
    throw new Error("장비 정보 수정에 실패했습니다.")
  }
}

/**
 * Hard-deletes a device. ADMIN-only. Cascades to inspections via FK.
 */
export async function deleteDevice(id: string): Promise<{ ok: true }> {
  const session = await requireAdminSession()
  if (!id) throw new Error("장비 식별자가 누락되었습니다.")

  try {
    const result = await db
      .delete(schema.devices)
      .where(
        and(
          eq(schema.devices.tenantId, session.user.tenantId),
          eq(schema.devices.id, id)
        )
      )
      .returning({ id: schema.devices.id })
    if (result.length === 0) {
      throw new Error("해당 장비를 찾을 수 없습니다.")
    }
    revalidatePath("/devices")
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("해당 장비")) throw error
    console.error("[devices] deleteDevice failed", { id, error })
    throw new Error("장비 삭제에 실패했습니다.")
  }
}
