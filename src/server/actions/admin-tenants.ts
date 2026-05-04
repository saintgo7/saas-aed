"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"

const createTenantSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "슬러그는 2자 이상이어야 합니다.")
    .max(40)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "소문자/숫자/하이픈만 가능합니다."),
  name: z.string().trim().min(1, "조직명을 입력해 주세요.").max(120),
  contactEmail: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  plan: z.enum(["FREE", "STANDARD", "ENTERPRISE"]).default("STANDARD"),
  hqAdminEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  hqAdminName: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>

/**
 * Server Action — create a new school (tenant). SUPER_ADMIN only.
 * Optionally seats an HQ_ADMIN at creation time so the school has
 * a 총괄 담당자 before any departments are loaded.
 */
export async function createTenant(formData: FormData): Promise<void> {
  await requireRole(["SUPER_ADMIN"])

  const parsed = createTenantSchema.parse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail"),
    plan: formData.get("plan") ?? "STANDARD",
    hqAdminEmail: formData.get("hqAdminEmail") ?? undefined,
    hqAdminName: formData.get("hqAdminName") ?? undefined
  })

  // Reject duplicate slug up-front for a clean error.
  const existing = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, parsed.slug))
    .limit(1)
  if (existing[0]) {
    throw new Error(`이미 존재하는 슬러그입니다: ${parsed.slug}`)
  }

  const inserted = await db
    .insert(schema.organizations)
    .values({
      slug: parsed.slug,
      name: parsed.name,
      contactEmail: parsed.contactEmail,
      plan: parsed.plan
    })
    .returning({ id: schema.organizations.id })

  const tenantId = inserted[0]?.id
  if (!tenantId) {
    throw new Error("학교 생성에 실패했습니다.")
  }

  if (parsed.hqAdminEmail && parsed.hqAdminName) {
    await db.insert(schema.users).values({
      tenantId,
      departmentId: null,
      email: parsed.hqAdminEmail,
      name: parsed.hqAdminName,
      role: "HQ_ADMIN",
      emailVerifiedAt: new Date()
    })
  }

  revalidatePath("/admin/tenants")
  revalidatePath("/admin/users")
}
