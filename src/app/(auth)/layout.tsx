import type { ReactNode } from "react"

/**
 * Auth route group layout — centered single-column for login flows.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}
