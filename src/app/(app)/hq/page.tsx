import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth/auth"
import { db, schema } from "@/lib/db"
import { and, eq, sql } from "drizzle-orm"

/**
 * HQ overall dashboard — 28×status matrix for the current month.
 * Visible only to HQ_ADMIN / SUPER_ADMIN. Wireframe: aggregates raw counts;
 * styling and drill-down come in P14.
 */
export default async function HqPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  const role = session.user.role
  if (role !== "HQ_ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard")
  }
  const tenantId = session.user.tenantId
  if (!tenantId) {
    redirect("/login")
  }

  const yearMonth = new Date().toISOString().slice(0, 7)

  const rows = await db
    .select({
      deptId: schema.departments.id,
      code: schema.departments.code,
      name: schema.departments.name,
      isHq: schema.departments.isHq,
      quota: schema.departments.deviceQuota,
      sortOrder: schema.departments.sortOrder,
      deviceCount: sql<number>`count(distinct ${schema.devices.id})::int`,
      inspectionCount: sql<number>`count(distinct ${schema.inspections.id})::int`,
      generatedCount: sql<number>`count(distinct ${schema.inspections.id}) filter (where ${schema.inspections.docxUrl} is not null)::int`,
      signedCount: sql<number>`count(distinct ${schema.inspections.id}) filter (where ${schema.inspections.signatureSha256} is not null)::int`,
      submittedCount: sql<number>`count(distinct ${schema.inspections.id}) filter (where ${schema.inspections.submittedAt} is not null)::int`
    })
    .from(schema.departments)
    .leftJoin(schema.devices, eq(schema.devices.departmentId, schema.departments.id))
    .leftJoin(
      schema.inspections,
      and(
        eq(schema.inspections.deviceId, schema.devices.id),
        eq(schema.inspections.yearMonth, yearMonth)
      )
    )
    .where(eq(schema.departments.tenantId, tenantId))
    .groupBy(
      schema.departments.id,
      schema.departments.code,
      schema.departments.name,
      schema.departments.isHq,
      schema.departments.deviceQuota,
      schema.departments.sortOrder
    )
    .orderBy(schema.departments.sortOrder)

  const totals = rows.reduce(
    (acc, r) => ({
      quota: acc.quota + r.quota,
      device: acc.device + r.deviceCount,
      inspection: acc.inspection + r.inspectionCount,
      generated: acc.generated + r.generatedCount,
      signed: acc.signed + r.signedCount,
      submitted: acc.submitted + r.submittedCount
    }),
    { quota: 0, device: 0, inspection: 0, generated: 0, signed: 0, submitted: 0 }
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">총괄 대시보드 — {yearMonth}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {rows.length}개 부서 · 등록 장비 {totals.device}/{totals.quota}대 · 송신 {totals.submitted}/{totals.device}건
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left">코드</th>
              <th className="px-3 py-2 text-left">부서</th>
              <th className="px-3 py-2 text-right">장비</th>
              <th className="px-3 py-2 text-right">입력</th>
              <th className="px-3 py-2 text-right">생성</th>
              <th className="px-3 py-2 text-right">서명</th>
              <th className="px-3 py-2 text-right">송신</th>
              <th className="px-3 py-2 text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const submitOk = r.deviceCount > 0 && r.submittedCount === r.deviceCount
              const submitPartial = r.submittedCount > 0 && !submitOk
              const status = submitOk ? "✅" : submitPartial ? "⏳" : "—"
              return (
                <tr
                  key={r.deptId}
                  className={`border-t border-slate-200 dark:border-slate-800 ${r.isHq ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}
                >
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/hq/departments/${r.code}`} className="hover:underline">
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {r.name}
                    {r.isHq ? <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">총괄</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.deviceCount}/{r.quota}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.inspectionCount}/{r.deviceCount || r.quota}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.generatedCount}/{r.deviceCount || r.quota}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.signedCount}/{r.deviceCount || r.quota}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.submittedCount}/{r.deviceCount || r.quota}
                  </td>
                  <td className="px-3 py-2 text-center">{status}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-900 font-semibold">
            <tr>
              <td className="px-3 py-2" colSpan={2}>
                합계
              </td>
              <td className="px-3 py-2 text-right">
                {totals.device}/{totals.quota}
              </td>
              <td className="px-3 py-2 text-right">{totals.inspection}</td>
              <td className="px-3 py-2 text-right">{totals.generated}</td>
              <td className="px-3 py-2 text-right">{totals.signed}</td>
              <td className="px-3 py-2 text-right">{totals.submitted}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
