import Link from "next/link"
import { sql, desc, eq } from "drizzle-orm"
import { School, Building2, Users, HeartPulse, Activity, Inbox, ChevronRight, Clock } from "lucide-react"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"
import { Card } from "@/components/ui/card"

interface CountRow {
  count: number
}

interface RoleBreakdownRow {
  role: string
  count: number
}

interface AuditRow {
  id: string
  action: string
  resource: string
  createdAt: Date
  actorName: string | null
}

interface RecentTenant {
  id: string
  slug: string | null
  name: string
  createdAt: Date
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "SUPER",
  HQ_ADMIN: "HQ",
  DEPT_MANAGER: "DEPT",
  INSPECTOR: "INSP",
  SYSTEM_ADMIN: "SYS",
  ADMIN: "ADM"
}

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  const mon = Math.floor(day / 30)
  if (mon < 12) return `${mon}개월 전`
  return `${Math.floor(mon / 12)}년 전`
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

async function loadCount(table: typeof schema.organizations | typeof schema.departments | typeof schema.users | typeof schema.devices): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(table)
  const first = rows[0] as CountRow | undefined
  return first?.count ?? 0
}

async function loadRoleBreakdown(): Promise<ReadonlyArray<RoleBreakdownRow>> {
  const rows = await db
    .select({
      role: sql<string>`${schema.users.role}::text`,
      count: sql<number>`count(*)::int`
    })
    .from(schema.users)
    .groupBy(schema.users.role)
  return rows
}

async function loadRecentAudit(): Promise<ReadonlyArray<AuditRow>> {
  return await db
    .select({
      id: schema.auditLogs.id,
      action: sql<string>`${schema.auditLogs.action}::text`,
      resource: schema.auditLogs.resource,
      createdAt: schema.auditLogs.createdAt,
      actorName: schema.users.name
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorId))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(8)
}

async function loadRecentTenants(): Promise<ReadonlyArray<RecentTenant>> {
  return await db
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name,
      createdAt: schema.organizations.createdAt
    })
    .from(schema.organizations)
    .orderBy(desc(schema.organizations.createdAt))
    .limit(5)
}

/**
 * /admin — SUPER_ADMIN landing.
 * Overview dashboard: stat strip, quick actions, recent activity, recent tenants.
 */
export default async function AdminIndexPage() {
  await requireRole(["SUPER_ADMIN"])

  const [orgCount, deptCount, userCount, deviceCount, roleBreakdown, recentAudit, recentTenants] =
    await Promise.all([
      loadCount(schema.organizations),
      loadCount(schema.departments),
      loadCount(schema.users),
      loadCount(schema.devices),
      loadRoleBreakdown(),
      loadRecentAudit(),
      loadRecentTenants()
    ])

  const roleMap = new Map(roleBreakdown.map((r) => [r.role, r.count]))
  const roleOrder: ReadonlyArray<string> = ["SUPER_ADMIN", "HQ_ADMIN", "DEPT_MANAGER", "INSPECTOR"]

  const stats: ReadonlyArray<{
    key: string
    label: string
    value: number
    suffix: string
    hint: string
    Icon: typeof School
    accent: string
  }> = [
    {
      key: "tenants",
      label: "학교 (테넌트)",
      value: orgCount,
      suffix: "개",
      hint: orgCount > 0 ? "활성" : "비어 있음",
      Icon: School,
      accent: "text-brand-600 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-100"
    },
    {
      key: "departments",
      label: "부서",
      value: deptCount,
      suffix: "개",
      hint: orgCount > 0 ? `테넌트당 평균 ${(deptCount / Math.max(orgCount, 1)).toFixed(1)}` : "활성",
      Icon: Building2,
      accent: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-100"
    },
    {
      key: "users",
      label: "사용자",
      value: userCount,
      suffix: "명",
      hint: roleOrder
        .map((r) => `${ROLE_LABEL[r]} ${roleMap.get(r) ?? 0}`)
        .join(" / "),
      Icon: Users,
      accent: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-100"
    },
    {
      key: "devices",
      label: "장비",
      value: deviceCount,
      suffix: "대",
      hint: deviceCount > 0 ? "운영 중" : "등록 대기",
      Icon: HeartPulse,
      accent: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-100"
    }
  ]

  const quickActions: ReadonlyArray<{
    href: string
    title: string
    desc: string
    Icon: typeof School
  }> = [
    {
      href: "/admin/tenants",
      title: "테넌트 관리",
      desc: "조직(학교) 생성, 플랜 변경, 슬러그 발급",
      Icon: School
    },
    {
      href: "/admin/departments",
      title: "부서 관리",
      desc: "테넌트별 부서/관리자 배정과 정원 설정",
      Icon: Building2
    },
    {
      href: "/admin/users",
      title: "사용자 관리",
      desc: "사용자 초대, 역할 부여, 부서 배치",
      Icon: Users
    },
    {
      href: "/admin/devices",
      title: "장비 관리",
      desc: "전체 AED 장비 목록, 검색, 등록 및 삭제",
      Icon: HeartPulse
    }
  ]

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">관리자 콘솔</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          SUPER_ADMIN 전용 — 테넌트 / 부서 / 사용자 / 장비 운영 현황
        </p>
      </header>

      {/* Stat strip */}
      <section aria-label="요약 통계" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.Icon
          return (
            <Card key={s.key} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {s.label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                      {s.value.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{s.suffix}</span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-xl p-2.5 ${s.accent}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400" title={s.hint}>
                {s.hint}
              </div>
            </Card>
          )
        })}
      </section>

      {/* Quick actions */}
      <section aria-label="빠른 이동" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((a) => {
          const Icon = a.Icon
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group block rounded-2xl border border-slate-200 bg-white shadow-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="font-semibold text-slate-900 dark:text-slate-50">{a.title}</div>
                <ChevronRight
                  className="ml-auto h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{a.desc}</p>
            </Link>
          )
        })}
      </section>

      {/* Recent activity + Recent tenants */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent audit */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <Activity className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">최근 활동</h2>
            <span className="ml-auto text-xs text-slate-500">최근 8건</span>
          </div>
          {recentAudit.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="text-sm text-slate-500 dark:text-slate-400">기록된 활동이 없습니다.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentAudit.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {row.actorName ?? "시스템"}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {row.action}
                      </span>
                      <span className="truncate text-slate-600 dark:text-slate-400">{row.resource}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {relativeTime(row.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent tenants */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <School className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">최근 등록된 테넌트</h2>
            <Link
              href="/admin/tenants"
              className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-100"
            >
              전체 보기
            </Link>
          </div>
          {recentTenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="text-sm text-slate-500 dark:text-slate-400">등록된 테넌트가 없습니다.</p>
              <Link
                href="/admin/tenants"
                className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                첫 테넌트 만들기 →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTenants.map((t) => {
                const href = t.slug ? `/admin/tenants/${t.slug}` : "/admin/tenants"
                return (
                  <li key={t.id}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">
                        <School className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {t.name}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {t.slug ?? "(슬러그 없음)"} · {formatDate(t.createdAt)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}
