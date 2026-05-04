import { eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { inviteUser } from "@/server/actions/admin-users"

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  tenantSlug: string | null
  tenantName: string
  departmentCode: string | null
}

interface TenantOption {
  id: string
  slug: string | null
  name: string
}

interface DepartmentOption {
  id: string
  tenantId: string
  code: string
  name: string
}

const ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN (시스템 운영자)" },
  { value: "HQ_ADMIN", label: "HQ_ADMIN (본부 총괄)" },
  { value: "DEPT_MANAGER", label: "DEPT_MANAGER (부서 책임자)" },
  { value: "INSPECTOR", label: "INSPECTOR (점검자)" }
]

/**
 * /admin/users — SUPER_ADMIN sees all users across tenants and may invite new ones.
 */
export default async function AdminUsersPage() {
  await requireRole(["SUPER_ADMIN"])

  const userRows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      tenantSlug: schema.organizations.slug,
      tenantName: schema.organizations.name,
      departmentCode: schema.departments.code
    })
    .from(schema.users)
    .innerJoin(
      schema.organizations,
      eq(schema.organizations.id, schema.users.tenantId)
    )
    .leftJoin(
      schema.departments,
      eq(schema.departments.id, schema.users.departmentId)
    )
    .orderBy(schema.organizations.name, schema.users.email)

  const rows: ReadonlyArray<UserRow> = userRows

  const tenants: ReadonlyArray<TenantOption> = await db
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name
    })
    .from(schema.organizations)
    .orderBy(schema.organizations.name)

  const departments: ReadonlyArray<DepartmentOption> = await db
    .select({
      id: schema.departments.id,
      tenantId: schema.departments.tenantId,
      code: schema.departments.code,
      name: schema.departments.name
    })
    .from(schema.departments)
    .orderBy(schema.departments.tenantId, schema.departments.sortOrder)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          전체 사용자 {rows.length}명 · 테넌트 {tenants.length}개
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left">이메일</th>
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">역할</th>
              <th className="px-3 py-2 text-left">테넌트</th>
              <th className="px-3 py-2 text-left">부서</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{u.role}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-slate-500">
                    {u.tenantSlug ?? "—"}
                  </span>
                  <div>{u.tenantName}</div>
                </td>
                <td className="px-3 py-2 font-mono">{u.departmentCode ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-lg font-semibold mb-3">사용자 초대</h2>
        <p className="text-xs text-slate-500 mb-4">
          초대된 사용자는 즉시 Magic Link로 로그인할 수 있도록 이메일 인증 처리됩니다.
        </p>
        <form action={inviteUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">테넌트</span>
            <select
              name="tenantId"
              required
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            >
              <option value="">선택</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.slug ? `(${t.slug})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">부서 (선택)</span>
            <select
              name="departmentId"
              defaultValue="__none__"
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            >
              <option value="__none__">— 미지정 —</option>
              {departments.map((d) => {
                const tenant = tenants.find((t) => t.id === d.tenantId)
                const tag = tenant?.slug ?? tenant?.name ?? "?"
                return (
                  <option key={d.id} value={d.id}>
                    [{tag}] {d.code} · {d.name}
                  </option>
                )
              })}
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">이메일</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">이름</span>
            <input
              name="name"
              type="text"
              required
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">역할</span>
            <select
              name="role"
              required
              defaultValue="INSPECTOR"
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">전화 (선택)</span>
            <input
              name="phone"
              type="tel"
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              초대하기
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
