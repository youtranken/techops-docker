'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── InlineSelect ──────────────────────────────────────────────────────────────
// Dùng SelectPrimitive trực tiếp (không portal) để tránh bị Sheet overlay che khuất.
// style={{ zIndex: 9999 }} đảm bảo dropdown luôn nổi trên mọi stacking context.

interface InlineSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
  hasError?: boolean;
}

export function InlineSelect({ value, onValueChange, placeholder, children, hasError }: InlineSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border bg-white dark:bg-slate-800 px-3 py-2 text-sm dark:text-slate-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-40 shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Content
        position="popper"
        style={{ zIndex: 9999 }}
        className={cn(
          'min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:translate-y-1',
        )}
      >
        <SelectPrimitive.Viewport className="p-1 max-h-[200px] overflow-y-auto">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Root>
  );
}

// ── InlineSelectItem ──────────────────────────────────────────────────────────

export function InlineSelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <SelectPrimitive.Item
      value={value}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'focus:bg-indigo-50 dark:focus:bg-indigo-900/30 focus:text-indigo-700 dark:focus:text-indigo-400 transition-colors',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-indigo-600" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
