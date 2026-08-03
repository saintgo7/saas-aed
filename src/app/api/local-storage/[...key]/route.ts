import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { readLocalObject } from "@/lib/storage/local"

// Serves objects written by the local storage adapter. Demo/dev only.
// Production should never hit this — storage switches to R2 when configured.
export async function GET(
  _req: Request,
  context: { params: { key: string[] } }
) {
  // Signatures/reports are tenant-scoped PHI — require an authenticated session
  // and enforce that the requested key belongs to the caller's tenant.
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const key = context.params.key.join("/")
  // Keys are namespaced as `tenants/{tenantId}/...`; block cross-tenant reads.
  if (!key.startsWith(`tenants/${session.user.tenantId}/`)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const obj = await readLocalObject(key)
  if (!obj) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }
  return new NextResponse(obj.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": obj.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300"
    }
  })
}

export const dynamic = "force-dynamic"
