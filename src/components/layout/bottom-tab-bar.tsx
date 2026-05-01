"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardCheck,
  History,
  Home,
  Settings,
  type LucideIcon
} from "lucide-react"

import { cn } from "@/lib/utils/cn"

interface TabItem {
  href: string
  label: string
  icon: LucideIcon
}

const TABS: readonly TabItem[] = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/devices", label: "장비", icon: ClipboardCheck },
  { href: "/history", label: "이력", icon: History },
  { href: "/settings", label: "설정", icon: Settings }
]

function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export interface BottomTabBarProps extends React.HTMLAttributes<HTMLElement> {}

export function BottomTabBar({ className, ...props }: BottomTabBarProps) {
  const pathname = usePathname() ?? "/"

  return (
    <nav
      aria-label="주요 메뉴"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 h-16 border-t border-slate-200 bg-white md:hidden",
        "pb-[env(safe-area-inset-bottom)]",
        "dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...props}
    >
      <ul className="grid h-full grid-cols-4">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href)
          const Icon = tab.icon
          return (
            <li key={tab.href} className="contents">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className={cn(
                  "flex min-h-touch flex-col items-center justify-center gap-0.5 text-xs font-medium transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  active
                    ? "text-brand-700 dark:text-brand-400"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-6 w-6",
                    active
                      ? "text-brand-700 dark:text-brand-400"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
