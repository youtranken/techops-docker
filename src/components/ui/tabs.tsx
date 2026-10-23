"use client"

/** Tabs gạch chân (preview `.tabs .tab`): chữ ink-2, tab đang chọn đậm + vạch 2px màu chính, số đếm mono. */
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex min-w-0 gap-[22px] overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { count?: React.ReactNode }
>(({ className, children, count, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "group relative inline-flex h-10 flex-none items-center gap-1.5 whitespace-nowrap border-0 bg-transparent p-0 text-sm font-medium text-ink-2 hover:text-ink",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:font-semibold data-[state=active]:text-ink",
      "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-sm after:bg-transparent data-[state=active]:after:bg-primary-text",
      className
    )}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span className="font-mono text-xs font-medium text-ink-3 group-data-[state=active]:text-primary-text">{count}</span>
    )}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-none", className)} {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
