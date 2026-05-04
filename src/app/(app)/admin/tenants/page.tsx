import { sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"

interface TenantRow {
  id: string
  slug: string | null
  name: string
  contactEmail: string
  plan: string
  deptCount: number
  userCount: number
  deviceCount: number
}

/**
 * /admin/tenants — read-only tenant list with rollup counts.
 * SUPER_ADMIN only.
 */
export default async function AdminTenantsPage() {
  await requireRole(["SUPER_ADMIN"])

  const rows: ReadonlyArray<TenantRow> = await db
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name,
      contactEmail: schema.organizations.contactEmail,
      plan: schema.organizations.plan,
      deptCount: sql<number>`(
        select count(*)::int
        from ${schema.departments}
        where ${schema.departments.tenantId} = ${schema.organizations.id}
      )`,
      userCount: sql<number>`(
        select count(*)::int
        from ${schema.users}
        where ${schema.users.tenantId} = ${schema.organizations.id}
      )`,
      deviceCount: sql<number>`(
        select count(*)::int
        from ${schema.devices}
        where ${schema.devices.tenantId} = ${schema.organizations.id}
      )`
    })
    .from(schema.organizations)
    .orderBy(schema.organizations.name)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">테넌트 정보</h1>
        <p className="text-sm text-slate-500 mt-1">전체 {rows.length}개 조직 (읽기 전용)</p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left">슬러그</th>
              <th className="px-3 py-2 text-left">조직명</th>
              <th className="px-3 py-2 text-left">대표 이메일</th>
              <th className="px-3 py-2 text-left">요금제</th>
              <th className="px-3 py-2 text-right">부서</th>
              <th className="px-3 py-2 text-right">사용자</th>
              <th className="px-3 py-2 text-right">장비</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-3 py-2 font-mono text-xs">{t.slug ?? "—"}</td>
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{t.contactEmail}</td>
                <td className="px-3 py-2 font-mono text-xs">{t.plan}</td>
                <td className="px-3 py-2 text-right">{t.deptCount}</td>
                <td className="px-3 py-2 text-right">{t.userCount}</td>
                <td className="px-3 py-2 text-right">{t.deviceCount}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                  등록된 테넌트가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
