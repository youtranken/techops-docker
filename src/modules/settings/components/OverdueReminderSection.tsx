'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Clock, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useOverdueReminderConfig, useUpdateOverdueReminderConfig } from '../hooks/useOverdueReminderConfig';
import { DIGEST_CATEGORIES, INDIVIDUAL_EMAIL_TYPES, INDIVIDUAL_EMAIL_TYPE_INFO } from '../types';
import type { OverdueReminderConfigInput, DigestCategory, IndividualEmailType } from '../types';
import { useErrorMessage } from '@/lib/useErrorMessage';

const ALL_CATEGORIES = [...DIGEST_CATEGORIES] as DigestCategory[];
const ALL_INDIVIDUAL_TYPES = [...INDIVIDUAL_EMAIL_TYPES] as IndividualEmailType[];

const DEFAULT: OverdueReminderConfigInput = {
  enabled: false,
  sendDays: [1, 2, 3, 4, 5],
  sendHour: 9,
  sendMinute: 0,
  digestCategories: ALL_CATEGORIES,
  individualEmailTypes: ALL_INDIVIDUAL_TYPES,
};

const CATEGORY_INFO: Record<DigestCategory, { icon: string; label: string; colorClass: string }> = {
  PENDING_APPROVAL:    { icon: '📝', label: 'Chờ phê duyệt (quá deadline)',    colorClass: 'text-amber-700' },
  PENDING_REVIEW:      { icon: '🔍', label: 'Chờ review (quá deadline)',        colorClass: 'text-purple-700' },
  IN_PROGRESS:         { icon: '⏳', label: 'Đang thực hiện (quá deadline)',    colorClass: 'text-blue-700' },
  WAITING_ACKNOWLEDGE: { icon: '📬', label: 'Chờ xác nhận (quá deadline)',      colorClass: 'text-emerald-700' },
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
  const errMsg = useErrorMessage();
  const { data, isLoading } = useOverdueReminderConfig();
  const update = useUpdateOverdueReminderConfig();
  const [form, setForm] = useState<OverdueReminderConfigInput>(DEFAULT);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        enabled: data.enabled,
        sendDays: data.sendDays ?? [1, 2, 3, 4, 5],
        sendHour: data.sendHour,
        sendMinute: data.sendMinute,
        digestCategories: (data.digestCategories as DigestCategory[] | undefined) ?? ALL_CATEGORIES,
        individualEmailTypes: (data.individualEmailTypes as IndividualEmailType[] | undefined) ?? ALL_INDIVIDUAL_TYPES,
      });
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

  function toggleCategory(cat: DigestCategory) {
    const current = form.digestCategories;
    if (current.includes(cat)) {
      if (current.length <= 1) return;
      patch('digestCategories', current.filter((c) => c !== cat));
    } else {
      patch('digestCategories', [...current, cat]);
    }
  }

  function toggleIndividualType(type: IndividualEmailType) {
    const current = form.individualEmailTypes;
    if (current.includes(type)) {
      if (current.length <= 1) return;
      patch('individualEmailTypes', current.filter((t) => t !== type));
    } else {
      patch('individualEmailTypes', [...current, type]);
    }
  }

  function resetForm() {
    if (data) {
      setForm({
        enabled: data.enabled,
        sendDays: data.sendDays ?? [1, 2, 3, 4, 5],
        sendHour: data.sendHour,
        sendMinute: data.sendMinute,
        digestCategories: (data.digestCategories as DigestCategory[] | undefined) ?? ALL_CATEGORIES,
        individualEmailTypes: (data.individualEmailTypes as IndividualEmailType[] | undefined) ?? ALL_INDIVIDUAL_TYPES,
      });
    }
    setIsDirty(false);
  }

  async function handleSave() {
    try {
      await update.mutateAsync(form);
      toast.success('Đã lưu cấu hình nhắc nhở');
      setIsDirty(false);
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Lỗi khi lưu'));
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

          {/* Digest category selection */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Email Quản lý (digest tổng hợp) sẽ bao gồm:</p>
              <button type="button"
                onClick={() => patch('digestCategories', ALL_CATEGORIES)}
                className="text-xs text-primary hover:underline font-medium">
                Chọn tất cả
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {ALL_CATEGORIES.map((cat) => {
                const info = CATEGORY_INFO[cat];
                const checked = form.digestCategories.includes(cat);
                const isLast = form.digestCategories.length <= 1 && checked;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    disabled={isLast}
                    title={isLast ? 'Phải chọn ít nhất 1 loại' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all',
                      checked
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-background border-border opacity-60 hover:opacity-80',
                      isLast && 'cursor-not-allowed',
                    )}>
                    {checked
                      ? <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                      : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className={cn('text-xs font-medium', checked ? info.colorClass : 'text-muted-foreground')}>
                      {info.icon} {info.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual email reminder */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Email cá nhân gửi riêng cho từng người thực hiện:</p>
              <button type="button"
                onClick={() => patch('individualEmailTypes', ALL_INDIVIDUAL_TYPES)}
                className="text-xs text-primary hover:underline font-medium">
                Chọn tất cả
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {ALL_INDIVIDUAL_TYPES.map((type) => {
                const info = INDIVIDUAL_EMAIL_TYPE_INFO[type];
                const checked = form.individualEmailTypes.includes(type);
                const isLast = form.individualEmailTypes.length <= 1 && checked;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleIndividualType(type)}
                    disabled={isLast}
                    title={isLast ? 'Phải chọn ít nhất 1 loại' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all',
                      checked ? 'bg-primary/5 border-primary/30' : 'bg-background border-border opacity-60 hover:opacity-80',
                      isLast && 'cursor-not-allowed',
                    )}>
                    {checked
                      ? <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                      : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className={cn('text-xs font-medium', checked ? info.colorClass : 'text-muted-foreground')}>
                      {info.icon} {info.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isDirty && (
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button onClick={handleSave} disabled={update.isPending} size="sm">
            {update.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
          </Button>
          <Button variant="ghost" size="sm" onClick={resetForm}>Hủy</Button>
        </div>
      )}
    </div>
  );
}
