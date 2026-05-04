import Link from "next/link"
import { sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { requireRole } from "@/lib/auth/require-role"

interface CountRow {
  count: number
}

async function countRows(table: typeof schema.organizations | typeof schema.departments | typeof schema.users): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(table)
  const first = rows[0] as CountRow | undefined
  return first?.count ?? 0
}

/**
 * /admin — SUPER_ADMIN landing.
 * Shows tenant/department/user totals and entry-points to admin sub-pages.
 */
export default async function AdminIndexPage() {
  await requireRole(["SUPER_ADMIN"])

  const [orgCount, deptCount, userCount] = await Promise.all([
    countRows(schema.organizations),
    countRows(schema.departments),
    countRows(schema.users)
  ])

  const cards: ReadonlyArray<{
    href: string
    title: string
    desc: string
    metric: string
  }> = [
    {
      href: "/admin/tenants",
      title: "테넌트 정보",
      desc: "조직(테넌트) 목록과 요약",
      metric: `${orgCount}개`
    },
    {
      href: "/admin/departments",
      title: "부서 관리",
      desc: "테넌트별 부서/관리자 배정",
      metric: `${deptCount}개`
    },
    {
      href: "/admin/users",
      title: "사용자 관리",
      desc: "사용자 초대 및 역할 부여",
      metric: `${userCount}명`
    }
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">관리자 콘솔</h1>
        <p className="text-sm text-slate-500 mt-1">SUPER_ADMIN 전용 — 테넌트/부서/사용자 운영</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500">{c.title}</div>
            <div className="mt-2 text-2xl font-semibold">{c.metric}</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
