'use client';

import type { ReactNode } from 'react';

interface SecurityCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * Card component cho từng section trong Security settings
 */
export function SecurityCard({ icon: Icon, title, description, children }: SecurityCardProps) {
  return (
    <section className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      
      <div className="space-y-4 pt-2">
        {children}
      </div>
    </section>
  );
}
