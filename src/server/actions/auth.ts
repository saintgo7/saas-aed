"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { signIn, signOut, isDemoMode } from "@/lib/auth/auth"

const emailSchema = z.string().email("올바른 이메일 형식이 아닙니다.")

/**
 * Sends a magic-link email via Auth.js Resend provider.
 * Auth.js will redirect the user to /login/check-email on success.
 *
 * In DEMO mode the user is already auto-authenticated via the seeded
 * session — bypass Resend entirely and route straight to /dashboard.
 */
export async function requestMagicLink(formData: FormData): Promise<void> {
  if (isDemoMode()) {
    redirect("/dashboard")
  }

  const raw = formData.get("email")
  let email: string
  try {
    email = emailSchema.parse(raw)
  } catch (error) {
    console.error("[auth] requestMagicLink validation failed", { error })
    throw new Error("올바른 이메일 주소를 입력해 주세요.")
  }

  try {
    await signIn("resend", {
      email,
      redirectTo: "/dashboard"
    })
  } catch (error) {
    // Auth.js re-throws redirect errors — let those propagate.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
    console.error("[auth] requestMagicLink failed", { email, error })
    throw new Error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.")
  }
}

/**
 * Signs the user out and returns to the login page.
 * In DEMO mode just round-trips back to /dashboard since auth is bypassed.
 */
export async function signOutAction(): Promise<void> {
  if (isDemoMode()) {
    redirect("/dashboard")
  }
  try {
    await signOut({ redirect: false })
  } catch (error) {
    console.error("[auth] signOut failed", { error })
    throw new Error("로그아웃 처리 중 오류가 발생했습니다.")
  }
  redirect("/login")
}
