'use client';

import * as LucideIcons from 'lucide-react';

interface Props {
  iconName?: string;
}

export function TaskTypeIcon({ iconName }: Props) {
  if (!iconName) return null;
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!Icon) return <span className="text-xs text-muted-foreground">{iconName}</span>;
  return <Icon className="h-4 w-4 text-muted-foreground" />;
}
