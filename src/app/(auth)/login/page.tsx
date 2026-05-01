import Link from "next/link"
import { LoginForm } from "./login-form"

export default function LoginPage() {
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
