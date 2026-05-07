import * as React from "react"
import { cn } from "@/lib/utils/cn"

interface DataTableProps extends React.HTMLAttributes<HTMLTableElement> {
  caption?: React.ReactNode
}

export function DataTable({ className, children, caption, ...props }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className={cn("min-w-full text-sm", className)} {...props}>
        {caption ? <caption className="caption-top px-4 py-2 text-left text-xs text-slate-500">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </thead>
  )
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition",
        className
      )}
      {...props}
    />
  )
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-3 py-2 text-left font-semibold", className)} {...props} />
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2", className)} {...props} />
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-12 text-center text-slate-400 dark:text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl">∅</span>
          <span className="text-sm">{message}</span>
        </div>
      </td>
    </tr>
  )
}
