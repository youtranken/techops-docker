'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmtpConfigInput } from '../types';

interface Props {
  form: SmtpConfigInput;
  patch: (key: keyof SmtpConfigInput, value: string | number | boolean) => void;
}

export function SmtpServerFields({ form, patch }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Server className="h-4 w-4" />
        <span>Thông tin máy chủ</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">SMTP Host</Label>
          <Input
            value={form.host}
            onChange={(e) => patch('host', e.target.value)}
            placeholder="smtp.gmail.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Port</Label>
          <Input
            type="number"
            value={form.port}
            onChange={(e) => patch('port', Number(e.target.value))}
            placeholder="587"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={form.secure}
            onClick={() => patch('secure', !form.secure)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
              form.secure ? 'bg-primary' : 'bg-input'
            )}
          >
            <span className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
              form.secure ? 'translate-x-4' : 'translate-x-1'
            )} />
          </button>
          <span className="text-sm">SSL/TLS (port 465)</span>
        </label>
        {!form.secure && <span className="text-xs text-muted-foreground">STARTTLS (port 587)</span>}
      </div>
    </div>
  );
}
