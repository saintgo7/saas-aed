import { Link } from "@/i18n/navigation"
import { redirect } from "next/navigation"
import { and, eq, like } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { db, schema } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

interface PageProps {
  readonly searchParams: { deviceId?: string; year?: string }
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tenantId = session.user.tenantId
  const year = searchParams.year ?? String(new Date().getUTCFullYear())
  const deviceId = searchParams.deviceId ?? null

  const devicesList = await withTenant(tenantId).devices().list()

  const conditions = [
    eq(schema.inspections.tenantId, tenantId),
    like(schema.inspections.yearMonth, `${year}-%`)
  ]
  if (deviceId) {
    conditions.push(eq(schema.inspections.deviceId, deviceId))
  }

  const inspectionRows = await db
    .select({
      id: schema.inspections.id,
      deviceId: schema.inspections.deviceId,
      yearMonth: schema.inspections.yearMonth,
      pdfUrl: schema.inspections.pdfUrl,
      emailSentAt: schema.inspections.emailSentAt
    })
    .from(schema.inspections)
    .where(and(...conditions))

  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, "0")}`
  )

  // For 12-cell calendar, mark a month "done" if any device has been inspected
  // (when filtered by device, that device specifically).
  const monthHits = new Map<string, typeof inspectionRows[number]>()
  for (const row of inspectionRows) {
    if (!monthHits.has(row.yearMonth)) monthHits.set(row.yearMonth, row)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          점검 이력
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{year}년</p>
      </header>

      {/* Device filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">장비 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/history?year=${year}`}
              className={`rounded-full px-3 py-1 text-xs ${
                !deviceId
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              전체
            </Link>
            {devicesList.map((device) => (
              <Link
                key={device.id}
                href={`/history?year=${year}&deviceId=${device.id}`}
                className={`rounded-full px-3 py-1 text-xs ${
                  deviceId === device.id
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {device.location}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 12-cell calendar */}
      <Card>
        <CardHeader>
          <CardTitle>월별 점검 현황</CardTitle>
          <CardDescription>
            완료 월 클릭 시 보고서를 다운로드할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {months.map((ym) => {
              const inspection = monthHits.get(ym)
              const label = ym.slice(5)
              if (inspection) {
                return (
                  <Link
                    key={ym}
                    href={`/api/inspections/${inspection.id}/report?fmt=pdf`}
                    className="flex flex-col items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <span className="font-mono text-xs">{ym}</span>
                    <span className="text-lg font-bold">{label}월 ✓</span>
                  </Link>
                )
              }
              return (
                <div
                  key={ym}
                  className="flex flex-col items-center justify-center rounded-xl border border-danger-300 bg-danger-50 px-3 py-3 text-danger-700 dark:border-danger-700 dark:bg-danger-950/40 dark:text-danger-300"
                >
                  <span className="font-mono text-xs">{ym}</span>
                  <span className="text-lg font-bold">{label}월</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
