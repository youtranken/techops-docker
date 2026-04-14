'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';
import type { SmtpConfigInput } from '../types';

interface Props {
  form: SmtpConfigInput;
  patch: (key: keyof SmtpConfigInput, value: string | number | boolean) => void;
}

export function SmtpSenderFields({ form, patch }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Send className="h-4 w-4" />
        <span>Thông tin người gửi</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tên hiển thị</Label>
          <Input
            value={form.fromName}
            onChange={(e) => patch('fromName', e.target.value)}
            placeholder="TechOps"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email gửi</Label>
          <Input
            type="email"
            value={form.fromEmail}
            onChange={(e) => patch('fromEmail', e.target.value)}
            placeholder="noreply@techops.com"
          />
        </div>
      </div>
    </div>
  );
}
