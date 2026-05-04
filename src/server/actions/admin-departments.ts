"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
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
