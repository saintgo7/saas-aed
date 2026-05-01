"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
  INSPECTION_ITEMS,
  inspectionItemsSchema,
  isInspectionComplete,
  type InspectionItemCode,
  type InspectionItemResult,
  type InspectionItems
} from "@/lib/inspection/items"
import { cn } from "@/lib/utils/cn"

const CATEGORY_LABEL: Record<string, string> = {
  OPERATION: "본체 작동",
  BOX: "보관함",
  LOCATION: "위치",
  DOCS: "기록물",
  ACCESS: "접근성"
}

export interface InspectionDevice {
  id: string
  name: string
  location?: string
}

export interface InspectionFormValues {
  items: InspectionItems
  notes: string
}

export interface InspectionFormProps {
  device: InspectionDevice
  defaultValues?: {
    items?: Partial<InspectionItems>
    notes?: string
  }
  onSubmit: (data: InspectionFormValues) => Promise<void>
  /** Optional toast hook used when validation fails. */
  onValidationError?: (message: string) => void
}

type ItemsState = Partial<Record<InspectionItemCode, InspectionItemResult>>

export function InspectionForm({
  device,
  defaultValues,
  onSubmit,
  onValidationError
}: InspectionFormProps) {
  const [items, setItems] = React.useState<ItemsState>(
    () => ({ ...(defaultValues?.items ?? {}) })
  )
  const [notes, setNotes] = React.useState<string>(defaultValues?.notes ?? "")
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const complete = isInspectionComplete(items)
  const remaining = INSPECTION_ITEMS.filter(
    (it) => items[it.code] !== "OK" && items[it.code] !== "NG"
  ).length

  const handleSelect = React.useCallback(
    (code: InspectionItemCode, result: InspectionItemResult) => {
      setItems((prev) => ({ ...prev, [code]: result }))
    },
    []
  )

  const handleAllOk = React.useCallback(() => {
    const allOk = INSPECTION_ITEMS.reduce<ItemsState>((acc, item) => {
      return { ...acc, [item.code]: "OK" as InspectionItemResult }
    }, {})
    setItems(allOk)
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!complete) {
      const message = `미선택 항목이 ${remaining}개 있습니다. 모든 항목을 선택해주세요.`
      setErrorMessage(message)
      onValidationError?.(message)
      return
    }

    const parsed = inspectionItemsSchema.safeParse(items)
    if (!parsed.success) {
      const message = "점검 항목 데이터가 올바르지 않습니다."
      setErrorMessage(message)
      onValidationError?.(message)
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage(null)
      await onSubmit({ items: parsed.data, notes: notes.trim() })
    } catch (error) {
      console.error("Inspection submit failed:", error)
      const message =
        error instanceof Error
          ? error.message
          : "점검 제출 중 오류가 발생했습니다."
      setErrorMessage(message)
      onValidationError?.(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Group items by category preserving original order.
  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof INSPECTION_ITEMS[number][]>()
    for (const item of INSPECTION_ITEMS) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return Array.from(map.entries())
  }, [])

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{device.name}</CardTitle>
            {device.location ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {device.location}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAllOk}
          >
            <CheckCircle2 className="h-4 w-4" />
            이상없음 일괄 적용
          </Button>
        </CardHeader>
      </Card>

      {grouped.map(([category, list]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {CATEGORY_LABEL[category] ?? category}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {list.map((item) => {
              const value = items[item.code]
              return (
                <div
                  key={item.code}
                  className="flex flex-col gap-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800"
                >
                  <Label
                    id={`label-${item.code}`}
                    className="text-base font-semibold text-slate-900 dark:text-slate-50"
                  >
                    {item.labelKo}
                  </Label>
                  <RadioGroup
                    variant="card"
                    aria-labelledby={`label-${item.code}`}
                    value={value}
                    onValueChange={(next) =>
                      handleSelect(item.code, next as InspectionItemResult)
                    }
                    className="grid grid-cols-2 gap-2"
                  >
                    <RadioGroupItem
                      value="OK"
                      label={
                        <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-5 w-5" />
                          정상 (OK)
                        </span>
                      }
                    />
                    <RadioGroupItem
                      value="NG"
                      label={
                        <span className="flex items-center gap-2 text-red-700 dark:text-red-300">
                          <AlertTriangle className="h-5 w-5" />
                          이상 (NG)
                        </span>
                      }
                    />
                  </RadioGroup>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            비고
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="추가로 기록할 내용이 있으면 작성하세요."
            rows={4}
            maxLength={1000}
          />
        </CardContent>
      </Card>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}

      <div
        className={cn(
          "sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 p-4 backdrop-blur",
          "pb-[calc(1rem+env(safe-area-inset-bottom))]",
          "dark:border-slate-800 dark:bg-slate-900/95"
        )}
      >
        <Button
          type="submit"
          size="xl"
          fullWidth
          loading={submitting}
          disabled={!complete || submitting}
        >
          {complete
            ? "점검 결과 제출"
            : `미선택 ${remaining}개 항목 남음`}
        </Button>
      </div>
    </form>
  )
}
