import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sendInspection } from "@/server/actions/inspections"

export const dynamic = "force-dynamic"

interface PageProps {
  readonly params: { id: string }
}

export default async function SendInspectionPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [inspection] = await withTenant(session.user.tenantId)
    .inspections()
    .findById(params.id)
  if (!inspection) notFound()

  const alreadySent = Boolean(inspection.emailSentAt)

  async function onSend(): Promise<void> {
    "use server"
    await sendInspection(params.id)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          보고서 발송
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          점검 보고서를 미리 확인한 뒤 이메일로 발송할 수 있습니다.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>보고서 미리보기</CardTitle>
          <CardDescription>
            브라우저에서 미리 확인하거나 DOCX/PDF로 다운로드.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href={`/inspections/${params.id}`}
            className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/40"
          >
            <span className="font-medium text-brand-800 dark:text-brand-200">웹 미리보기 (HWPX 양식)</span>
            <span className="text-brand-700 dark:text-brand-300">→</span>
          </a>
          <a
            href={`/api/inspections/${params.id}/report?fmt=pdf`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="font-medium">PDF 다운로드</span>
            <span className="text-brand-700 dark:text-brand-400">→</span>
          </a>
          <a
            href={`/api/inspections/${params.id}/report?fmt=docx`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <span className="font-medium">DOCX 다운로드</span>
            <span className="text-brand-700 dark:text-brand-400">→</span>
          </a>
        </CardContent>
      </Card>

      {alreadySent ? (
        <Card className="border-emerald-300 dark:border-emerald-700">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-2xl">✓</p>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              이미 발송되었습니다
            </p>
            <p className="text-xs text-slate-500">
              {new Date(inspection.emailSentAt!).toISOString().slice(0, 16).replace("T", " ")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <form action={onSend}>
          <Button type="submit" size="xl" fullWidth>
            이메일로 발송하기
          </Button>
        </form>
      )}
    </div>
  )
}
