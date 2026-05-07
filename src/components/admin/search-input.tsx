import * as React from "react"

/**
 * URL-driven search input. Uses GET form action so the parent server
 * component can read the query string. No client JS needed.
 *
 * Usage:
 *   <SearchInput name="q" defaultValue={searchParams.q} placeholder="검색..." />
 *
 * Pages read it via:
 *   const q = (searchParams.q ?? "").toString().trim()
 */
interface Props {
  name?: string
  defaultValue?: string
  placeholder?: string
  /** Extra params to preserve as hidden inputs (e.g., page=1) */
  preserve?: Record<string, string | undefined>
}

export function SearchInput({ name = "q", defaultValue = "", placeholder = "검색...", preserve }: Props) {
  return (
    <form className="flex items-center gap-2 max-w-md" role="search">
      {preserve
        ? Object.entries(preserve)
            .filter(([k, v]) => v && k !== name)
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v as string} />)
        : null}
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-800"
      >
        조회
      </button>
    </form>
  )
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  baseHref: string
  /** preserve other query params */
  query?: Record<string, string | undefined>
}

export function Pagination({ page, pageSize, total, baseHref, query }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v && k !== "page") params.set(k, v)
      }
    }
    params.set("page", String(p))
    return `${baseHref}?${params.toString()}`
  }
  const prev = Math.max(1, page - 1)
  const next = Math.min(totalPages, page + 1)
  return (
    <nav className="flex items-center justify-between text-sm pt-3" aria-label="pagination">
      <span className="text-slate-500">
        {page} / {totalPages} 페이지 · 전체 {total}건
      </span>
      <div className="flex items-center gap-1">
        <a
          href={buildHref(prev)}
          aria-disabled={page <= 1}
          className={`px-3 py-1 rounded-md border ${
            page <= 1
              ? "border-slate-200 text-slate-300 pointer-events-none"
              : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          ←
        </a>
        <a
          href={buildHref(next)}
          aria-disabled={page >= totalPages}
          className={`px-3 py-1 rounded-md border ${
            page >= totalPages
              ? "border-slate-200 text-slate-300 pointer-events-none"
              : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          →
        </a>
      </div>
    </nav>
  )
}

export function StatBadge({
  tone = "slate",
  children
}: {
  tone?: "slate" | "amber" | "green" | "red" | "brand"
  children: React.ReactNode
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    red: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    brand: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300"
  } as const
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
