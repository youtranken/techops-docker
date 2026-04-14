'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useOverdueReminderConfig, useUpdateOverdueReminderConfig } from '../hooks/useOverdueReminderConfig';
import type { OverdueReminderConfigInput } from '../types';

const DEFAULT: OverdueReminderConfigInput = {
  enabled: false,
  sendDays: [1, 2, 3, 4, 5],
  sendHour: 9,
  sendMinute: 0,
};

const DAYS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const WEEKDAYS = [1, 2, 3, 4, 5];

export function OverdueReminderSection() {
  const { data, isLoading } = useOverdueReminderConfig();
  const update = useUpdateOverdueReminderConfig();
  const [form, setForm] = useState<OverdueReminderConfigInput>(DEFAULT);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({ enabled: data.enabled, sendDays: data.sendDays ?? [1,2,3,4,5], sendHour: data.sendHour, sendMinute: data.sendMinute });
      setIsDirty(false);
    }
  }, [data]);

  function patch<K extends keyof OverdueReminderConfigInput>(key: K, value: OverdueReminderConfigInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function toggleDay(day: number) {
    const next = form.sendDays.includes(day) ? form.sendDays.filter((d) => d !== day) : [...form.sendDays, day];
    patch('sendDays', next);
  }

  function toggleWeekdays() {
    const allSelected = WEEKDAYS.every((d) => form.sendDays.includes(d));
    patch('sendDays', allSelected ? form.sendDays.filter((d) => !WEEKDAYS.includes(d)) : Array.from(new Set([...form.sendDays, ...WEEKDAYS])));
  }

  async function handleSave() {
    try {
      await update.mutateAsync(form);
      toast.success('Đã lưu cấu hình nhắc nhở');
      setIsDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu');
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const selectedDayLabels = DAYS.filter((d) => form.sendDays.includes(d.value)).map((d) => d.label);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Nhắc nhở công việc quá hạn</h2>
        <p className="text-sm text-muted-foreground">Gửi email tổng hợp hàng ngày cho Quản lý về các công việc chờ phê duyệt / chờ review đã quá deadline</p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium">Bật nhắc nhở tự động</p>
            <p className="text-xs text-muted-foreground">Email tổng hợp gửi hàng ngày theo lịch đã chọn</p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={form.enabled}
          onClick={() => patch('enabled', !form.enabled)}
          className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', form.enabled ? 'bg-primary' : 'bg-input')}>
          <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform', form.enabled ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>

      {form.enabled && (
        <div className="space-y-4 p-4 rounded-xl border bg-card">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Ngày gửi trong tuần</p>
              <button type="button" onClick={toggleWeekdays}
                className={cn('text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
                  WEEKDAYS.every((d) => form.sendDays.includes(d))
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50')}>
                T2 – T6
              </button>
            </div>
            <div className="flex gap-1.5">
              {DAYS.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => toggleDay(value)}
                  className={cn('flex-1 h-9 rounded-lg text-xs font-semibold border transition-all',
                    form.sendDays.includes(value)
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted/50')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Giờ gửi:</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <select value={form.sendHour} onChange={(e) => patch('sendHour', Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
              </select>
              <span className="text-muted-foreground font-medium">:</span>
              <select value={form.sendMinute} onChange={(e) => patch('sendMinute', Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
              </select>
            </div>
            <span className="text-xs text-muted-foreground">(UTC+7)</span>
          </div>

          {form.sendDays.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sẽ gửi lúc {String(form.sendHour).padStart(2, '0')}:{String(form.sendMinute).padStart(2, '0')} vào: {selectedDayLabels.join(', ')}
            </p>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium mb-1">Email sẽ bao gồm:</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">📝 Chờ phê duyệt (quá deadline)</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">🔍 Chờ review (quá deadline)</span>
            </div>
          </div>
        </div>
      )}

      {isDirty && (
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button onClick={handleSave} disabled={update.isPending} size="sm">
            {update.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            if (data) setForm({ enabled: data.enabled, sendDays: data.sendDays ?? [1,2,3,4,5], sendHour: data.sendHour, sendMinute: data.sendMinute });
            setIsDirty(false);
          }}>Hủy</Button>
        </div>
      )}
    </div>
  );
}
