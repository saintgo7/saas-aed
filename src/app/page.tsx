import Link from "next/link"
import { redirect } from "next/navigation"
import { isDemoMode } from "@/lib/auth/auth"

export default function HomePage() {
  if (isDemoMode()) {
    redirect("/dashboard")
  }
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-brand-800">AED 점검 SaaS</h1>
        <p className="text-slate-600">자동심장충격기 월간 점검 — 입력·서명·발송·보존 4단계</p>
        <Link
          href="/login"
          className="inline-block min-h-touch w-full rounded-lg bg-brand-700 px-6 py-4 text-white text-lg font-semibold hover:bg-brand-800 transition"
        >
          로그인
        </Link>
        <p className="text-xs text-slate-500">
          DEMO_MODE=true 환경변수로 로그인 없이 데모 사용 가능
        </p>
      </div>
    </main>
  )
}
