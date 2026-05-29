import { Link } from "@/i18n/navigation"
import { isDemoMode } from "@/lib/auth/auth"

export function DemoBanner() {
  if (!isDemoMode()) return null
  return (
    <div className="bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100">
      <div className="max-w-5xl mx-auto px-4 py-2 text-sm flex items-center justify-between gap-4">
        <span>
          <strong className="font-semibold">DEMO 모드</strong>
          <span className="hidden sm:inline"> · 시드 데이터의 ADMIN 계정으로 자동 로그인된 상태입니다. 실제 이메일·R2 발송은 모의 처리됩니다.</span>
        </span>
        <Link
          href="https://github.com/saintgo7/saas-aed#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-block underline underline-offset-2 hover:text-amber-700"
        >
          문서
        </Link>
      </div>
    </div>
  )
}
