'use client';

import { useState, useEffect } from 'react';
import { Loader2, BarChart3, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDigestConfig, useUpdateDigestConfig } from '../hooks/useDigestConfig';
import { DigestScheduleFields } from './DigestScheduleFields';
import { DigestContentFields } from './DigestContentFields';
import { DigestTemplateFields } from './DigestTemplateFields';
import type { DigestConfigInput, DigestContentType } from '../types';
import { useErrorMessage } from '@/lib/useErrorMessage';

const DEFAULT: DigestConfigInput = {
  enabled: false,
  sendWeekly: false,
  sendMonthly: false,
  sendDays: [],
  sendHour: 8,
  sendMinute: 0,
  recipientIds: [],
  contentTypes: ['DEADLINE_SOON', 'IN_PROGRESS', 'OVERDUE', 'PENDING_APPROVAL', 'SUMMARY_BY_EMPLOYEE'],
  emailSubject: 'Báo cáo định kỳ TechOps - {date}',
  emailGreeting: 'Xin chào, đây là báo cáo tình trạng công việc định kỳ từ hệ thống TechOps.',
};

type Section = 'schedule' | 'content' | 'template';

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'schedule', label: 'Lịch gửi', icon: BarChart3 },
  { key: 'content', label: 'Nội dung', icon: Mail },
  { key: 'template', label: 'Mẫu email', icon: Mail },
];

export function DigestSection() {
  const errMsg = useErrorMessage();
  const { data, isLoading } = useDigestConfig();
  const update = useUpdateDigestConfig();
  const [form, setForm] = useState<DigestConfigInput>(DEFAULT);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('schedule');

  useEffect(() => {
    if (data) {
      setForm({
        enabled: data.enabled,
        sendWeekly: data.sendWeekly,
        sendMonthly: data.sendMonthly,
        sendDays: data.sendDays ?? [],
        sendHour: data.sendHour,
        sendMinute: data.sendMinute,
        recipientIds: data.recipientIds ?? [],
        contentTypes: data.contentTypes,
        emailSubject: data.emailSubject,
        emailGreeting: data.emailGreeting,
      });
      setIsDirty(false);
    }
  }, [data]);

  function patch<K extends keyof DigestConfigInput>(key: K, value: DigestConfigInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    try {
      await update.mutateAsync(form);
      toast.success('Đã lưu cài đặt báo cáo định kỳ');
      setIsDirty(false);
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Lỗi khi lưu'));
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Báo cáo định kỳ</h2>
        <p className="text-sm text-muted-foreground">Tự động gửi email tổng hợp tình trạng công việc cho tất cả Quản lý</p>
      </div>

      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Bật báo cáo định kỳ</p>
            <p className="text-xs text-muted-foreground">Gửi email tổng hợp tự động cho toàn bộ Quản lý</p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={form.enabled}
          onClick={() => patch('enabled', !form.enabled)}
          className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            form.enabled ? 'bg-primary' : 'bg-input')}>
          <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform',
            form.enabled ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>

      {/* US4.9: Cảnh báo khi enabled nhưng config không hợp lệ */}
      {form.enabled && form.sendDays.length === 0 && !form.sendWeekly && !form.sendMonthly && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-3 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Báo cáo định kỳ đang bật nhưng chưa chọn lịch gửi — cron sẽ không chạy. Chọn ít nhất một ngày trong tuần, hàng tuần hoặc hàng tháng.</span>
        </div>
      )}
      {form.enabled && form.contentTypes.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-3 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Báo cáo định kỳ đang bật nhưng chưa chọn loại nội dung nào — email sẽ trống. Chọn ít nhất một loại nội dung.</span>
        </div>
      )}

      {/* Tabs + content */}
      {form.enabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
            {SECTIONS.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveSection(key)}
                className={cn('px-4 py-1.5 rounded-md text-xs font-medium transition-all',
                  activeSection === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl border bg-card">
            {activeSection === 'schedule' && (
              <DigestScheduleFields
                sendWeekly={form.sendWeekly}
                sendMonthly={form.sendMonthly}
                sendDays={form.sendDays}
                sendHour={form.sendHour}
                sendMinute={form.sendMinute}
                recipientIds={form.recipientIds}
                onChange={(field, value) => patch(field, value as never)}
                onSendDaysChange={(days) => patch('sendDays', days)}
                onRecipientsChange={(ids) => patch('recipientIds', ids)}
              />
            )}
            {activeSection === 'content' && (
              <DigestContentFields
                contentTypes={form.contentTypes}
                onChange={(types) => patch('contentTypes', types as DigestContentType[])}
              />
            )}
            {activeSection === 'template' && (
              <DigestTemplateFields
                emailSubject={form.emailSubject}
                emailGreeting={form.emailGreeting}
                onChange={(field, value) => patch(field, value)}
              />
            )}
          </div>
        </div>
      )}

      {isDirty && (
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button onClick={handleSave} disabled={update.isPending} size="sm">
            {update.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            if (data) setForm({ enabled: data.enabled, sendWeekly: data.sendWeekly, sendMonthly: data.sendMonthly, sendDays: data.sendDays ?? [], sendHour: data.sendHour, sendMinute: data.sendMinute, recipientIds: data.recipientIds ?? [], contentTypes: data.contentTypes, emailSubject: data.emailSubject, emailGreeting: data.emailGreeting });
            setIsDirty(false);
          }}>Hủy</Button>
        </div>
      )}
    </div>
  );
}
