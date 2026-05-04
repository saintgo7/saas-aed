import { redirect } from "next/navigation"
import type { Session } from "next-auth"
import { auth } from "./auth"

export type Role =
  | "SUPER_ADMIN"
  | "HQ_ADMIN"
  | "DEPT_MANAGER"
  | "INSPECTOR"
  | "SYSTEM_ADMIN"
  | "ADMIN"

/**
 * Auth gate for role-protected pages/actions.
 * - No session → /login
 * - Session role not in `allowed` → /dashboard
 * - Otherwise returns the session.
 */
export async function requireRole(allowed: ReadonlyArray<Role>): Promise<Session> {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  if (!allowed.includes(session.user.role)) {
    redirect("/dashboard")
  }
  return session
}
