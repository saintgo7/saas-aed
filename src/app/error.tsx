"use client"

import Link from "next/link"
import { useEffect } from "react"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-slate-50">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-danger-600">
            오류
          </p>
          <h1 className="text-3xl font-bold text-brand-800">
            문제가 발생했습니다
          </h1>
          <p className="text-slate-600">
            요청을 처리하는 중 예기치 못한 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
          </p>
        </div>

        {error.digest ? (
          <p className="text-xs text-slate-500">
            오류 코드: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-touch w-full sm:w-auto rounded-lg bg-brand-700 px-6 py-3 text-white font-semibold hover:bg-brand-800 transition"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="min-h-touch w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-brand-700 px-6 py-3 text-brand-700 font-semibold hover:bg-brand-50 transition"
          >
            홈으로
          </Link>
        </div>
      </div>
    </main>
  )
}
