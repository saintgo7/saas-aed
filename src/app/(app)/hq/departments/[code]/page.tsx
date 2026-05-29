import { redirect, notFound } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { db, schema } from "@/lib/db"

/**
 * HQ department drill-down — per-department device & inspection status
 * for the current month. Visible only to HQ_ADMIN / SUPER_ADMIN.
 *
 * This is the documented HQ exception to the "no bare db" rule:
 * cross-table joins (departments × users × devices × inspections) require
 * raw drizzle access. Tenant isolation is enforced via explicit
 * `eq(table.tenantId, tenantId)` predicates on every WHERE clause.
 */

interface PageProps {
  readonly params: { readonly code: string }
  readonly searchParams?: { readonly ym?: string }
}

const YM_RE = /^\d{4}-\d{2}$/

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function statusLabel(
  hasInspection: boolean,
  hasDoc: boolean,
  hasSignature: boolean,
  hasSubmit: boolean
): string {
  if (hasSubmit) return "송신"
  if (hasSignature) return "서명"
  if (hasDoc) return "생성"
  if (hasInspection) return "입력"
  return "—"
}

export default async function HqDepartmentDrillDownPage({ params, searchParams }: PageProps) {
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

  const ymRaw = searchParams?.ym
  const yearMonth = ymRaw && YM_RE.test(ymRaw) ? ymRaw : currentYearMonth()

  // 1) Resolve department by (tenantId, code) + manager join
  const deptRows = await db
    .select({
      id: schema.departments.id,
      code: schema.departments.code,
      name: schema.departments.name,
      isHq: schema.departments.isHq,
      deviceQuota: schema.departments.deviceQuota,
      managerName: schema.users.name,
      managerEmail: schema.users.email
    })
    .from(schema.departments)
    .leftJoin(schema.users, eq(schema.users.id, schema.departments.managerUserId))
    .where(
      and(
        eq(schema.departments.tenantId, tenantId),
        eq(schema.departments.code, params.code)
      )
    )
    .limit(1)

  const dept = deptRows[0]
  if (!dept) {
    notFound()
  }

  // 2) Devices in that department with this-month inspection status
  const deviceRows = await db
    .select({
      deviceId: schema.devices.id,
      deviceCode: schema.devices.code,
      manufacturer: schema.devices.manufacturer,
      model: schema.devices.model,
      serial: schema.devices.serial,
      location: schema.devices.location,
      inspectionId: schema.inspections.id,
      docxUrl: schema.inspections.docxUrl,
      pdfUrl: schema.inspections.pdfUrl,
      signatureSha256: schema.inspections.signatureSha256,
      submittedAt: schema.inspections.submittedAt
    })
    .from(schema.devices)
    .leftJoin(
      schema.inspections,
      and(
        eq(schema.inspections.deviceId, schema.devices.id),
        eq(schema.inspections.tenantId, tenantId),
        eq(schema.inspections.yearMonth, yearMonth)
      )
    )
    .where(
      and(
        eq(schema.devices.tenantId, tenantId),
        eq(schema.devices.departmentId, dept.id)
      )
    )
    .orderBy(schema.devices.serial)

  const totals = deviceRows.reduce(
    (acc, r) => ({
      device: acc.device + 1,
      inspection: acc.inspection + (r.inspectionId ? 1 : 0),
      generated: acc.generated + (r.docxUrl ? 1 : 0),
      signed: acc.signed + (r.signatureSha256 ? 1 : 0),
      submitted: acc.submitted + (r.submittedAt ? 1 : 0)
    }),
    { device: 0, inspection: 0, generated: 0, signed: 0, submitted: 0 }
  )

  const exportHref = `/api/hq/departments/${encodeURIComponent(dept.code)}/export?ym=${yearMonth}`

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/hq" className="hover:underline">
              총괄 대시보드
            </Link>
            {" / "}
            {yearMonth}
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            <span className="font-mono text-slate-500">[{dept.code}]</span>{" "}
            {dept.name}
            {dept.isHq ? (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                총괄
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            담당자 {dept.managerName ?? "—"}
            {dept.managerEmail ? ` · ${dept.managerEmail}` : ""} · 장비 정원{" "}
            {dept.deviceQuota}대 · 등록 {totals.device}대 · 송신 {totals.submitted}/
            {totals.device || dept.deviceQuota}건
          </p>
        </div>
        <Link
          href={exportHref}
          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          월별 ZIP 내려받기
        </Link>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left">코드</th>
              <th className="px-3 py-2 text-left">제조사</th>
              <th className="px-3 py-2 text-left">모델</th>
              <th className="px-3 py-2 text-left">시리얼</th>
              <th className="px-3 py-2 text-left">위치</th>
              <th className="px-3 py-2 text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {deviceRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  등록된 장비가 없습니다.
                </td>
              </tr>
            ) : (
              deviceRows.map((r) => {
                const label = statusLabel(
                  r.inspectionId !== null,
                  r.docxUrl !== null,
                  r.signatureSha256 !== null,
                  r.submittedAt !== null
                )
                return (
                  <tr
                    key={r.deviceId}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    <td className="px-3 py-2 font-mono">{r.deviceCode ?? "—"}</td>
                    <td className="px-3 py-2">{r.manufacturer}</td>
                    <td className="px-3 py-2">{r.model}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.serial}</td>
                    <td className="px-3 py-2">{r.location}</td>
                    <td className="px-3 py-2 text-center">{label}</td>
                  </tr>
                )
              })
            )}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-900 font-semibold">
            <tr>
              <td className="px-3 py-2" colSpan={5}>
                합계 ({yearMonth})
              </td>
              <td className="px-3 py-2 text-center">
                {totals.submitted}/{totals.device || dept.deviceQuota}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
