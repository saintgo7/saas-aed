import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"

const PUBLIC_PATHS = ["/login", "/login/check-email", "/api/auth", "/api/health", "/_next", "/favicon.ico"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = await auth()
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!session.user.tenantId) {
    return NextResponse.json({ error: "TENANT_MISSING" }, { status: 403 })
  }

  const res = NextResponse.next()
  res.headers.set("x-tenant-id", session.user.tenantId)
  res.headers.set("x-user-role", session.user.role)
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
}
