import { Link } from "@/i18n/navigation"

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-slate-50">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            404
          </p>
          <h1 className="text-3xl font-bold text-brand-800">
            페이지를 찾을 수 없어요
          </h1>
          <p className="text-slate-600">
            주소가 변경되었거나 더 이상 존재하지 않는 페이지일 수 있어요.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="min-h-touch w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-brand-700 px-6 py-3 text-white font-semibold hover:bg-brand-800 transition"
          >
            홈으로
          </Link>
          <Link
            href="/login"
            className="min-h-touch w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-brand-700 px-6 py-3 text-brand-700 font-semibold hover:bg-brand-50 transition"
          >
            로그인 화면
          </Link>
        </div>
      </div>
    </main>
  )
}
