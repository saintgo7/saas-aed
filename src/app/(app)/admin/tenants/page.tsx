import Link from "next/link"
import { sql, ilike, or } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { createTenant } from "@/server/actions/admin-tenants"
import { DataTable, THead, TR, TH, TD, EmptyRow } from "@/components/admin/data-table"
import { SearchInput, Pagination, StatBadge } from "@/components/admin/search-input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

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

interface AdminTenantsPageProps {
  searchParams?: { q?: string; page?: string }
}

const PAGE_SIZE = 10

function planTone(plan: string): "slate" | "amber" | "green" | "brand" {
  if (plan === "ENTERPRISE") return "brand"
  if (plan === "STANDARD") return "green"
  if (plan === "FREE") return "amber"
  return "slate"
}

function statusFor(row: TenantRow): { tone: "red" | "green" | "amber"; label: string } {
  if (row.name.startsWith("[비활성] ")) return { tone: "red", label: "비활성" }
  if (row.deptCount === 0) return { tone: "red", label: "비어있음" }
  if (row.deptCount > 0 && row.userCount > 0) return { tone: "green", label: "운영중" }
  return { tone: "amber", label: "준비중" }
}

/**
 * /admin/tenants — list + create new school.
 * SUPER_ADMIN only. Supports ?q=<search>&page=<n>.
 */
export default async function AdminTenantsPage({ searchParams }: AdminTenantsPageProps) {
  await requireRole(["SUPER_ADMIN"])

  const q = (searchParams?.q ?? "").trim()
  const pageParam = Number.parseInt(searchParams?.page ?? "1", 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const whereClause = q
    ? or(ilike(schema.organizations.name, `%${q}%`), ilike(schema.organizations.slug, `%${q}%`))
    : undefined

  const totalQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.organizations)
  const totalRows = whereClause ? await totalQuery.where(whereClause) : await totalQuery
  const total = totalRows[0]?.count ?? 0

  const baseRowsQuery = db
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name,
      contactEmail: schema.organizations.contactEmail,
      plan: schema.organizations.plan,
      deptCount: sql<number>`(
        select count(*)::int
        from departments
        where departments.tenant_id = organizations.id
      )`,
      userCount: sql<number>`(
        select count(*)::int
        from users
        where users.tenant_id = organizations.id
      )`,
      deviceCount: sql<number>`(
        select count(*)::int
        from devices
        where devices.tenant_id = organizations.id
      )`
    })
    .from(schema.organizations)
    .orderBy(schema.organizations.name)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const rows: ReadonlyArray<TenantRow> = whereClause
    ? await baseRowsQuery.where(whereClause)
    : await baseRowsQuery

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">학교(테넌트) 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          전체 {total}개 조직 · SUPER_ADMIN만 학교를 생성할 수 있습니다.
        </p>
      </header>

      <SearchInput name="q" defaultValue={q} placeholder="학교명 또는 슬러그로 검색..." />

      <DataTable>
        <THead>
          <TR>
            <TH>슬러그</TH>
            <TH>학교명</TH>
            <TH>대표 이메일</TH>
            <TH>요금제</TH>
            <TH>상태</TH>
            <TH className="text-right">부서</TH>
            <TH className="text-right">사용자</TH>
            <TH className="text-right">장비</TH>
          </TR>
        </THead>
        <tbody>
          {rows.map((t) => {
            const status = statusFor(t)
            return (
              <TR key={t.id}>
                <TD className="font-mono text-xs">
                  {t.slug ? (
                    <Link
                      href={`/admin/tenants/${t.slug}`}
                      className="text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {t.slug}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="font-medium">{t.name}</TD>
                <TD className="font-mono text-xs">{t.contactEmail}</TD>
                <TD>
                  <StatBadge tone={planTone(t.plan)}>{t.plan}</StatBadge>
                </TD>
                <TD>
                  <StatBadge tone={status.tone}>{status.label}</StatBadge>
                </TD>
                <TD className="text-right tabular-nums">{t.deptCount}</TD>
                <TD className="text-right tabular-nums">{t.userCount}</TD>
                <TD className="text-right tabular-nums">{t.deviceCount}</TD>
              </TR>
            )
          })}
          {rows.length === 0 ? (
            <EmptyRow colSpan={8} message={q ? `"${q}" 검색 결과가 없습니다.` : "등록된 학교가 없습니다."} />
          ) : null}
        </tbody>
      </DataTable>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        baseHref="/admin/tenants"
        query={{ q: q || undefined }}
      />

      <Card>
        <CardHeader>
          <CardTitle>신규 학교 등록</CardTitle>
          <CardDescription>
            학교 생성과 동시에 총괄 담당자(HQ_ADMIN)를 임명할 수 있습니다. 이메일·이름을 비워두면 학교만 만들고 관리자는
            나중에 <span className="font-mono">/admin/users</span>에서 추가합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <div className="md:col-span-2 mt-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">
                (선택) 초기 총괄 담당자 — HQ_ADMIN
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>
            </div>

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
        </CardContent>
      </Card>
    </div>
  )
}
