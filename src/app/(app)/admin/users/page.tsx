import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { removeUser, updateUserRole } from "@/server/actions/admin-users"
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
import { Card, CardContent } from "@/components/ui/card"
import { InviteUserForm } from "@/components/admin/invite-user-form"

interface PageProps {
  readonly searchParams?: {
    readonly q?: string
    readonly role?: string
    readonly tenantId?: string
    readonly page?: string
  }
}

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
  tenantSlug: string | null
  tenantName: string
  departmentCode: string | null
  createdAt: Date
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

const PAGE_SIZE = 15

const ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN (시스템 운영자)" },
  { value: "HQ_ADMIN", label: "HQ_ADMIN (본부 총괄)" },
  { value: "DEPT_MANAGER", label: "DEPT_MANAGER (부서 책임자)" },
  { value: "INSPECTOR", label: "INSPECTOR (점검자)" }
]

const ROLE_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "전체 역할" },
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
  { value: "HQ_ADMIN", label: "HQ_ADMIN" },
  { value: "DEPT_MANAGER", label: "DEPT_MANAGER" },
  { value: "INSPECTOR", label: "INSPECTOR" },
  { value: "SYSTEM_ADMIN", label: "SYSTEM_ADMIN (legacy)" },
  { value: "ADMIN", label: "ADMIN (legacy)" }
]

type RoleTone = "brand" | "amber" | "green" | "slate" | "red"

function roleTone(role: string): RoleTone {
  switch (role) {
    case "SUPER_ADMIN":
      return "brand"
    case "HQ_ADMIN":
      return "amber"
    case "DEPT_MANAGER":
      return "green"
    case "INSPECTOR":
      return "slate"
    default:
      return "red"
  }
}

function isAllowedRoleFilter(value: string): boolean {
  return ROLE_FILTER_OPTIONS.some((o) => o.value === value && value !== "")
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Pure (UTC-stable) relative-time formatter for the joined-at column.
 * Avoids hydration drift by computing on the server in seconds buckets.
 */
function formatRelative(from: Date, now: Date): string {
  const diffMs = now.getTime() - from.getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  if (diffSec < 60) return `${diffSec}초 전`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}일 전`
  const diffMon = Math.floor(diffDay / 30)
  if (diffMon < 12) return `${diffMon}개월 전`
  const diffYear = Math.floor(diffDay / 365)
  return `${diffYear}년 전`
}

/**
 * /admin/users — SUPER_ADMIN sees all users across tenants.
 * Supports search (email or name), role + tenant filters, pagination.
 */
export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireRole(["SUPER_ADMIN"])

  const q = (searchParams?.q ?? "").toString().trim()
  const roleFilterRaw = (searchParams?.role ?? "").toString().trim()
  const tenantFilterRaw = (searchParams?.tenantId ?? "").toString().trim()
  const pageRaw = Number.parseInt(searchParams?.page ?? "1", 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const roleFilter = isAllowedRoleFilter(roleFilterRaw) ? roleFilterRaw : ""
  const tenantFilter = tenantFilterRaw && isUuid(tenantFilterRaw) ? tenantFilterRaw : ""

  const whereClauses: SQL[] = []
  if (q) {
    const like = `%${q}%`
    const orClause = or(ilike(schema.users.email, like), ilike(schema.users.name, like))
    if (orClause) whereClauses.push(orClause)
  }
  if (roleFilter) {
    whereClauses.push(
      sql`${schema.users.role}::text = ${roleFilter}`
    )
  }
  if (tenantFilter) {
    whereClauses.push(eq(schema.users.tenantId, tenantFilter))
  }
  const whereExpr = whereClauses.length > 0 ? and(...whereClauses) : undefined

  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(whereExpr)
  const total = totalRows[0]?.count ?? 0

  const offset = (page - 1) * PAGE_SIZE

  const userRows: ReadonlyArray<UserRow> = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      tenantId: schema.users.tenantId,
      tenantSlug: schema.organizations.slug,
      tenantName: schema.organizations.name,
      departmentCode: schema.departments.code,
      createdAt: schema.users.createdAt
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
    .where(whereExpr)
    .orderBy(desc(schema.users.createdAt), asc(schema.users.email))
    .limit(PAGE_SIZE)
    .offset(offset)

  const tenants: ReadonlyArray<TenantOption> = await db
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name
    })
    .from(schema.organizations)
    .orderBy(asc(schema.organizations.name))

  const departments: ReadonlyArray<DepartmentOption> = await db
    .select({
      id: schema.departments.id,
      tenantId: schema.departments.tenantId,
      code: schema.departments.code,
      name: schema.departments.name
    })
    .from(schema.departments)
    .orderBy(schema.departments.tenantId, schema.departments.sortOrder)

  const now = new Date()

  const preserveQuery: Record<string, string | undefined> = {
    q: q || undefined,
    role: roleFilter || undefined,
    tenantId: tenantFilter || undefined
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          전체 {total}명 · 테넌트 {tenants.length}개
        </p>
      </header>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <SearchInput
            name="q"
            defaultValue={q}
            placeholder="이메일 또는 이름으로 검색..."
            preserve={{
              role: roleFilter || undefined,
              tenantId: tenantFilter || undefined
            }}
          />
          <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <label className="flex items-center gap-1.5">
              <span className="text-slate-600 dark:text-slate-400">역할</span>
              <select
                name="role"
                defaultValue={roleFilter}
                className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
              >
                {ROLE_FILTER_OPTIONS.map((r) => (
                  <option key={r.value || "all"} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-600 dark:text-slate-400">테넌트</span>
              <select
                name="tenantId"
                defaultValue={tenantFilter}
                className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
              >
                <option value="">전체 테넌트</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.slug ? ` (${t.slug})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:opacity-90 dark:bg-slate-200 dark:text-slate-900"
            >
              필터 적용
            </button>
            {q || roleFilter || tenantFilter ? (
              <a
                href="/admin/users"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                초기화
              </a>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <DataTable>
        <THead>
          <TR>
            <TH>이메일</TH>
            <TH>이름</TH>
            <TH>역할</TH>
            <TH>테넌트</TH>
            <TH>부서</TH>
            <TH>가입</TH>
            <TH className="text-right">작업</TH>
          </TR>
        </THead>
        <tbody>
          {userRows.map((u) => (
            <TR key={u.id}>
              <TD className="font-mono text-xs">{u.email}</TD>
              <TD>{u.name}</TD>
              <TD>
                <StatBadge tone={roleTone(u.role)}>{u.role}</StatBadge>
              </TD>
              <TD>
                <div className="font-mono text-xs text-slate-500">
                  {u.tenantSlug ?? "—"}
                </div>
                <div>{u.tenantName}</div>
              </TD>
              <TD className="font-mono text-xs">{u.departmentCode ?? "—"}</TD>
              <TD className="text-xs text-slate-500" title={u.createdAt.toISOString()}>
                {formatRelative(u.createdAt, now)}
              </TD>
              <TD className="text-right">
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <form action={updateUserRole} className="flex items-center gap-1">
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-2 py-1 rounded bg-brand-700 text-white text-xs font-medium hover:bg-brand-800"
                    >
                      역할 변경
                    </button>
                  </form>
                  <form action={removeUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded border border-rose-300 text-rose-700 text-xs font-medium hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/30"
                    >
                      제거
                    </button>
                  </form>
                </div>
              </TD>
            </TR>
          ))}
          {userRows.length === 0 ? (
            <EmptyRow colSpan={7} message="조건에 맞는 사용자가 없습니다." />
          ) : null}
        </tbody>
      </DataTable>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        baseHref="/admin/users"
        query={preserveQuery}
      />

      <InviteUserForm
        tenants={tenants}
        departments={departments}
        roleOptions={ROLE_OPTIONS}
      />
    </div>
  )
}
