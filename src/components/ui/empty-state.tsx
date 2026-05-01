import * as React from "react"

import { cn } from "@/lib/utils/cn"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    { className, icon, title, description, action, ...props },
    ref
  ) {
    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center",
          "dark:border-slate-800 dark:bg-slate-900",
          className
        )}
        {...props}
      >
        {icon ? (
          <div
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            {icon}
          </div>
        ) : null}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </h3>
        {description ? (
          <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    )
  }
)
