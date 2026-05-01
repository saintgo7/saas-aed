"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils/cn"

export type ButtonVariant =
  | "default"
  | "secondary"
  | "danger"
  | "ghost"
  | "outline"
  | "link"

export type ButtonSize = "sm" | "md" | "lg" | "xl"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  asChild?: boolean
}

const baseStyles =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition " +
  "min-h-touch active:scale-95 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 " +
  "disabled:pointer-events-none disabled:opacity-50"

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  danger:
    "bg-danger-600 text-white hover:bg-danger-500 dark:bg-danger-500 dark:hover:bg-danger-600",
  ghost:
    "bg-transparent text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800",
  outline:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 " +
    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  link:
    "bg-transparent text-brand-700 underline-offset-4 hover:underline dark:text-brand-400"
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-5 text-base",
  xl: "h-16 px-8 text-lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "default",
      size = "md",
      fullWidth,
      loading,
      asChild,
      disabled,
      children,
      type,
      ...props
    },
    ref
  ) {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type ?? "button"}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
