import { and, ilike, or, sql, type SQL } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { deleteDevice } from "@/server/actions/admin-devices"
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

interface DeviceRow {
  id: string
  code: string | null
  tenantName: string
  tenantSlug: string | null
  departmentCode: string | null
  departmentName: string | null
  location: string
  model: string
  serial: string
  expiresAt: Date
  inspCount: number
}

interface PageProps {
  readonly searchParams: {
    q?: string
    page?: string
  }
}

const PAGE_SIZE = 20

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d)
}

function expiryTone(d: Date): "slate" | "amber" | "red" {
  const now = Date.now()
  const diff = d.getTime() - now
  const days = diff / 86400000
  if (days < 0) return "red"
  if (days < 90) return "amber"
  return "slate"
}

/**
 * /admin/devices — full device list with search and pagination.
 * Auth: SUPER_ADMIN only.
 */
export default async function AdminDevicesPage({ searchParams }: PageProps) {
  await requireRole(["SUPER_ADMIN"])

  const q = (searchParams.q ?? "").toString().trim()
  const pageNum = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1)

  const whereParts: Array<SQL<unknown>> = []
  if (q) {
    const like = `%${q}%`
    const condition = or(
      ilike(schema.devices.code, like),
      ilike(schema.devices.model, like),
      ilike(schema.devices.serial, like),
      ilike(schema.devices.location, like)
    )
    if (condition) {
      whereParts.push(condition)
    }
  }
  const whereExpr =
    whereParts.length === 0 ? undefined : whereParts[0]

  // Total count.
  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.devices)
    .where(whereExpr)
  const total = totalRows[0]?.count ?? 0
  const offset = (pageNum - 1) * PAGE_SIZE

  // Page rows with tenant + department join.
  const baseQuery = db
    .select({
      id: schema.devices.id,
      code: schema.devices.code,
      tenantName: schema.organizations.name,
      tenantSlug: schema.organizations.slug,
      departmentCode: schema.departments.code,
      departmentName: schema.departments.name,
      location: schema.devices.location,
      model: schema.devices.model,
      serial: schema.devices.serial,
      expiresAt: schema.devices.expiresAt,
      inspCount: sql<number>`(
        select count(*)::int
        from ${schema.inspections}
        where ${schema.inspections.deviceId} = ${schema.devices.id}
      )`
    })
    .from(schema.devices)
    .innerJoin(
      schema.organizations,
      and(
        sql`${schema.organizations.id} = ${schema.devices.tenantId}`
      )
    )
    .leftJoin(
      schema.departments,
      and(
        sql`${schema.departments.id} = ${schema.devices.departmentId}`
      )
    )

  const rowsQuery = whereExpr ? baseQuery.where(whereExpr) : baseQuery
  const rows: ReadonlyArray<DeviceRow> = await rowsQuery
    .orderBy(schema.organizations.name, schema.devices.code, schema.devices.serial)
    .limit(PAGE_SIZE)
    .offset(offset)

  const queryParams: Record<string, string | undefined> = {
    q: q || undefined
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">장비 관리</h1>
        <p className="text-sm text-slate-500 mt-1">전체 테넌트 · {total}대</p>
      </header>

      <SearchInput
        name="q"
        defaultValue={q}
        placeholder="장비코드, 모델명, 시리얼, 위치 검색"
      />

      <DataTable>
        <THead>
          <TR>
            <TH>장비코드</TH>
            <TH>학교</TH>
            <TH>부서</TH>
            <TH>위치</TH>
            <TH>모델명</TH>
            <TH>시리얼</TH>
            <TH>유효기한</TH>
            <TH className="text-right">점검수</TH>
            <TH className="text-right">작업</TH>
          </TR>
        </THead>
        <tbody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD className="font-mono text-xs">{r.code ?? "—"}</TD>
              <TD>
                <span className="font-mono text-xs text-slate-400">{r.tenantSlug ?? "—"}</span>
                <div className="text-sm">{r.tenantName}</div>
              </TD>
              <TD className="text-xs">
                {r.departmentCode ? (
                  <span className="font-mono">{r.departmentCode}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
                {r.departmentName ? (
                  <div className="text-slate-500">{r.departmentName}</div>
                ) : null}
              </TD>
              <TD className="text-sm">{r.location}</TD>
              <TD className="text-sm">{r.model}</TD>
              <TD className="font-mono text-xs">{r.serial}</TD>
              <TD>
                <StatBadge tone={expiryTone(r.expiresAt)}>
                  {formatDate(r.expiresAt)}
                </StatBadge>
              </TD>
              <TD className="text-right tabular-nums text-sm">{r.inspCount}</TD>
              <TD className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <a
                    href={`/admin/devices/${r.id}/edit`}
                    className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    수정
                  </a>
                  <form action={deleteDevice} className="inline">
                    <input type="hidden" name="deviceId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs px-2 py-1 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </TD>
            </TR>
          ))}
          {rows.length === 0 ? (
            <EmptyRow colSpan={9} message="조건에 맞는 장비가 없습니다." />
          ) : null}
        </tbody>
      </DataTable>

      <Pagination
        page={pageNum}
        pageSize={PAGE_SIZE}
        total={total}
        baseHref="/admin/devices"
        query={queryParams}
      />
    </div>
  )
}
