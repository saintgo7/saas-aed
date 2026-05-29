import { Link } from "@/i18n/navigation"
import { notFound } from "next/navigation"
import { eq, sql, desc } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { disableTenant, enableTenant, updateTenantContact } from "@/server/actions/admin-tenants"
import { deleteDevice } from "@/server/actions/admin-devices"
import { DataTable, THead, TR, TH, TD, EmptyRow } from "@/components/admin/data-table"
import { StatBadge } from "@/components/admin/search-input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CreateDeviceForm } from "./_components/create-device-form"

interface DetailPageProps {
  params: { slug: string }
}

interface RoleCount {
  role: string
  count: number
}

interface DepartmentRow {
  id: string
  code: string
  name: string
  deviceQuota: number
  managerName: string | null
  managerEmail: string | null
  deviceCount: number
}

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  departmentCode: string | null
  createdAt: Date
}

interface DeviceRow {
  id: string
  code: string | null
  departmentCode: string | null
  departmentName: string | null
  location: string
  manufacturer: string
  model: string
  serial: string
  expiresAt: Date
  inspCount: number
}

function planTone(plan: string): "slate" | "amber" | "green" | "brand" {
  if (plan === "ENTERPRISE") return "brand"
  if (plan === "STANDARD") return "green"
  if (plan === "FREE") return "amber"
  return "slate"
}

function roleTone(role: string): "slate" | "amber" | "green" | "red" | "brand" {
  switch (role) {
    case "SUPER_ADMIN":
      return "red"
    case "HQ_ADMIN":
      return "brand"
    case "DEPT_MANAGER":
      return "green"
    case "INSPECTOR":
      return "slate"
    default:
      return "amber"
  }
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
}

function expiryTone(d: Date): "slate" | "amber" | "red" {
  const diff = d.getTime() - Date.now()
  const days = diff / 86400000
  if (days < 0) return "red"
  if (days < 90) return "amber"
  return "slate"
}

/**
 * /admin/tenants/[slug] — tenant detail drilldown.
 * Auth: SUPER_ADMIN OR (HQ_ADMIN with matching tenantId).
 */
export default async function TenantDetailPage({ params }: DetailPageProps) {
  const session = await requireRole(["SUPER_ADMIN", "HQ_ADMIN"])

  const tenantRows = await db
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name,
      contactEmail: schema.organizations.contactEmail,
      contactPhone: schema.organizations.contactPhone,
      plan: schema.organizations.plan,
      createdAt: schema.organizations.createdAt
    })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, params.slug))
    .limit(1)

  const tenant = tenantRows[0]
  if (!tenant) {
    notFound()
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN"
  if (!isSuperAdmin && session.user.tenantId !== tenant.id) {
    notFound()
  }

  // Stat counts (parallel)
  const [deptCountRows, userCountRows, deviceCountRows, roleBreakdown] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.departments)
      .where(eq(schema.departments.tenantId, tenant.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.tenantId, tenant.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.devices)
      .where(eq(schema.devices.tenantId, tenant.id)),
    db
      .select({
        role: schema.users.role,
        count: sql<number>`count(*)::int`
      })
      .from(schema.users)
      .where(eq(schema.users.tenantId, tenant.id))
      .groupBy(schema.users.role)
  ])
  const deptCount = deptCountRows[0]?.count ?? 0
  const userCount = userCountRows[0]?.count ?? 0
  const deviceCount = deviceCountRows[0]?.count ?? 0
  const roleCounts: ReadonlyArray<RoleCount> = roleBreakdown.map((r) => ({ role: r.role, count: r.count }))

  // Department list with manager join + device count
  const departments: ReadonlyArray<DepartmentRow> = await db
    .select({
      id: schema.departments.id,
      code: schema.departments.code,
      name: schema.departments.name,
      deviceQuota: schema.departments.deviceQuota,
      managerName: schema.users.name,
      managerEmail: schema.users.email,
      deviceCount: sql<number>`(
        select count(*)::int
        from ${schema.devices}
        where ${schema.devices.departmentId} = ${schema.departments.id}
      )`
    })
    .from(schema.departments)
    .leftJoin(schema.users, eq(schema.users.id, schema.departments.managerUserId))
    .where(eq(schema.departments.tenantId, tenant.id))
    .orderBy(schema.departments.sortOrder, schema.departments.code)

  // User list (cap to 100 for now — full mgmt lives in /admin/users)
  const userRowsRaw = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      departmentCode: schema.departments.code,
      createdAt: schema.users.createdAt
    })
    .from(schema.users)
    .leftJoin(schema.departments, eq(schema.departments.id, schema.users.departmentId))
    .where(eq(schema.users.tenantId, tenant.id))
    .orderBy(desc(schema.users.createdAt))
    .limit(100)
  const userRows: ReadonlyArray<UserRow> = userRowsRaw

  // Device list for this tenant (capped at 200; full mgmt lives in /admin/devices)
  const deviceRowsRaw = await db
    .select({
      id: schema.devices.id,
      code: schema.devices.code,
      departmentCode: schema.departments.code,
      departmentName: schema.departments.name,
      location: schema.devices.location,
      manufacturer: schema.devices.manufacturer,
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
    .leftJoin(schema.departments, eq(schema.departments.id, schema.devices.departmentId))
    .where(eq(schema.devices.tenantId, tenant.id))
    .orderBy(schema.devices.code, schema.devices.serial)
    .limit(200)
  const deviceRows: ReadonlyArray<DeviceRow> = deviceRowsRaw

  // Department options for create-device form
  const deptOptions = departments.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tenants" className="text-sm text-slate-500 hover:underline">
          ← 학교 목록
        </Link>
      </div>

      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {tenant.name}
            <StatBadge tone={planTone(tenant.plan)}>{tenant.plan}</StatBadge>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-mono">{tenant.slug ?? "—"}</span> ·{" "}
            <span className="font-mono">{tenant.contactEmail}</span>
            {tenant.contactPhone ? <span className="font-mono"> · {tenant.contactPhone}</span> : null}
          </p>
          <p className="text-xs text-slate-400 mt-1">생성일: {formatDate(tenant.createdAt)}</p>
        </div>
        {isSuperAdmin ? (
          <div className="flex gap-2">
            {tenant.name.startsWith("[비활성] ") ? (
              <form action={enableTenant}>
                <input type="hidden" name="tenantId" value={tenant.id} />
                <select
                  name="plan"
                  defaultValue="STANDARD"
                  className="border rounded px-2 py-1 text-sm font-mono mr-2"
                >
                  <option value="FREE">FREE</option>
                  <option value="STANDARD">STANDARD</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                >
                  재활성화
                </button>
              </form>
            ) : (
              <form action={disableTenant}>
                <input type="hidden" name="tenantId" value={tenant.id} />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-sm font-medium hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/30"
                >
                  이 학교 비활성화
                </button>
              </form>
            )}
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>부서</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{deptCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>사용자</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{userCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {roleCounts.map((r) => (
                <StatBadge key={r.role} tone={roleTone(r.role)}>
                  {r.role} {r.count}
                </StatBadge>
              ))}
              {roleCounts.length === 0 ? <span className="text-xs text-slate-400">사용자 없음</span> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>장비</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{deviceCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">부서 목록</h2>
        <DataTable>
          <THead>
            <TR>
              <TH>코드</TH>
              <TH>부서명</TH>
              <TH className="text-right">정원</TH>
              <TH>책임자</TH>
              <TH className="text-right">장비실수</TH>
            </TR>
          </THead>
          <tbody>
            {departments.map((d) => (
              <TR key={d.id}>
                <TD className="font-mono text-xs">{d.code}</TD>
                <TD className="font-medium">{d.name}</TD>
                <TD className="text-right tabular-nums">{d.deviceQuota}</TD>
                <TD>
                  {d.managerName ? (
                    <span>
                      {d.managerName}{" "}
                      <span className="text-xs text-slate-500 font-mono">({d.managerEmail})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">미지정</span>
                  )}
                </TD>
                <TD className="text-right tabular-nums">{d.deviceCount}</TD>
              </TR>
            ))}
            {departments.length === 0 ? <EmptyRow colSpan={5} message="등록된 부서가 없습니다." /> : null}
          </tbody>
        </DataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          사용자 목록 <span className="text-xs text-slate-500">(최근 가입순 · 최대 100명)</span>
        </h2>
        <DataTable>
          <THead>
            <TR>
              <TH>이메일</TH>
              <TH>이름</TH>
              <TH>역할</TH>
              <TH>소속 부서</TH>
              <TH>가입일</TH>
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
                <TD className="font-mono text-xs">{u.departmentCode ?? "—"}</TD>
                <TD className="text-xs text-slate-500">{formatDate(u.createdAt)}</TD>
              </TR>
            ))}
            {userRows.length === 0 ? <EmptyRow colSpan={5} message="등록된 사용자가 없습니다." /> : null}
          </tbody>
        </DataTable>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            장비 목록{" "}
            <span className="text-xs text-slate-500">(최대 200대 · 전체: </span>
            <Link href="/admin/devices" className="text-xs text-brand-600 hover:underline">
              /admin/devices
            </Link>
            <span className="text-xs text-slate-500">)</span>
          </h2>
        </div>
        <DataTable>
          <THead>
            <TR>
              <TH>장비코드</TH>
              <TH>부서</TH>
              <TH>위치</TH>
              <TH>모델명</TH>
              <TH>시리얼</TH>
              <TH>유효기한</TH>
              <TH className="text-right">점검수</TH>
              {isSuperAdmin ? <TH className="text-right">작업</TH> : null}
            </TR>
          </THead>
          <tbody>
            {deviceRows.map((d) => (
              <TR key={d.id}>
                <TD className="font-mono text-xs">{d.code ?? "—"}</TD>
                <TD className="text-xs">
                  {d.departmentCode ? (
                    <span className="font-mono">{d.departmentCode}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                  {d.departmentName ? (
                    <div className="text-slate-500">{d.departmentName}</div>
                  ) : null}
                </TD>
                <TD className="text-sm">{d.location}</TD>
                <TD className="text-sm">{d.model}</TD>
                <TD className="font-mono text-xs">{d.serial}</TD>
                <TD className="text-xs">
                  <StatBadge tone={expiryTone(d.expiresAt)}>
                    {formatDate(d.expiresAt)}
                  </StatBadge>
                </TD>
                <TD className="text-right tabular-nums text-sm">{d.inspCount}</TD>
                {isSuperAdmin ? (
                  <TD className="text-right">
                    <form action={deleteDevice} className="inline">
                      <input type="hidden" name="deviceId" value={d.id} />
                      <button
                        type="submit"
                        className="rounded border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs px-2 py-1 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                      >
                        삭제
                      </button>
                    </form>
                  </TD>
                ) : null}
              </TR>
            ))}
            {deviceRows.length === 0 ? (
              <EmptyRow colSpan={isSuperAdmin ? 8 : 7} message="등록된 장비가 없습니다." />
            ) : null}
          </tbody>
        </DataTable>
      </section>

      {isSuperAdmin ? (
        <CreateDeviceForm tenantId={tenant.id} departments={deptOptions} />
      ) : null}

      {isSuperAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>기본 정보 수정</CardTitle>
            <CardDescription>학교명과 대표 이메일만 수정합니다. 슬러그(URL 키)는 변경할 수 없습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateTenantContact} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <input type="hidden" name="tenantId" value={tenant.id} />
              <label className="flex flex-col gap-1">
                <span className="text-slate-700 dark:text-slate-300">학교명</span>
                <input
                  name="name"
                  required
                  defaultValue={tenant.name}
                  className="border rounded px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-700 dark:text-slate-300">대표 이메일</span>
                <input
                  name="contactEmail"
                  required
                  type="email"
                  defaultValue={tenant.contactEmail}
                  className="border rounded px-2 py-1 font-mono"
                />
              </label>
              <div className="md:col-span-2 flex gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-brand-700 text-white font-semibold hover:bg-brand-800"
                >
                  변경 저장
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
