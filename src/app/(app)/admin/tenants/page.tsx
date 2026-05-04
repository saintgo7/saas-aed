import { sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { createTenant } from "@/server/actions/admin-tenants"

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
 * /admin/tenants — list + create new school.
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
        <h1 className="text-2xl font-bold">학교(테넌트) 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          전체 {rows.length}개 조직 · SUPER_ADMIN만 학교를 생성할 수 있습니다.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left">슬러그</th>
              <th className="px-3 py-2 text-left">학교명</th>
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
                  등록된 학교가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-lg font-semibold mb-1">신규 학교 등록</h2>
        <p className="text-sm text-slate-500 mb-4">
          학교 생성과 동시에 총괄 담당자(HQ_ADMIN)를 임명할 수 있습니다. 이메일·이름을 비워두면 학교만 만들고 관리자는 나중에
          <span className="font-mono">/admin/users</span>에서 추가합니다.
        </p>
        <form action={createTenant} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-slate-700 dark:text-slate-300">슬러그 (URL 키)</span>
            <input
              name="slug"
              required
              placeholder="snu, kaist, postech..."
              pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
              className="border rounded px-2 py-1 font-mono"
            />
            <span className="text-xs text-slate-500">소문자·숫자·하이픈만 (2~40자)</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-700 dark:text-slate-300">학교명</span>
            <input name="name" required placeholder="서울대학교" className="border rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-700 dark:text-slate-300">대표 이메일</span>
            <input
              name="contactEmail"
              required
              type="email"
              placeholder="safety@example.ac.kr"
              className="border rounded px-2 py-1 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-700 dark:text-slate-300">요금제</span>
            <select name="plan" defaultValue="STANDARD" className="border rounded px-2 py-1 font-mono">
              <option value="FREE">FREE</option>
              <option value="STANDARD">STANDARD</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </label>

          <div className="md:col-span-2 mt-2 pt-3 border-t text-xs uppercase tracking-wide text-slate-500">
            (선택) 초기 총괄 담당자 — HQ_ADMIN
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-slate-700 dark:text-slate-300">총괄 담당자 이메일</span>
            <input
              name="hqAdminEmail"
              type="email"
              placeholder="head@example.ac.kr"
              className="border rounded px-2 py-1 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-700 dark:text-slate-300">총괄 담당자 이름</span>
            <input name="hqAdminName" placeholder="홍길동" className="border rounded px-2 py-1" />
          </label>

          <div className="md:col-span-2 flex gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-brand-700 text-white font-semibold hover:bg-brand-800"
            >
              학교 등록
            </button>
            <button type="reset" className="px-4 py-2 rounded border">
              초기화
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
