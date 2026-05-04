import NextAuth, { type Session } from "next-auth"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { asc, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      tenantId: string
      departmentId: string | null
      role: "SUPER_ADMIN" | "HQ_ADMIN" | "DEPT_MANAGER" | "INSPECTOR" | "SYSTEM_ADMIN" | "ADMIN"
    }
  }
}

const nextAuth = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, user.email))
          .limit(1)
        if (dbUser[0]) {
          token.sub = dbUser[0].id
          token.tenantId = dbUser[0].tenantId
          token.departmentId = dbUser[0].departmentId ?? null
          token.role = dbUser[0].role
          token.name = dbUser[0].name
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
        session.user.tenantId = token.tenantId as string
        session.user.departmentId = (token.departmentId as string | null) ?? null
        session.user.role = token.role as "SUPER_ADMIN" | "HQ_ADMIN" | "DEPT_MANAGER" | "INSPECTOR" | "SYSTEM_ADMIN" | "ADMIN"
      }
      return session
    }
  },
  trustHost: true
})

export const { handlers, signIn, signOut } = nextAuth

export const isDemoMode = (): boolean => process.env.DEMO_MODE === "true"
// Build-time DB unavailability is already handled by getDemoSession's try/catch.

// Cached demo session — avoids hitting DB on every auth() call in demo mode.
let _demoSession: Session | null = null

async function getDemoSession(): Promise<Session | null> {
  if (_demoSession) return _demoSession
  try {
    const users = await db
      .select()
      .from(schema.users)
      .orderBy(asc(schema.users.createdAt))
      .limit(20)
    // Demo prefers INSPECTOR — limits blast radius vs ADMIN (no device CRUD, no user invites).
    const admin = users.find((u) => u.role === "INSPECTOR") ?? users.find((u) => u.role === "ADMIN") ?? users[0]
    if (!admin) return null
    _demoSession = {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        tenantId: admin.tenantId,
        departmentId: admin.departmentId ?? null,
        role: admin.role
      },
      expires: new Date(Date.now() + 86_400_000).toISOString()
    } as Session
    return _demoSession
  } catch (error) {
    console.warn("[auth] demo session lookup failed", error)
    return null
  }
}

/**
 * Wrapped auth() — short-circuits to a seeded admin when DEMO_MODE=true.
 * Production usage requires DEMO_MODE unset or "false".
 */
export const auth = async (): Promise<Session | null> => {
  if (isDemoMode()) {
    const demo = await getDemoSession()
    if (demo) return demo
  }
  return nextAuth.auth()
}
