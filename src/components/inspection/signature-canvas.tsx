"use client"

import * as React from "react"
import SignaturePad from "signature_pad"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

export interface SignatureCanvasProps {
  onConfirm: (dataUrl: string) => void
  onCancel?: () => void
  fullscreen?: boolean
}

/**
 * Signature pad with proper devicePixelRatio handling.
 *
 * Like writing on a sheet of paper laid over a glass plate — the underlying
 * pixel grid (canvas backing buffer) is denser than the visible CSS box, so
 * we scale the drawing context to keep strokes crisp on retina displays.
 */
export function SignatureCanvas({
  onConfirm,
  onCancel,
  fullscreen = false
}: SignatureCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const padRef = React.useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = React.useState(true)

  // Resize canvas to match container in CSS pixels while honoring DPR.
  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    const pad = padRef.current
    if (!canvas || !pad) return

    const dpr = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // Preserve current strokes across resize.
    const data = pad.toData()

    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.scale(dpr, dpr)
    }

    pad.clear()
    if (data.length > 0) {
      pad.fromData(data)
    }
    setIsEmpty(pad.isEmpty())
  }, [])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,1)",
      penColor: "#0F172A",
      minWidth: 1.2,
      maxWidth: 2.8
    })
    padRef.current = pad

    const handleEnd = () => setIsEmpty(pad.isEmpty())
    pad.addEventListener("endStroke", handleEnd)

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    window.addEventListener("orientationchange", resizeCanvas)

    return () => {
      pad.removeEventListener("endStroke", handleEnd)
      pad.off()
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("orientationchange", resizeCanvas)
      padRef.current = null
    }
  }, [resizeCanvas])

  const handleClear = React.useCallback(() => {
    padRef.current?.clear()
    setIsEmpty(true)
  }, [])

  const handleConfirm = React.useCallback(() => {
    const pad = padRef.current
    if (!pad || pad.isEmpty()) return
    const dataUrl = pad.toDataURL("image/png")
    onConfirm(dataUrl)
  }, [onConfirm])

  return (
    <div
      className={cn(
        "flex flex-col gap-3 bg-white dark:bg-slate-900",
        fullscreen
          ? "fixed inset-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          : "rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
      )}
      role="dialog"
      aria-label="서명 입력"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          서명을 입력해주세요
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          손가락 또는 스타일러스로 서명
        </span>
      </div>

      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white",
          "dark:border-slate-600",
          fullscreen ? "min-h-0" : "h-64"
        )}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          aria-label="서명 캔버스"
        />
        {isEmpty ? (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400"
          >
            여기에 서명해주세요
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onCancel}
          >
            취소
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleClear}
          disabled={isEmpty}
        >
          다시
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={handleConfirm}
          disabled={isEmpty}
        >
          확인
        </Button>
      </div>
    </div>
  )
}
