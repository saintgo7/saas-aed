import { and, eq, inArray, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { updateDepartmentManager } from "@/server/actions/admin-departments"

interface DeptRow {
  id: string
  tenantId: string
  tenantName: string
  tenantSlug: string | null
  code: string
  name: string
  deviceQuota: number
  isHq: boolean
  managerUserId: string | null
  managerName: string | null
  deviceCount: number
}

interface UserOption {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
}

/**
 * /admin/departments — list all departments with manager assignment UI.
 * SUPER_ADMIN sees all tenants; HQ_ADMIN scoped to their own tenant.
 */
export default async function AdminDepartmentsPage() {
  const session = await requireRole(["SUPER_ADMIN", "HQ_ADMIN"])
  const isSuper = session.user.role === "SUPER_ADMIN"
  const tenantId = session.user.tenantId

  const baseQuery = db
    .select({
      id: schema.departments.id,
      tenantId: schema.departments.tenantId,
      tenantName: schema.organizations.name,
      tenantSlug: schema.organizations.slug,
      code: schema.departments.code,
      name: schema.departments.name,
      deviceQuota: schema.departments.deviceQuota,
      isHq: schema.departments.isHq,
      managerUserId: schema.departments.managerUserId,
      managerName: schema.users.name,
      deviceCount: sql<number>`(
        select count(*)::int
        from ${schema.devices}
        where ${schema.devices.departmentId} = ${schema.departments.id}
      )`
    })
    .from(schema.departments)
    .innerJoin(
      schema.organizations,
      eq(schema.organizations.id, schema.departments.tenantId)
    )
    .leftJoin(schema.users, eq(schema.users.id, schema.departments.managerUserId))

  const rows: DeptRow[] = isSuper
    ? await baseQuery.orderBy(
        schema.organizations.name,
        schema.departments.sortOrder,
        schema.departments.code
      )
    : await baseQuery
        .where(eq(schema.departments.tenantId, tenantId))
        .orderBy(schema.departments.sortOrder, schema.departments.code)

  // Load candidate managers (DEPT_MANAGER, HQ_ADMIN) for the relevant tenants.
  const tenantIds = Array.from(new Set(rows.map((r) => r.tenantId)))
  const userRows: ReadonlyArray<UserOption> = tenantIds.length
    ? await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: schema.users.role,
          tenantId: schema.users.tenantId
        })
        .from(schema.users)
        .where(
          and(
            inArray(schema.users.tenantId, tenantIds),
            inArray(schema.users.role, ["DEPT_MANAGER", "HQ_ADMIN"])
          )
        )
    : []

  const usersByTenant = userRows.reduce<Record<string, ReadonlyArray<UserOption>>>(
    (acc, u) => {
      const list = acc[u.tenantId] ?? []
      return { ...acc, [u.tenantId]: [...list, u] }
    },
    {}
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">부서 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isSuper ? "전체 테넌트" : "내 테넌트"} · {rows.length}개 부서
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              {isSuper ? <th className="px-3 py-2 text-left">테넌트</th> : null}
              <th className="px-3 py-2 text-left">코드</th>
              <th className="px-3 py-2 text-left">부서명</th>
              <th className="px-3 py-2 text-right">정원</th>
              <th className="px-3 py-2 text-right">장비수</th>
              <th className="px-3 py-2 text-center">총괄</th>
              <th className="px-3 py-2 text-left">관리자</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const candidates = usersByTenant[r.tenantId] ?? []
              return (
                <tr
                  key={r.id}
                  className={`border-t border-slate-200 dark:border-slate-800 ${r.isHq ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}
                >
                  {isSuper ? (
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-slate-500">
                        {r.tenantSlug ?? "—"}
                      </span>
                      <div>{r.tenantName}</div>
                    </td>
                  ) : null}
                  <td className="px-3 py-2 font-mono">{r.code}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right">{r.deviceQuota}</td>
                  <td className="px-3 py-2 text-right">{r.deviceCount}</td>
                  <td className="px-3 py-2 text-center">{r.isHq ? "✅" : ""}</td>
                  <td className="px-3 py-2">
                    <form action={updateDepartmentManager} className="flex items-center gap-2">
                      <input type="hidden" name="departmentId" value={r.id} />
                      <select
                        name="managerUserId"
                        defaultValue={r.managerUserId ?? "__none__"}
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2 py-1"
                      >
                        <option value="__none__">— 미지정 —</option>
                        {candidates.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs px-2 py-1 hover:opacity-90"
                      >
                        저장
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={isSuper ? 7 : 6}>
                  등록된 부서가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
