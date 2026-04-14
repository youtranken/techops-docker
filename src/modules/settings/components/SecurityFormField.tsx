'use client';

import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

interface SecurityFormFieldProps {
  label: string;
  description: string;
  helpText?: string;
  children: ReactNode;
}

/**
 * Form field với label, description và optional help text
 */
export function SecurityFormField({ label, description, helpText, children }: SecurityFormFieldProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1 pr-4">
        <label className="text-sm font-medium block">{label}</label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {helpText && (
          <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-muted/50">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{helpText}</p>
          </div>
        )}
      </div>
      <div className="w-32 shrink-0">
        {children}
      </div>
    </div>
  );
}
