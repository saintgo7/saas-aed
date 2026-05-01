import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { and, eq, gte } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { db, schema } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

interface PageProps {
  readonly params: { id: string }
}

function past12Months(now: Date = new Date()): readonly string[] {
  const months: string[] = []
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, "0")
    months.push(`${y}-${m}`)
  }
  return months.reverse()
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tenantId = session.user.tenantId
  const [device] = await withTenant(tenantId).devices().findById(params.id)
  if (!device) notFound()

  const months = past12Months()
  const startMonth = months[0]
  const inspectionRows = await db
    .select({
      id: schema.inspections.id,
      yearMonth: schema.inspections.yearMonth,
      pdfUrl: schema.inspections.pdfUrl
    })
    .from(schema.inspections)
    .where(
      and(
        eq(schema.inspections.tenantId, tenantId),
        eq(schema.inspections.deviceId, params.id),
        gte(schema.inspections.yearMonth, startMonth)
      )
    )

  const byMonth = new Map(inspectionRows.map((r) => [r.yearMonth, r]))

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/devices"
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← 장비 목록
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {device.location}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {device.manufacturer} {device.model} · S/N {device.serial}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>장비 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="제조일" value={fmtDate(device.manufacturedAt)} />
          <Detail label="구매일" value={fmtDate(device.purchasedAt)} />
          <Detail label="본체 만료" value={fmtDate(device.expiresAt)} />
          <Detail label="패드 교체" value={fmtDate(device.padReplaceAt)} />
          <Detail label="배터리 교체" value={fmtDate(device.batteryReplaceAt)} />
          <Detail label="24시간" value={device.available24h ? "가능" : "불가"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 12개월 점검 이력</CardTitle>
          <CardDescription>완료 월 클릭 시 보고서 다운로드</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {months.map((ym) => {
              const inspection = byMonth.get(ym)
              const done = Boolean(inspection)
              return (
                <MonthCell key={ym} yearMonth={ym} done={done} inspectionId={inspection?.id} />
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Link href={`/inspections/new?deviceId=${device.id}`} className="block">
        <Button size="lg" fullWidth>
          이 장비 점검하기
        </Button>
      </Link>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}

function MonthCell({
  yearMonth,
  done,
  inspectionId
}: {
  yearMonth: string
  done: boolean
  inspectionId?: string
}) {
  const label = yearMonth.slice(5)
  const baseClass =
    "flex flex-col items-center justify-center rounded-xl border px-3 py-3 text-center text-sm"

  if (done && inspectionId) {
    return (
      <Link
        href={`/api/inspections/${inspectionId}/report?fmt=pdf`}
        className={`${baseClass} border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300`}
      >
        <span className="font-mono text-xs">{yearMonth}</span>
        <span className="text-lg font-bold">{label}월 ✓</span>
      </Link>
    )
  }
  return (
    <div
      className={`${baseClass} border-danger-300 bg-danger-50 text-danger-700 dark:border-danger-700 dark:bg-danger-950/40 dark:text-danger-300`}
    >
      <span className="font-mono text-xs">{yearMonth}</span>
      <span className="text-lg font-bold">{label}월</span>
    </div>
  )
}

function fmtDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10)
}
