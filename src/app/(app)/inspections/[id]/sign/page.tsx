import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SignatureCanvas } from "@/components/inspection/signature-canvas"
import { attachSignature } from "@/server/actions/inspections"

export const dynamic = "force-dynamic"

interface PageProps {
  readonly params: { id: string }
}

export default async function SignInspectionPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [inspection] = await withTenant(session.user.tenantId)
    .inspections()
    .findById(params.id)
  if (!inspection) notFound()

  async function onConfirm(dataUrl: string): Promise<void> {
    "use server"
    await attachSignature(params.id, dataUrl)
    redirect(`/inspections/${params.id}/send`)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          서명
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          점검 결과를 확인하고 서명해 주세요.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>점검자 서명</CardTitle>
          <CardDescription>
            손가락 또는 스타일러스로 아래 영역에 서명해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureCanvas onConfirm={onConfirm} />
        </CardContent>
      </Card>
    </div>
  )
}
