import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/auth"
import { scopeForUser } from "@/lib/tenant/scope-for-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function DevicesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SYSTEM_ADMIN"
  const devicesList = await scopeForUser(session.user).devices().list()

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            장비 목록
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {devicesList.length}대 등록됨
          </p>
        </div>
        {isAdmin ? (
          <Link href="/devices/new">
            <Button size="md">장비 추가</Button>
          </Link>
        ) : null}
      </header>

      {devicesList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              등록된 장비가 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {devicesList.map((device) => (
            <Link key={device.id} href={`/devices/${device.id}`} className="block">
              <Card className="hover:border-brand-400 transition-colors">
                <CardHeader>
                  <CardTitle>{device.location}</CardTitle>
                  <CardDescription>
                    {device.manufacturer} {device.model}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p>S/N: {device.serial}</p>
                  <p>
                    패드 교체 예정:{" "}
                    {new Date(device.padReplaceAt).toISOString().slice(0, 10)}
                  </p>
                  <p>
                    본체 만료:{" "}
                    {new Date(device.expiresAt).toISOString().slice(0, 10)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
