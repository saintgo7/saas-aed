import Link from "next/link"
import { redirect } from "next/navigation"
import { isDemoMode } from "@/lib/auth/auth"
import { LoginForm } from "./login-form"

// Force dynamic rendering so the demo-mode redirect runs per-request,
// not at build time. Without this Next.js statically prerenders the page
// and Cloudflare caches the form HTML for s-maxage=31536000 (1 year),
// preventing demo-mode users from being routed to /dashboard.
export const dynamic = "force-dynamic"
export const revalidate = 0

export default function LoginPage() {
  if (isDemoMode()) {
    redirect("/dashboard")
  }
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-brand-800 dark:text-brand-300">
          AED 점검 SaaS
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          이메일로 로그인 링크를 보내드립니다.
        </p>
      </div>

      <LoginForm />

      <p className="text-xs text-center text-slate-500 dark:text-slate-500">
        <Link href="/" className="hover:underline">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  )
}
