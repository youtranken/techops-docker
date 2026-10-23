import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        /* ---- V2 ---- */
        /** Nhãn mã/phiên bản (preview .chip): viền, chữ mono 12px, bo 6 */
        chip: "h-6 gap-1 rounded-sm border-line px-2 py-0 font-mono text-xs font-medium text-ink-2",
        /** Nền nhạt màu chính */
        soft: "border-transparent bg-primary-soft text-primary-text",
        /** Nhãn Phase B: viền nét đứt, mono 10px in hoa, không nền */
        phase: "rounded-sm border-dashed border-line-2 px-1.5 py-0 font-mono text-[10px] font-medium uppercase tracking-wide text-ink-3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
