'use client';

import { Label } from '@/components/ui/label';
import * as LucideIcons from 'lucide-react';

const ICON_OPTIONS = [
  'Monitor', 'Cpu', 'Wifi', 'Server', 'HardDrive', 'Wrench', 'Code', 'Globe',
  'Database', 'Shield', 'Printer', 'Phone', 'Mail', 'Lock', 'Settings', 'Zap',
  'Bug', 'FileText', 'Users', 'Package', 'Cloud', 'Terminal', 'Network', 'LayoutGrid',
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function IconPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-1">
      <Label>Icon</Label>
      <div className="grid grid-cols-8 gap-1 p-2 border rounded-md max-h-40 overflow-y-auto">
        {ICON_OPTIONS.map((iconName) => {
          const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
          if (!Icon) return null;
          return (
            <button
              key={iconName}
              type="button"
              title={iconName}
              onClick={() => onChange(iconName)}
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${value === iconName ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Đã chọn: {value}</p>
    </div>
  );
}
