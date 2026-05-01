import { notFound, redirect } from "next/navigation"
import { and, eq, desc } from "drizzle-orm"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { db, schema } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InspectionForm } from "@/components/inspection/inspection-form"
import { createInspection } from "@/server/actions/inspections"

export const dynamic = "force-dynamic"

interface PageProps {
  readonly searchParams: { deviceId?: string }
}

export default async function NewInspectionPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const deviceId = searchParams.deviceId
  if (!deviceId) {
    redirect("/devices")
  }

  const tenantId = session.user.tenantId
  const [device] = await withTenant(tenantId).devices().findById(deviceId)
  if (!device) notFound()

  // Auto-fill from previous inspection (most recent for this device).
  const previousRows = await db
    .select({
      items: schema.inspections.items,
      notes: schema.inspections.notes,
      yearMonth: schema.inspections.yearMonth
    })
    .from(schema.inspections)
    .where(
      and(
        eq(schema.inspections.tenantId, tenantId),
        eq(schema.inspections.deviceId, deviceId)
      )
    )
    .orderBy(desc(schema.inspections.yearMonth))
    .limit(1)

  const initialItems = (previousRows[0]?.items ?? null) as
    | Record<string, "OK" | "NG">
    | null

  async function onSubmit(data: {
    deviceId: string
    items: Record<string, "OK" | "NG">
    notes?: string | null
  }): Promise<{ id: string }> {
    "use server"
    const result = await createInspection({
      deviceId: data.deviceId,
      items: data.items as never,
      notes: data.notes ?? null
    })
    redirect(`/inspections/${result.id}/sign`)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          점검 항목 입력
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {device.location} · {device.manufacturer} {device.model}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>장비 정보</CardTitle>
          <CardDescription>S/N {device.serial}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-400">
          <p>패드 교체 예정: {new Date(device.padReplaceAt).toISOString().slice(0, 10)}</p>
          <p>본체 만료: {new Date(device.expiresAt).toISOString().slice(0, 10)}</p>
        </CardContent>
      </Card>

      <InspectionForm
        deviceId={device.id}
        initialItems={initialItems}
        onSubmit={onSubmit}
      />
    </div>
  )
}
