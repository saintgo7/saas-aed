"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"

// ────────────────────────────────────────────────────────────────────────────
// createDevice
// ────────────────────────────────────────────────────────────────────────────

const DEVICE_CODE_PATTERN = /^[A-Z]+-\d{3}$/

const createDeviceSchema = z.object({
  tenantId: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
  code: z
    .string()
    .trim()
    .regex(DEVICE_CODE_PATTERN, "장비 코드 형식은 'CNU-001'과 같이 대문자-숫자 세 자리입니다.")
    .nullable(),
  manufacturer: z.string().trim().min(1, "제조사를 입력하세요.").max(120),
  model: z.string().trim().min(1, "모델명을 입력하세요.").max(120),
  serial: z.string().trim().min(1, "시리얼번호를 입력하세요.").max(120),
  manufacturedAt: z.string().min(1, "제조일을 입력하세요."),
  purchasedAt: z.string().min(1, "구입일을 입력하세요."),
  expiresAt: z.string().min(1, "유효기한을 입력하세요."),
  padReplaceAt: z.string().min(1, "패드 교체일을 입력하세요."),
  batteryReplaceAt: z.string().min(1, "배터리 교체일을 입력하세요."),
  location: z.string().trim().min(1, "위치를 입력하세요.").max(255),
  locationDetail: z.string().trim().max(255).nullable()
})

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>

/**
 * Server Action — create a new device.
 * Allowed: SUPER_ADMIN only.
 * Rejects duplicate (tenantId, serial).
 */
export async function createDevice(formData: FormData): Promise<void> {
  await requireRole(["SUPER_ADMIN"])

  const rawDeptId = formData.get("departmentId")
  const rawCode = formData.get("code")
  const rawLocationDetail = formData.get("locationDetail")

  const parsed = createDeviceSchema.parse({
    tenantId: formData.get("tenantId"),
    departmentId: rawDeptId === null || rawDeptId === "" ? null : rawDeptId,
    code: rawCode === null || rawCode === "" ? null : rawCode,
    manufacturer: formData.get("manufacturer"),
    model: formData.get("model"),
    serial: formData.get("serial"),
    manufacturedAt: formData.get("manufacturedAt"),
    purchasedAt: formData.get("purchasedAt"),
    expiresAt: formData.get("expiresAt"),
    padReplaceAt: formData.get("padReplaceAt"),
    batteryReplaceAt: formData.get("batteryReplaceAt"),
    location: formData.get("location"),
    locationDetail: rawLocationDetail === null || rawLocationDetail === "" ? null : rawLocationDetail
  })

  // Reject duplicate (tenantId, serial).
  const existing = await db
    .select({ id: schema.devices.id })
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.tenantId, parsed.tenantId),
        eq(schema.devices.serial, parsed.serial)
      )
    )
    .limit(1)
  if (existing[0]) {
    throw new Error(`이미 등록된 시리얼번호입니다: ${parsed.serial}`)
  }

  try {
    await db.insert(schema.devices).values({
      tenantId: parsed.tenantId,
      departmentId: parsed.departmentId,
      code: parsed.code,
      manufacturer: parsed.manufacturer,
      model: parsed.model,
      serial: parsed.serial,
      manufacturedAt: new Date(parsed.manufacturedAt),
      purchasedAt: new Date(parsed.purchasedAt),
      expiresAt: new Date(parsed.expiresAt),
      padReplaceAt: new Date(parsed.padReplaceAt),
      batteryReplaceAt: new Date(parsed.batteryReplaceAt),
      location: parsed.location,
      locationDetail: parsed.locationDetail
    })
  } catch (error) {
    console.error("[admin-devices] create failed", { error })
    throw new Error("장비 등록에 실패했습니다.")
  }

  revalidatePath("/admin/devices")
}

// ────────────────────────────────────────────────────────────────────────────
// updateDevice
// ────────────────────────────────────────────────────────────────────────────

const updateDeviceSchema = z.object({
  deviceId: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
  manufacturer: z.string().trim().min(1, "제조사를 입력하세요.").max(120),
  model: z.string().trim().min(1, "모델명을 입력하세요.").max(120),
  serial: z.string().trim().min(1, "시리얼번호를 입력하세요.").max(120),
  manufacturedAt: z.string().min(1, "제조일을 입력하세요."),
  purchasedAt: z.string().min(1, "구입일을 입력하세요."),
  expiresAt: z.string().min(1, "유효기한을 입력하세요."),
  padReplaceAt: z.string().min(1, "패드 교체일을 입력하세요."),
  batteryReplaceAt: z.string().min(1, "배터리 교체일을 입력하세요."),
  location: z.string().trim().min(1, "위치를 입력하세요.").max(255),
  locationDetail: z.string().trim().max(255).nullable()
})

export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>

/**
 * Server Action — update device (code is immutable).
 * Allowed: SUPER_ADMIN only.
 */
export async function updateDevice(formData: FormData): Promise<void> {
  await requireRole(["SUPER_ADMIN"])

  const rawDeptId = formData.get("departmentId")
  const rawLocationDetail = formData.get("locationDetail")

  const parsed = updateDeviceSchema.parse({
    deviceId: formData.get("deviceId"),
    departmentId: rawDeptId === null || rawDeptId === "" ? null : rawDeptId,
    manufacturer: formData.get("manufacturer"),
    model: formData.get("model"),
    serial: formData.get("serial"),
    manufacturedAt: formData.get("manufacturedAt"),
    purchasedAt: formData.get("purchasedAt"),
    expiresAt: formData.get("expiresAt"),
    padReplaceAt: formData.get("padReplaceAt"),
    batteryReplaceAt: formData.get("batteryReplaceAt"),
    location: formData.get("location"),
    locationDetail: rawLocationDetail === null || rawLocationDetail === "" ? null : rawLocationDetail
  })

  const deviceRows = await db
    .select({ id: schema.devices.id, tenantId: schema.devices.tenantId })
    .from(schema.devices)
    .where(eq(schema.devices.id, parsed.deviceId))
    .limit(1)
  const device = deviceRows[0]
  if (!device) {
    throw new Error("해당 장비를 찾을 수 없습니다.")
  }

  try {
    await db
      .update(schema.devices)
      .set({
        departmentId: parsed.departmentId,
        manufacturer: parsed.manufacturer,
        model: parsed.model,
        serial: parsed.serial,
        manufacturedAt: new Date(parsed.manufacturedAt),
        purchasedAt: new Date(parsed.purchasedAt),
        expiresAt: new Date(parsed.expiresAt),
        padReplaceAt: new Date(parsed.padReplaceAt),
        batteryReplaceAt: new Date(parsed.batteryReplaceAt),
        location: parsed.location,
        locationDetail: parsed.locationDetail
      })
      .where(eq(schema.devices.id, parsed.deviceId))
  } catch (error) {
    console.error("[admin-devices] update failed", { error })
    throw new Error("장비 수정에 실패했습니다.")
  }

  revalidatePath("/admin/devices")
}

// ────────────────────────────────────────────────────────────────────────────
// deleteDevice
// ────────────────────────────────────────────────────────────────────────────

const deleteDeviceSchema = z.object({
  deviceId: z.string().uuid()
})

export type DeleteDeviceInput = z.infer<typeof deleteDeviceSchema>

/**
 * Server Action — delete a device.
 * Allowed: SUPER_ADMIN only.
 * Rejects when inspection records exist (hard delete not safe with FK cascade).
 */
export async function deleteDevice(formData: FormData): Promise<void> {
  await requireRole(["SUPER_ADMIN"])

  const parsed = deleteDeviceSchema.parse({
    deviceId: formData.get("deviceId")
  })

  const deviceRows = await db
    .select({
      id: schema.devices.id,
      tenantId: schema.devices.tenantId,
      code: schema.devices.code,
      serial: schema.devices.serial
    })
    .from(schema.devices)
    .where(eq(schema.devices.id, parsed.deviceId))
    .limit(1)
  const device = deviceRows[0]
  if (!device) {
    throw new Error("해당 장비를 찾을 수 없습니다.")
  }

  // Reject if inspection records exist.
  const inspCountRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.inspections)
    .where(eq(schema.inspections.deviceId, parsed.deviceId))
  const inspCount = inspCountRows[0]?.count ?? 0
  if (inspCount > 0) {
    throw new Error(
      `이 장비에 점검 이력이 ${inspCount}건 있어 삭제할 수 없습니다. 장비를 비활성화하려면 관리자에게 문의하세요.`
    )
  }

  try {
    await db
      .delete(schema.devices)
      .where(eq(schema.devices.id, parsed.deviceId))
  } catch (error) {
    console.error("[admin-devices] delete failed", { error })
    throw new Error("장비 삭제에 실패했습니다.")
  }

  revalidatePath("/admin/devices")
}
