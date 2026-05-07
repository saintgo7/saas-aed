"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { and, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { logAction } from "@/lib/audit/log-action"

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

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["SUPER_ADMIN", "HQ_ADMIN", "DEPT_MANAGER", "INSPECTOR"])
})

const removeUserSchema = z.object({
  userId: z.string().uuid()
})

/**
 * Server Action — invite a user. SUPER_ADMIN only.
 * Inserts directly via db (cross-tenant context). Sets emailVerifiedAt = now()
 * so the new user can sign in immediately via Magic Link.
 */
export async function inviteUser(formData: FormData): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN"])

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

  let insertedId: string | undefined
  try {
    const rows = await db.insert(schema.users).values({
      tenantId: parsed.tenantId,
      departmentId: parsed.departmentId,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      phone: parsed.phone ?? null,
      emailVerifiedAt: new Date()
    }).returning({ id: schema.users.id })
    insertedId = rows[0]?.id
  } catch (error) {
    console.error("[admin-users] inviteUser failed", { error })
    throw new Error("사용자 초대에 실패했습니다. 이메일 중복 여부를 확인해 주세요.")
  }

  await logAction({
    actorId: session.user.id,
    tenantId: parsed.tenantId,
    action: "inviteUser",
    targetType: "user",
    targetId: insertedId,
    payload: { email: parsed.email, name: parsed.name, role: parsed.role }
  })

  revalidatePath("/admin/users")
}

/**
 * Server Action — change a user's role. SUPER_ADMIN only.
 * Cannot demote yourself (the actor) to a non-SUPER_ADMIN role.
 */
export async function updateUserRole(formData: FormData): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN"])

  const parsed = updateRoleSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role")
  })

  if (session.user.id === parsed.userId && parsed.role !== "SUPER_ADMIN") {
    throw new Error("본인 계정의 SUPER_ADMIN 역할은 스스로 해제할 수 없습니다.")
  }

  const targetRows = await db
    .select({ id: schema.users.id, tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.id, parsed.userId))
    .limit(1)
  if (!targetRows[0]) {
    throw new Error("존재하지 않는 사용자입니다.")
  }

  await db
    .update(schema.users)
    .set({ role: parsed.role })
    .where(eq(schema.users.id, parsed.userId))

  await logAction({
    actorId: session.user.id,
    tenantId: targetRows[0].tenantId,
    action: "updateUserRole",
    targetType: "user",
    targetId: parsed.userId,
    payload: { role: parsed.role }
  })

  revalidatePath("/admin/users")
}

/**
 * Server Action — remove a user row entirely. SUPER_ADMIN only.
 * Refuses if (a) the actor targets self, or (b) inspections.inspectorId
 * still references the target (FK is NOT NULL — cascade is unsafe).
 */
export async function removeUser(formData: FormData): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN"])

  const parsed = removeUserSchema.parse({
    userId: formData.get("userId")
  })

  if (session.user.id === parsed.userId) {
    throw new Error("본인 계정은 제거할 수 없습니다.")
  }

  const targetRows = await db
    .select({ id: schema.users.id, tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.id, parsed.userId))
    .limit(1)
  if (!targetRows[0]) {
    throw new Error("존재하지 않는 사용자입니다.")
  }

  const refRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.inspections)
    .where(eq(schema.inspections.inspectorId, parsed.userId))
  const refCount = refRows[0]?.count ?? 0
  if (refCount > 0) {
    throw new Error(
      `해당 사용자가 점검자로 등록된 점검 기록이 ${refCount}건 있어 제거할 수 없습니다. 먼저 기록을 정리해 주세요.`
    )
  }

  try {
    await db.delete(schema.users).where(eq(schema.users.id, parsed.userId))
  } catch (error) {
    console.error("[admin-users] removeUser failed", { error })
    throw new Error("사용자 제거에 실패했습니다.")
  }

  await logAction({
    actorId: session.user.id,
    tenantId: targetRows[0].tenantId,
    action: "removeUser",
    targetType: "user",
    targetId: parsed.userId
  })

  revalidatePath("/admin/users")
}
