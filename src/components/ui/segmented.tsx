"use client"

/** Nút chọn một trong vài lựa chọn (preview `.seg`): nền surface-2, mục đang chọn nổi lên (seg-on + bóng). */
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentedOption<V extends string> {
  value: V
  label: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  /** aria-label khi chỉ có icon */
  ariaLabel?: string
}

export interface SegmentedProps<V extends string> {
  options: SegmentedOption<V>[]
  value: V
  onChange: (value: V) => void
  ariaLabel: string
  size?: "sm" | "md"
  className?: string
}

export function Segmented<V extends string>({ options, value, onChange, ariaLabel, size = "md", className }: SegmentedProps<V>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("inline-flex gap-0.5 rounded-md bg-surface-2 p-[3px]", className)}>
      {options.map((o) => {
        const on = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border-0 px-2.5 text-[13px] font-medium text-ink-3 hover:text-ink",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "md" ? "h-7" : "h-6 px-2 text-xs",
              on && "bg-seg-on text-ink shadow-v2-1"
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
