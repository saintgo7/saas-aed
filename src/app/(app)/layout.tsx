import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/auth"
import { TopAppBar } from "@/components/layout/top-app-bar"
import { BottomTabBar } from "@/components/layout/bottom-tab-bar"

/**
 * App route group layout — authenticated shell with TopAppBar + BottomTabBar.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <TopAppBar title="AED 점검 SaaS" />
      <main className="flex-1 pb-20 md:pb-6">
        <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
      </main>
      <BottomTabBar />
    </div>
  )
}
