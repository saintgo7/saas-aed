import { Link } from "@/i18n/navigation"
import { redirect } from "next/navigation"
import { and, eq, isNotNull } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { scopeForUser } from "@/lib/tenant/scope-for-user"
import { db, schema } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function currentYearMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tenantId = session.user.tenantId
  const role = session.user.role
  const scope = scopeForUser(session.user)

  const yearMonth = currentYearMonth()
  const today = new Date()
  const d30 = addDays(today, 30)

  const [devicesList, monthInspections, departmentRow] = await Promise.all([
    scope.devices().list(),
    db
      .select({
        id: schema.inspections.id,
        deviceId: schema.inspections.deviceId
      })
      .from(schema.inspections)
      .where(
        and(
          eq(schema.inspections.tenantId, tenantId),
          eq(schema.inspections.yearMonth, yearMonth)
        )
      ),
    session.user.departmentId
      ? db
          .select({
            id: schema.departments.id,
            code: schema.departments.code,
            name: schema.departments.name,
            deviceQuota: schema.departments.deviceQuota
          })
          .from(schema.departments)
          .where(
            and(
              eq(schema.departments.tenantId, tenantId),
              eq(schema.departments.id, session.user.departmentId)
            )
          )
          .limit(1)
      : Promise.resolve([])
  ])

  const deviceIdsInScope = new Set(devicesList.map((d) => d.id))
  const inspectedIdsInScope = new Set(
    monthInspections
      .filter((i) => deviceIdsInScope.has(i.deviceId))
      .map((i) => i.deviceId)
  )
  const missingDevices = devicesList.filter((d) => !inspectedIdsInScope.has(d.id))
  const completedCount = inspectedIdsInScope.size

  const padExpiring = devicesList.filter((d) => {
    const t = new Date(d.padReplaceAt).getTime()
    return t >= today.getTime() && t <= d30.getTime()
  })

  const department = departmentRow[0] ?? null
  // Department banner "N/M": N = inspections submitted (송신) this month for devices in scope.
  let submittedCount = 0
  if (department) {
    const submittedRows = await db
      .select({ deviceId: schema.inspections.deviceId })
      .from(schema.inspections)
      .where(
        and(
          eq(schema.inspections.tenantId, tenantId),
          eq(schema.inspections.yearMonth, yearMonth),
          isNotNull(schema.inspections.submittedAt)
        )
      )
    submittedCount = submittedRows.filter((r) => deviceIdsInScope.has(r.deviceId)).length
  }

  return (
    <div className="space-y-6">
      {department ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-950">
          <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">
            소속 부서
          </p>
          <p className="mt-0.5 text-sm font-semibold text-brand-900 dark:text-brand-100">
            {department.code} {department.name}
            <span className="ml-2 text-brand-700 dark:text-brand-300 font-normal">
              — 이번달 {submittedCount}/{devicesList.length}건 송신
            </span>
          </p>
        </div>
      ) : null}

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {yearMonth} 점검
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          안녕하세요, {session.user.name}님
        </h1>
      </header>

      {/* Primary CTA */}
      <Link
        href={
          missingDevices[0]
            ? `/inspections/new?deviceId=${missingDevices[0].id}`
            : "/devices"
        }
        className="block"
      >
        <Button size="xl" fullWidth>
          이번 달 점검 시작
        </Button>
      </Link>

      {/* Missed devices */}
      {missingDevices.length > 0 ? (
        <Card className="border-danger-300 dark:border-danger-700">
          <CardHeader>
            <CardTitle className="text-danger-600 dark:text-danger-500">
              미점검 장비 {missingDevices.length}대
            </CardTitle>
            <CardDescription>
              아래 장비는 이번 달 점검이 완료되지 않았습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingDevices.slice(0, 5).map((device) => (
              <Link
                key={device.id}
                href={`/inspections/new?deviceId=${device.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    {device.location}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {device.manufacturer} · {device.model} · {device.serial}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                  점검 →
                </span>
              </Link>
            ))}
            {missingDevices.length > 5 ? (
              <Link
                href="/devices"
                className="block text-center text-sm text-brand-700 dark:text-brand-400 hover:underline pt-2"
              >
                전체 {missingDevices.length}대 보기
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Pad expiry alert */}
      {padExpiring.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>패드 교체 임박 ({padExpiring.length}대)</CardTitle>
            <CardDescription>
              30일 이내 패드 교체 예정인 장비입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {padExpiring.map((device) => (
              <Link
                key={device.id}
                href={`/devices/${device.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <span className="font-medium">{device.location}</span>
                <span className="text-xs text-slate-500">
                  {new Date(device.padReplaceAt).toISOString().slice(0, 10)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Admin-only stats */}
      {role === "ADMIN" || role === "SYSTEM_ADMIN" ? (
        <div className="grid gap-4 grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{completedCount}</CardTitle>
              <CardDescription>이번 달 완료</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{devicesList.length}</CardTitle>
              <CardDescription>등록 장비</CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {completedCount} / {devicesList.length}
            </CardTitle>
            <CardDescription>이번 달 점검 진행률</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
