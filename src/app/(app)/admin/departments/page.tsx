import { and, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import {
  deleteDepartment,
  updateDepartmentManager
} from "@/server/actions/admin-departments"
import {
  DataTable,
  EmptyRow,
  TD,
  TH,
  THead,
  TR
} from "@/components/admin/data-table"
import {
  Pagination,
  SearchInput,
  StatBadge
} from "@/components/admin/search-input"
import { CreateDepartmentForm } from "./_components/create-department-form"

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

interface TenantOption {
  id: string
  slug: string | null
  name: string
}

interface PageProps {
  readonly searchParams: {
    q?: string
    tenantId?: string
    page?: string
  }
}

const PAGE_SIZE = 20

/**
 * /admin/departments — list + manage departments with search, pagination,
 * tenant filter, manager assignment, create-form, and delete action.
 */
export default async function AdminDepartmentsPage({ searchParams }: PageProps) {
  const session = await requireRole(["SUPER_ADMIN", "HQ_ADMIN"])
  const isSuper = session.user.role === "SUPER_ADMIN"
  const sessionTenantId = session.user.tenantId

  const q = (searchParams.q ?? "").toString().trim()
  const requestedTenantId = (searchParams.tenantId ?? "").toString().trim()
  const pageNum = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1)

  // Resolve effective tenant filter.
  // HQ_ADMIN: forced to own tenant. SUPER_ADMIN: uses the filter (or all).
  const effectiveTenantId = isSuper
    ? requestedTenantId || ""
    : sessionTenantId

  // Build where clauses.
  const whereParts: Array<SQL<unknown>> = []
  if (effectiveTenantId) {
    whereParts.push(eq(schema.departments.tenantId, effectiveTenantId))
  }
  if (q) {
    const like = `%${q}%`
    const codeOrName = or(
      ilike(schema.departments.code, like),
      ilike(schema.departments.name, like)
    )
    if (codeOrName) {
      whereParts.push(codeOrName)
    }
  }
  const whereExpr =
    whereParts.length === 0
      ? undefined
      : whereParts.length === 1
        ? whereParts[0]
        : and(...whereParts)

  // Total count for pagination.
  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.departments)
    .where(whereExpr)
  const total = totalRows[0]?.count ?? 0
  const offset = (pageNum - 1) * PAGE_SIZE

  // Page rows — single grouped query with device counts.
  const baseSelect = db
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

  const rowsQuery = whereExpr ? baseSelect.where(whereExpr) : baseSelect
  const rows: ReadonlyArray<DeptRow> = await rowsQuery
    .orderBy(
      schema.organizations.name,
      schema.departments.sortOrder,
      schema.departments.code
    )
    .limit(PAGE_SIZE)
    .offset(offset)

  // Manager candidates for the rows we just loaded.
  const tenantIdsOnPage = Array.from(new Set(rows.map((r) => r.tenantId)))
  const userRows: ReadonlyArray<UserOption> = tenantIdsOnPage.length
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
            inArray(schema.users.tenantId, tenantIdsOnPage),
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

  // Tenant options for the filter (SUPER) and the create form.
  const allTenants: ReadonlyArray<TenantOption> = isSuper
    ? await db
        .select({
          id: schema.organizations.id,
          slug: schema.organizations.slug,
          name: schema.organizations.name
        })
        .from(schema.organizations)
        .orderBy(schema.organizations.name)
    : await db
        .select({
          id: schema.organizations.id,
          slug: schema.organizations.slug,
          name: schema.organizations.name
        })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, sessionTenantId))

  const showTenantColumn = isSuper && !effectiveTenantId
  const baseCols = 6 // code, name, quota, manager, hq, devices, actions => 7. tenant col adds 1
  const colSpan = (showTenantColumn ? 1 : 0) + baseCols + 1

  const queryParams: Record<string, string | undefined> = {
    q: q || undefined,
    tenantId: isSuper ? requestedTenantId || undefined : undefined
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">부서 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuper
              ? effectiveTenantId
                ? "선택 테넌트"
                : "전체 테넌트"
              : "내 테넌트"}{" "}
            · {total}개 부서
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput
          name="q"
          defaultValue={q}
          placeholder="코드 또는 부서명 검색"
          preserve={{
            tenantId: isSuper ? requestedTenantId || undefined : undefined
          }}
        />
        {isSuper ? (
          <form className="flex items-center gap-2" role="search">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <label className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">테넌트 필터</span>
              <select
                name="tenantId"
                defaultValue={requestedTenantId}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
              >
                <option value="">전체</option>
                {allTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.slug ? `(${t.slug})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="self-end px-3 py-1.5 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-800"
            >
              적용
            </button>
          </form>
        ) : null}
      </div>

      <DataTable>
        <THead>
          <TR>
            {showTenantColumn ? <TH>테넌트</TH> : null}
            <TH>코드</TH>
            <TH>부서명</TH>
            <TH className="text-right">정원</TH>
            <TH className="text-right">장비수</TH>
            <TH>관리자</TH>
            <TH className="text-center">총괄</TH>
            <TH className="text-right">작업</TH>
          </TR>
        </THead>
        <tbody>
          {rows.map((r) => {
            const candidates = usersByTenant[r.tenantId] ?? []
            const overQuota = r.deviceCount > r.deviceQuota
            return (
              <TR key={r.id}>
                {showTenantColumn ? (
                  <TD>
                    <span className="font-mono text-xs text-slate-500">
                      {r.tenantSlug ?? "—"}
                    </span>
                    <div>{r.tenantName}</div>
                  </TD>
                ) : null}
                <TD className="font-mono">{r.code}</TD>
                <TD>{r.name}</TD>
                <TD className="text-right tabular-nums">{r.deviceQuota}</TD>
                <TD className="text-right tabular-nums">
                  {overQuota ? (
                    <StatBadge tone="red">
                      {r.deviceCount} / {r.deviceQuota}
                    </StatBadge>
                  ) : (
                    <span>{r.deviceCount}</span>
                  )}
                </TD>
                <TD>
                  <form
                    action={updateDepartmentManager}
                    className="flex items-center gap-2"
                  >
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
                </TD>
                <TD className="text-center">
                  {r.isHq ? <StatBadge tone="brand">HQ</StatBadge> : null}
                </TD>
                <TD className="text-right">
                  <form action={deleteDepartment} className="inline">
                    <input type="hidden" name="departmentId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs px-2 py-1 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                    >
                      삭제
                    </button>
                  </form>
                </TD>
              </TR>
            )
          })}
          {rows.length === 0 ? (
            <EmptyRow colSpan={colSpan} message="조건에 맞는 부서가 없습니다." />
          ) : null}
        </tbody>
      </DataTable>

      <Pagination
        page={pageNum}
        pageSize={PAGE_SIZE}
        total={total}
        baseHref="/admin/departments"
        query={queryParams}
      />

      <CreateDepartmentForm
        isSuper={isSuper}
        tenants={allTenants}
        defaultTenantId={effectiveTenantId || ""}
        fixedTenantId={isSuper ? undefined : sessionTenantId}
      />
    </div>
  )
}
