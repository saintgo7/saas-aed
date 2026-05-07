"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"

const updateManagerSchema = z.object({
  departmentId: z.string().uuid(),
  managerUserId: z.string().uuid().nullable()
})

export type UpdateDepartmentManagerInput = z.infer<typeof updateManagerSchema>

/**
 * Server Action — assign (or clear) a department's manager.
 * Allowed: SUPER_ADMIN, HQ_ADMIN. The target user must belong to the same tenant
 * as the department; HQ_ADMIN may only update departments inside their own tenant.
 */
export async function updateDepartmentManager(formData: FormData): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN", "HQ_ADMIN"])

  const rawManager = formData.get("managerUserId")
  const parsed = updateManagerSchema.parse({
    departmentId: formData.get("departmentId"),
    managerUserId:
      rawManager === null || rawManager === "" || rawManager === "__none__"
        ? null
        : rawManager
  })

  // Load the department to verify tenant match.
  const deptRows = await db
    .select()
    .from(schema.departments)
    .where(eq(schema.departments.id, parsed.departmentId))
    .limit(1)
  const dept = deptRows[0]
  if (!dept) {
    throw new Error("해당 부서를 찾을 수 없습니다.")
  }

  // HQ_ADMIN scoped to their own tenant.
  if (session.user.role === "HQ_ADMIN" && dept.tenantId !== session.user.tenantId) {
    throw new Error("이 부서를 수정할 권한이 없습니다.")
  }

  // If a managerUserId is supplied, verify it belongs to the same tenant.
  if (parsed.managerUserId) {
    const userRows = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, parsed.managerUserId),
          eq(schema.users.tenantId, dept.tenantId)
        )
      )
      .limit(1)
    if (!userRows[0]) {
      throw new Error("선택한 사용자가 같은 테넌트에 속하지 않습니다.")
    }
  }

  try {
    await db
      .update(schema.departments)
      .set({ managerUserId: parsed.managerUserId })
      .where(eq(schema.departments.id, parsed.departmentId))
  } catch (error) {
    console.error("[admin-departments] update manager failed", { error })
    throw new Error("부서 관리자 변경에 실패했습니다.")
  }

  revalidatePath("/admin/departments")
}

// ────────────────────────────────────────────────────────────────────────────
// createDepartment
// ────────────────────────────────────────────────────────────────────────────

const DEPT_CODE_PATTERN = /^[A-Z]+-\d{2}$/

const createDepartmentSchema = z.object({
  tenantId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .regex(DEPT_CODE_PATTERN, "부서 코드 형식은 'CNU-29'와 같이 대문자-숫자 두 자리입니다."),
  name: z.string().trim().min(1, "부서명을 입력하세요.").max(120),
  deviceQuota: z.coerce.number().int().min(0),
  isHq: z.boolean()
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>

/**
 * Server Action — create a new department.
 * Allowed: SUPER_ADMIN, or HQ_ADMIN scoped to their own tenant.
 * Rejects duplicate (tenantId, code). sortOrder = (max for tenant) + 1.
 */
export async function createDepartment(formData: FormData): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN", "HQ_ADMIN"])

  const rawIsHq = formData.get("isHq")
  const parsed = createDepartmentSchema.parse({
    tenantId: formData.get("tenantId"),
    code: formData.get("code"),
    name: formData.get("name"),
    deviceQuota: formData.get("deviceQuota") ?? 0,
    isHq: rawIsHq === "on" || rawIsHq === "true" || rawIsHq === "1"
  })

  if (
    session.user.role === "HQ_ADMIN" &&
    parsed.tenantId !== session.user.tenantId
  ) {
    throw new Error("이 테넌트에 부서를 추가할 권한이 없습니다.")
  }

  // Reject duplicate (tenantId, code).
  const existing = await db
    .select({ id: schema.departments.id })
    .from(schema.departments)
    .where(
      and(
        eq(schema.departments.tenantId, parsed.tenantId),
        eq(schema.departments.code, parsed.code)
      )
    )
    .limit(1)
  if (existing[0]) {
    throw new Error(`이미 존재하는 부서 코드입니다: ${parsed.code}`)
  }

  // Compute next sortOrder for this tenant.
  const maxRows = await db
    .select({
      max: sql<number | null>`max(${schema.departments.sortOrder})`
    })
    .from(schema.departments)
    .where(eq(schema.departments.tenantId, parsed.tenantId))
  const currentMax = maxRows[0]?.max ?? 0
  const nextSortOrder = currentMax + 1

  try {
    await db.insert(schema.departments).values({
      tenantId: parsed.tenantId,
      code: parsed.code,
      name: parsed.name,
      deviceQuota: parsed.deviceQuota,
      isHq: parsed.isHq,
      sortOrder: nextSortOrder
    })
  } catch (error) {
    console.error("[admin-departments] create failed", { error })
    throw new Error("부서 생성에 실패했습니다.")
  }

  revalidatePath("/admin/departments")
}

// ────────────────────────────────────────────────────────────────────────────
// deleteDepartment
// ────────────────────────────────────────────────────────────────────────────

const deleteDepartmentSchema = z.object({
  departmentId: z.string().uuid()
})

export type DeleteDepartmentInput = z.infer<typeof deleteDepartmentSchema>

/**
 * Server Action — delete a department.
 * Allowed: SUPER_ADMIN, or HQ_ADMIN scoped to their own tenant.
 * Rejects when any device still references the department.
 */
export async function deleteDepartment(formData: FormData): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN", "HQ_ADMIN"])

  const parsed = deleteDepartmentSchema.parse({
    departmentId: formData.get("departmentId")
  })

  const deptRows = await db
    .select()
    .from(schema.departments)
    .where(eq(schema.departments.id, parsed.departmentId))
    .limit(1)
  const dept = deptRows[0]
  if (!dept) {
    throw new Error("해당 부서를 찾을 수 없습니다.")
  }

  if (
    session.user.role === "HQ_ADMIN" &&
    dept.tenantId !== session.user.tenantId
  ) {
    throw new Error("이 부서를 삭제할 권한이 없습니다.")
  }

  // Reject if devices still reference this department.
  const deviceCountRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(schema.devices)
    .where(eq(schema.devices.departmentId, parsed.departmentId))
  const deviceCount = deviceCountRows[0]?.count ?? 0
  if (deviceCount > 0) {
    throw new Error(
      `이 부서에 등록된 장비가 ${deviceCount}대 있어 삭제할 수 없습니다.`
    )
  }

  try {
    await db
      .delete(schema.departments)
      .where(eq(schema.departments.id, parsed.departmentId))
  } catch (error) {
    console.error("[admin-departments] delete failed", { error })
    throw new Error("부서 삭제에 실패했습니다.")
  }

  revalidatePath("/admin/departments")
}
