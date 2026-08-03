import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"

const DEMO_REDIRECT_PATHS = ["/login", "/login/check-email", "/"]
const PUBLIC_PATHS = ["/login", "/login/check-email", "/api/auth", "/api/health", "/api/local-storage", "/_next", "/favicon.ico"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const demoMode = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true"

  // DEMO mode: any visit to /login or / immediately bounces to /dashboard.
  // Doing this at the edge avoids any chance of static prerender serving the
  // login form while DEMO_MODE is on.
  if (demoMode && DEMO_REDIRECT_PATHS.includes(pathname)) {
    const url = new URL("/dashboard", req.url)
    return NextResponse.redirect(url, 307)
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // DEMO MODE: skip auth check on protected paths — pages call auth() in
  // Node runtime which returns the seeded demo session.
  if (demoMode) {
    const res = NextResponse.next()
    res.headers.set("x-demo-mode", "true")
    return res
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
