import * as React from "react"

import { cn } from "@/lib/utils/cn"

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "neutral"

export type BadgeSize = "sm" | "md"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200",
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  danger:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  neutral:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: "h-5 px-2 text-xs",
  md: "h-6 px-2.5 text-sm"
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    { className, variant = "default", size = "sm", ...props },
    ref
  ) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-semibold",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    )
  }
)

export interface DDayBadgeProps extends Omit<BadgeProps, "variant"> {
  /** Days remaining until the deadline (negative = overdue). */
  days: number
}

/**
 * Returns the visual variant for a D-day countdown.
 * - <= 7 days  → danger (red)
 * - <= 30 days → warning (amber)
 * - <= 90 days → neutral (slate)
 * - > 90 days  → neutral (slate, less urgent)
 */
export function getDDayVariant(days: number): BadgeVariant {
  if (days <= 7) return "danger"
  if (days <= 30) return "warning"
  return "neutral"
}

function formatDDayLabel(days: number): string {
  if (days === 0) return "D-Day"
  if (days < 0) return `D+${Math.abs(days)}`
  return `D-${days}`
}

export const DDayBadge = React.forwardRef<HTMLSpanElement, DDayBadgeProps>(
  function DDayBadge({ days, ...props }, ref) {
    return (
      <Badge ref={ref} variant={getDDayVariant(days)} {...props}>
        {formatDDayLabel(days)}
      </Badge>
    )
  }
)
