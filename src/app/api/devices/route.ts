import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"
import { createDevice } from "@/server/actions/devices"

export const dynamic = "force-dynamic"

/**
 * GET /api/devices — list devices for the caller's tenant.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  try {
    const list = await withTenant(session.user.tenantId).devices().list()
    return NextResponse.json({ devices: list })
  } catch (error) {
    console.error("[api] devices list failed", { error })
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

/**
 * POST /api/devices — create a new device. ADMIN-only.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  try {
    const result = await createDevice(body as Parameters<typeof createDevice>[0])
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "장비 등록에 실패했습니다."
    console.error("[api] devices create failed", { error })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
