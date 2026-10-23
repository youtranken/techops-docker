'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { useSmtpConfig, useUpdateSmtpConfig, useTestSmtp } from '../hooks/useSmtp';
import { useUsersWithEmail } from '../hooks/useUsersWithEmail';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SmtpConfigInput } from '../types';
import { SmtpServerFields } from './SmtpServerFields';
import { SmtpAuthFields } from './SmtpAuthFields';
import { SmtpSenderFields } from './SmtpSenderFields';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useErrorMessage } from '@/lib/useErrorMessage';

const DEFAULT_FORM: SmtpConfigInput = {
  host: '', port: 587, secure: false, user: '', password: '',
  fromName: 'TechOps', fromEmail: '', isActive: true,
};

export function SmtpSection() {
  const errMsg = useErrorMessage();
  const { data: config, isLoading } = useSmtpConfig();
  const updateSmtp = useUpdateSmtpConfig();
  const testSmtp = useTestSmtp();

  const [form, setForm] = useState<SmtpConfigInput>(DEFAULT_FORM);
  const [testUserId, setTestUserId] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({ host: config.host, port: config.port, secure: config.secure,
        user: config.user, password: '', fromName: config.fromName,
        fromEmail: config.fromEmail, isActive: config.isActive });
      setIsDirty(false);
    }
  }, [config]);

  function patch(key: keyof SmtpConfigInput, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    try {
      await updateSmtp.mutateAsync(form);
      toast.success('Đã lưu cấu hình SMTP');
      setIsDirty(false);
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Lỗi lưu SMTP'));
    }
  }

  async function handleTest() {
    const target = users.find((u) => u.id === testUserId);
    if (!target) { toast.error('Chọn người dùng để test'); return; }
    try {
      const result = await testSmtp.mutateAsync(target.email);
      toast.success(result.message);
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Lỗi kết nối SMTP'));
    }
  }

  const { data: users = [] } = useUsersWithEmail();

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const isConfigured = Boolean(config);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cấu hình Email (SMTP)</h2>
          <p className="text-sm text-muted-foreground">Cài đặt máy chủ gửi email thông báo — chỉ Admin</p>
        </div>
        <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
          isConfigured && config?.isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground')}>
          {isConfigured && config?.isActive
            ? <><CheckCircle2 className="h-3.5 w-3.5" />Đã cấu hình</>
            : <><XCircle className="h-3.5 w-3.5" />Chưa cấu hình</>}
        </div>
      </div>

      <SmtpServerFields form={form} patch={patch} />
      <SmtpAuthFields form={form} isConfigured={isConfigured} patch={patch} />
      <SmtpSenderFields form={form} patch={patch} />

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button type="button" role="switch" aria-checked={form.isActive}
          onClick={() => patch('isActive', !form.isActive)}
          className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            form.isActive ? 'bg-primary' : 'bg-input')}>
          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform',
            form.isActive ? 'translate-x-6' : 'translate-x-1')} />
        </button>
        <div>
          <p className="text-sm font-medium">Kích hoạt SMTP</p>
          <p className="text-xs text-muted-foreground">Tắt để tạm dừng gửi email hệ thống</p>
        </div>
      </label>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={updateSmtp.isPending || !isDirty} size="sm">
          {updateSmtp.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu cấu hình'}
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={testUserId} onValueChange={setTestUserId}>
            <SelectTrigger className="h-8 w-56 text-sm">
              <SelectValue placeholder="Chọn người nhận test..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  <span>{u.displayName}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">({u.email})</span>
                </SelectItem>
              ))}
              {users.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Không có user có email</div>
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleTest}
            disabled={testSmtp.isPending || !isConfigured || !testUserId} className="gap-1.5">
            {testSmtp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
            Test
          </Button>
        </div>
      </div>
    </div>
  );
}
