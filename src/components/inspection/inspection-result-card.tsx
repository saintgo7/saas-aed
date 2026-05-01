import * as React from "react"
import { Download, FileDown, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  INSPECTION_ITEMS,
  type InspectionItemCode,
  type InspectionItemResult,
  type InspectionItems
} from "@/lib/inspection/items"
import { cn } from "@/lib/utils/cn"

export interface InspectionResultCardProps {
  /** YYYY-MM e.g. "2026-05" */
  yearMonth: string
  device: {
    name: string
    location?: string
  }
  inspector: {
    name: string
    email?: string
  }
  items: InspectionItems
  signatureUrl?: string
  inspectedAt: Date | string
  onDownloadDocx?: () => void
  onDownloadPdf?: () => void
  className?: string
}

function formatYearMonth(value: string): string {
  const [y, m] = value.split("-")
  if (!y || !m) return value
  return `${y}년 ${Number(m)}월`
}

function formatDateTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function ResultBadge({ result }: { result: InspectionItemResult }) {
  if (result === "OK") {
    return (
      <Badge variant="success" size="sm" aria-label="정상">
        OK
      </Badge>
    )
  }
  return (
    <Badge variant="danger" size="sm" aria-label="이상">
      NG
    </Badge>
  )
}

export function InspectionResultCard({
  yearMonth,
  device,
  inspector,
  items,
  signatureUrl,
  inspectedAt,
  onDownloadDocx,
  onDownloadPdf,
  className
}: InspectionResultCardProps) {
  const ngCount = INSPECTION_ITEMS.reduce(
    (acc, item) => acc + (items[item.code as InspectionItemCode] === "NG" ? 1 : 0),
    0
  )
  const okCount = INSPECTION_ITEMS.length - ngCount

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{formatYearMonth(yearMonth)} 점검 결과</CardTitle>
            <CardDescription>
              {device.name}
              {device.location ? ` · ${device.location}` : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" size="md" aria-label={`정상 ${okCount}개`}>
              OK {okCount}
            </Badge>
            <Badge
              variant={ngCount > 0 ? "danger" : "neutral"}
              size="md"
              aria-label={`이상 ${ngCount}개`}
            >
              NG {ngCount}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INSPECTION_ITEMS.map((item) => {
            const result = items[item.code as InspectionItemCode]
            return (
              <li
                key={item.code}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2",
                  "dark:border-slate-800 dark:bg-slate-900",
                  result === "NG" &&
                    "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
                )}
              >
                <span className="truncate text-sm text-slate-800 dark:text-slate-200">
                  {item.labelKo}
                </span>
                {result ? <ResultBadge result={result} /> : (
                  <Badge variant="neutral" size="sm">미기록</Badge>
                )}
              </li>
            )
          })}
        </ul>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              점검자
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {inspector.name}
            </span>
            {inspector.email ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {inspector.email}
              </span>
            ) : null}
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatDateTime(inspectedAt)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              서명
            </span>
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt={`${inspector.name} 서명`}
                className="h-20 w-full max-w-[240px] rounded-lg border border-slate-200 bg-white object-contain dark:border-slate-700"
              />
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                서명 없음
              </span>
            )}
          </div>
        </div>
      </CardContent>

      {(onDownloadDocx || onDownloadPdf) && (
        <CardFooter className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
          {onDownloadDocx ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onDownloadDocx}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              DOCX 다운로드
            </Button>
          ) : null}
          {onDownloadPdf ? (
            <Button
              type="button"
              variant="default"
              size="md"
              onClick={onDownloadPdf}
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              PDF 다운로드
            </Button>
          ) : null}
          {!onDownloadDocx && !onDownloadPdf ? (
            <Button type="button" variant="outline" size="md" disabled>
              <Download className="h-4 w-4" aria-hidden="true" />
              다운로드 준비 중
            </Button>
          ) : null}
        </CardFooter>
      )}
    </Card>
  )
}
