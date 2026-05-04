import Link from "next/link"
import { notFound } from "next/navigation"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { db, schema } from "@/lib/db"
import { withTenant } from "@/lib/tenant/with-tenant"
import { INSPECTION_ITEMS, type InspectionItems } from "@/lib/inspection/items"
import { getLabels } from "@/lib/documents/i18n"
import { submitInspection } from "@/server/actions/inspections-submit"

export const dynamic = "force-dynamic"

interface PageProps {
  readonly params: { id: string }
  readonly searchParams: { lang?: "ko" | "en" }
}

function formatDateTimeKo(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return "—"
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function formatDate(d: Date | string | null | undefined, locale: "ko" | "en"): string {
  if (!d) return locale === "ko" ? "—" : "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return "—"
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return locale === "ko" ? `${yyyy}년 ${mm}월 ${dd}일` : `${yyyy}-${mm}-${dd}`
}

export default async function InspectionPreviewPage({ params, searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) notFound()

  const locale: "ko" | "en" = searchParams.lang === "en" ? "en" : "ko"
  const t = getLabels(locale)

  const [inspection] = await withTenant(session.user.tenantId).inspections().findById(params.id)
  if (!inspection) notFound()

  const [device] = await withTenant(session.user.tenantId).devices().findById(inspection.deviceId)
  const [inspector] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, inspection.inspectorId))
    .limit(1)
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, session.user.tenantId))
    .limit(1)

  if (!device || !inspector || !org) notFound()

  const items = inspection.items as InspectionItems
  const groupedItems = (group: number) =>
    INSPECTION_ITEMS.filter((item) => item.group === group)

  const ngCount = INSPECTION_ITEMS.filter((item) => items[item.code] === "NG").length

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Action toolbar — hidden when printing */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t.title} 미리보기</h1>
          <p className="text-sm text-slate-500">
            {inspection.yearMonth} · {device.location}
            {ngCount > 0 ? <span className="ml-2 text-danger-600 font-medium">이상 {ngCount}건</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/inspections/${params.id}/report?fmt=docx`}
            className="inline-flex min-h-touch items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            DOCX
          </Link>
          <Link
            href={`/api/inspections/${params.id}/report?fmt=pdf`}
            className="inline-flex min-h-touch items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            PDF
          </Link>
          <Link
            href={`/inspections/${params.id}?lang=${locale === "ko" ? "en" : "ko"}`}
            className="inline-flex min-h-touch items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {locale === "ko" ? "EN" : "한국어"}
          </Link>
          <Link
            href={`/inspections/${params.id}/sign`}
            className="inline-flex min-h-touch items-center rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {inspection.signatureUrl ? "서명 다시" : "서명 추가"}
          </Link>
          <Link
            href={`/inspections/${params.id}/send`}
            className="inline-flex min-h-touch items-center rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            이메일 발송
          </Link>
          {inspection.submittedAt ? (
            <span className="inline-flex min-h-touch items-center rounded-lg bg-success-100 px-3 py-2 text-sm font-medium text-success-800">
              송신 완료 ({formatDateTimeKo(inspection.submittedAt)})
            </span>
          ) : (
            <form
              action={async () => {
                "use server"
                await submitInspection(params.id)
              }}
            >
              <button
                type="submit"
                disabled={
                  !inspection.signatureSha256 ||
                  !(inspection.pdfUrl || inspection.docxUrl)
                }
                className="inline-flex min-h-touch items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  !inspection.signatureSha256 ||
                  !(inspection.pdfUrl || inspection.docxUrl)
                    ? "서명과 리포트 생성을 먼저 완료하세요"
                    : undefined
                }
              >
                총괄 송신
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Report body — print friendly */}
      <article className="bg-white border border-slate-300 print:border-0 rounded-lg p-6 print:p-0 text-slate-900 text-[13px] leading-relaxed">
        <header className="text-center mb-4 print:mb-2">
          <h2 className="text-2xl font-bold tracking-tight">{t.title}</h2>
          <p className="mt-1 text-slate-600 text-sm">
            {org.name} · {t.subtitleYearMonth} {inspection.yearMonth}
          </p>
        </header>

        {/* 장비정보 */}
        <section className="mb-3">
          <h3 className="font-semibold text-slate-700 border-b border-slate-300 pb-1 mb-2">{t.deviceInfo}</h3>
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              <tr>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left w-1/4">{t.manufacturer}</th>
                <td className="border border-slate-300 p-2 w-1/4">{device.manufacturer}</td>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left w-1/4">{t.model}</th>
                <td className="border border-slate-300 p-2 w-1/4">{device.model}</td>
              </tr>
              <tr>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left">{t.serial}</th>
                <td className="border border-slate-300 p-2">{device.serial}</td>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left">{t.manufacturedAt}</th>
                <td className="border border-slate-300 p-2">{formatDate(device.manufacturedAt, locale)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 장비유지기간 */}
        <section className="mb-3">
          <h3 className="font-semibold text-slate-700 border-b border-slate-300 pb-1 mb-2">{t.maintenance}</h3>
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              <tr>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left w-1/3">{t.purchasedAt}</th>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left w-1/3">{t.expiresAt}</th>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left w-1/3">{t.padReplaceAt}</th>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">{formatDate(device.purchasedAt, locale)}</td>
                <td className="border border-slate-300 p-2">{formatDate(device.expiresAt, locale)}</td>
                <td className="border border-slate-300 p-2">{formatDate(device.padReplaceAt, locale)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 설치위치 */}
        <section className="mb-3">
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              <tr>
                <th className="bg-slate-50 border border-slate-300 p-2 text-left w-1/4">{t.location}</th>
                <td className="border border-slate-300 p-2">{device.location}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 점검표 본문 */}
        <section className="mb-3">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="bg-slate-100 border border-slate-300 p-2 w-12">{t.no}</th>
                <th className="bg-slate-100 border border-slate-300 p-2 text-left">{t.item}</th>
                <th className="bg-slate-100 border border-slate-300 p-2 w-20" colSpan={2}>{t.result}</th>
              </tr>
              <tr>
                <th className="bg-slate-50 border border-slate-300 p-2"></th>
                <th className="bg-slate-50 border border-slate-300 p-2"></th>
                <th className="bg-slate-50 border border-slate-300 p-2 text-xs text-danger-700">{t.abnormal}</th>
                <th className="bg-slate-50 border border-slate-300 p-2 text-xs text-success-700">{t.normal}</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 6].map((groupNum) => {
                const groupItems = groupedItems(groupNum)
                if (groupItems.length === 0) return null
                return (
                  <>
                    <tr key={`g${groupNum}-head`}>
                      <td className="border border-slate-300 p-2 text-center font-bold bg-slate-50">{groupNum}</td>
                      <td className="border border-slate-300 p-2 font-semibold bg-slate-50" colSpan={3}>
                        {(t.groupNames as Record<number, string>)[groupNum]}
                      </td>
                    </tr>
                    {groupItems.map((item) => (
                      <tr key={item.code}>
                        <td className="border border-slate-300 p-2"></td>
                        <td className="border border-slate-300 p-2 pl-6">
                          {item.sub} {locale === "ko" ? item.labelKo : item.labelEn}
                          {item.code === "OP_PAD" ? (
                            <div className="text-xs text-slate-500 mt-1">⦁ {t.padReplaceAt}: {formatDate(device.padReplaceAt, locale)}</div>
                          ) : null}
                          {item.code === "OP_BATTERY" ? (
                            <div className="text-xs text-slate-500 mt-1">⦁ {t.batteryReplaceAt}: {formatDate(device.batteryReplaceAt ?? null, locale)}</div>
                          ) : null}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {items[item.code] === "NG" ? <span className="text-danger-600 font-bold text-lg">✓</span> : null}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {items[item.code] === "OK" ? <span className="text-success-600 font-bold text-lg">✓</span> : null}
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })}
              {/* Group 5: 관리자 변경사항 (metadata) */}
              <tr>
                <td className="border border-slate-300 p-2 text-center font-bold bg-slate-50">5</td>
                <td className="border border-slate-300 p-2 font-semibold bg-slate-50">{t.managerChange}</td>
                <td className="border border-slate-300 p-2 text-center text-xs">{t.hasChange}</td>
                <td className="border border-slate-300 p-2 text-center text-xs">{t.noChange}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 비고 */}
        {inspection.notes ? (
          <section className="mb-4 text-[12px]">
            <div className="border border-slate-300 p-3 bg-amber-50">
              <div className="font-semibold text-slate-700 mb-1">{t.notesLabel}</div>
              <div className="text-slate-700 whitespace-pre-wrap">{inspection.notes}</div>
            </div>
          </section>
        ) : null}

        {/* 푸터: 점검일 / 점검자 + 서명 */}
        <footer className="mt-6 pt-3 border-t border-slate-300 flex justify-between items-end text-[12px]">
          <div>
            <div className="text-slate-500">{t.inspectionDate}</div>
            <div className="font-medium">{formatDate(inspection.createdAt, locale)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500">{t.inspector}</div>
            <div className="font-medium">{inspector.name} {t.signature}</div>
            {inspection.signatureUrl ? (
              <img
                src={inspection.signatureUrl}
                alt="signature"
                className="ml-auto mt-2 h-12 w-auto object-contain"
              />
            ) : (
              <div className="mt-2 text-xs text-slate-400 italic">{t.signatureMissing}</div>
            )}
          </div>
        </footer>
      </article>

      {/* Print-friendly stylesheet */}
      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          @page { size: A4; margin: 18mm 16mm; }
        }
      `}</style>
    </div>
  )
}
