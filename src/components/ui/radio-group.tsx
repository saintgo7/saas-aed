"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils/cn"

export type RadioGroupVariant = "default" | "card"

interface RadioGroupContextValue {
  variant: RadioGroupVariant
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({
  variant: "default"
})

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  variant?: RadioGroupVariant
}

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(function RadioGroup({ className, variant = "default", ...props }, ref) {
  return (
    <RadioGroupContext.Provider value={{ variant }}>
      <RadioGroupPrimitive.Root
        ref={ref}
        className={cn("grid gap-2", className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
})

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label?: React.ReactNode
  description?: React.ReactNode
}

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(function RadioGroupItem(
  { className, label, description, children, ...props },
  ref
) {
  const { variant } = React.useContext(RadioGroupContext)

  if (variant === "card") {
    return (
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          "group relative flex h-16 min-h-touch w-full items-center gap-3 rounded-xl border-2 px-4 text-left transition",
          "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
          "data-[state=checked]:border-brand-700 data-[state=checked]:bg-brand-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          "active:scale-[0.98]",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600",
          "dark:data-[state=checked]:border-brand-400 dark:data-[state=checked]:bg-brand-900/30",
          className
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
            "border-slate-300 group-data-[state=checked]:border-brand-700 group-data-[state=checked]:bg-brand-700",
            "dark:border-slate-600 dark:group-data-[state=checked]:border-brand-400 dark:group-data-[state=checked]:bg-brand-400"
          )}
        >
          <RadioGroupPrimitive.Indicator>
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </RadioGroupPrimitive.Indicator>
        </span>
        <span className="flex flex-1 flex-col">
          {label ? (
            <span className="text-base font-semibold">{label}</span>
          ) : null}
          {description ? (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </span>
          ) : null}
          {children}
        </span>
      </RadioGroupPrimitive.Item>
    )
  }

  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-5 w-5 rounded-full border-2 border-slate-300 text-brand-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-brand-700",
        "dark:border-slate-600 dark:data-[state=checked]:border-brand-400",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-700 dark:bg-brand-400" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
