"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils/cn"

export interface TopAppBarProps extends React.HTMLAttributes<HTMLElement> {
  title: React.ReactNode
  /**
   * Back-button behavior:
   * - true: render a button that calls router.back()
   * - string: render a Link to the given href
   * - false | undefined: no back button
   */
  back?: boolean | string
  actions?: React.ReactNode
}

export function TopAppBar({
  title,
  back,
  actions,
  className,
  ...props
}: TopAppBarProps) {
  const router = useRouter()

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3",
        "pt-[env(safe-area-inset-top)]",
        "dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...props}
    >
      <div className="flex w-12 shrink-0 items-center justify-start">
        {typeof back === "string" ? (
          <Link
            href={back}
            aria-label="뒤로 가기"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition",
              "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              "dark:text-slate-200 dark:hover:bg-slate-800"
            )}
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        ) : back === true ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로 가기"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition",
              "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              "dark:text-slate-200 dark:hover:bg-slate-800"
            )}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : null}
      </div>
      <h1 className="flex-1 truncate text-center text-base font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </h1>
      <div className="flex w-12 shrink-0 items-center justify-end gap-1">
        {actions}
      </div>
    </header>
  )
}
