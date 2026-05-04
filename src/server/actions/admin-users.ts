"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"

const inviteSchema = z.object({
  tenantId: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
  email: z.string().email(),
  name: z.string().min(1, "이름을 입력해 주세요."),
  role: z.enum(["SUPER_ADMIN", "HQ_ADMIN", "DEPT_MANAGER", "INSPECTOR"]),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
})

export type InviteUserInput = z.infer<typeof inviteSchema>

/**
 * Server Action — invite a user. SUPER_ADMIN only.
 * Inserts directly via db (cross-tenant context). Sets emailVerifiedAt = now()
 * so the new user can sign in immediately via Magic Link.
 */
export async function inviteUser(formData: FormData): Promise<void> {
  await requireRole(["SUPER_ADMIN"])

  const rawDept = formData.get("departmentId")
  const rawPhone = formData.get("phone")
  const parsed = inviteSchema.parse({
    tenantId: formData.get("tenantId"),
    departmentId:
      rawDept === null || rawDept === "" || rawDept === "__none__"
        ? null
        : rawDept,
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    phone: typeof rawPhone === "string" ? rawPhone : undefined
  })

  // Verify tenant exists.
  const tenantRows = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, parsed.tenantId))
    .limit(1)
  if (!tenantRows[0]) {
    throw new Error("존재하지 않는 테넌트입니다.")
  }

  // Verify department (if any) belongs to tenant.
  if (parsed.departmentId) {
    const deptRows = await db
      .select({ id: schema.departments.id })
      .from(schema.departments)
      .where(
        and(
          eq(schema.departments.id, parsed.departmentId),
          eq(schema.departments.tenantId, parsed.tenantId)
        )
      )
      .limit(1)
    if (!deptRows[0]) {
      throw new Error("선택한 부서가 해당 테넌트에 속하지 않습니다.")
    }
  }

  try {
    await db.insert(schema.users).values({
      tenantId: parsed.tenantId,
      departmentId: parsed.departmentId,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      phone: parsed.phone ?? null,
      emailVerifiedAt: new Date()
    })
  } catch (error) {
    console.error("[admin-users] inviteUser failed", { error })
    throw new Error("사용자 초대에 실패했습니다. 이메일 중복 여부를 확인해 주세요.")
  }

  revalidatePath("/admin/users")
}
