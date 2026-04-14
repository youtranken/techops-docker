'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import type { SmtpConfigInput } from '../types';

interface Props {
  form: SmtpConfigInput;
  isConfigured: boolean;
  patch: (key: keyof SmtpConfigInput, value: string | number | boolean) => void;
}

export function SmtpAuthFields({ form, isConfigured, patch }: Props) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="text-base">🔐</span>
        <span>Xác thực</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tài khoản (email)</Label>
          <Input
            type="email"
            value={form.user}
            onChange={(e) => patch('user', e.target.value)}
            placeholder="your@gmail.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Mật khẩu / App Password
            {isConfigured && <span className="ml-1 text-muted-foreground">(để trống = giữ cũ)</span>}
          </Label>
          <div className="relative">
            <Input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => patch('password', e.target.value)}
              placeholder={isConfigured ? '••••••••' : 'App password'}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
