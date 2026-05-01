export default function GlobalLoadingPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12 bg-slate-50"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-2/3 rounded-md bg-brand-100 animate-pulse" />
          <div className="h-4 w-1/2 rounded-md bg-slate-200 animate-pulse" />
        </div>

        <div className="space-y-3">
          <div className="h-12 w-full rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-12 w-full rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-12 w-5/6 rounded-lg bg-slate-200 animate-pulse" />
        </div>

        <p className="text-center text-sm text-slate-500">불러오는 중…</p>
      </div>
    </main>
  )
}
