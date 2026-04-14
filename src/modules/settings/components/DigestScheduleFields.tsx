'use client';

import { cn } from '@/lib/utils';
import { CalendarDays, Clock } from 'lucide-react';
import { DigestRecipientsFields } from './DigestRecipientsFields';

interface Props {
  sendWeekly: boolean;
  sendMonthly: boolean;
  sendDays: number[];
  sendHour: number;
  sendMinute: number;
  recipientIds: string[];
  onChange: (field: 'sendWeekly' | 'sendMonthly' | 'sendHour' | 'sendMinute', value: boolean | number) => void;
  onSendDaysChange: (days: number[]) => void;
  onRecipientsChange: (ids: string[]) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const DAYS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' },
];

const WEEKDAYS = [1, 2, 3, 4, 5];

export function DigestScheduleFields({
  sendWeekly, sendMonthly, sendDays, sendHour, sendMinute,
  recipientIds, onChange, onSendDaysChange, onRecipientsChange,
}: Props) {
  function toggleDay(day: number) {
    onSendDaysChange(
      sendDays.includes(day) ? sendDays.filter((d) => d !== day) : [...sendDays, day],
    );
  }

  function setWeekdays() {
    const allSelected = WEEKDAYS.every((d) => sendDays.includes(d));
    onSendDaysChange(allSelected ? sendDays.filter((d) => !WEEKDAYS.includes(d)) : Array.from(new Set([...sendDays, ...WEEKDAYS])));
  }

  const hasAnySchedule = sendWeekly || sendMonthly || sendDays.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className={cn(
          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none',
          sendWeekly ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
        )}>
          <input type="checkbox" checked={sendWeekly} onChange={(e) => onChange('sendWeekly', e.target.checked)}
            className="h-4 w-4 rounded accent-primary" />
          <div>
            <p className="text-sm font-medium leading-none">Hàng tuần</p>
            <p className="text-xs text-muted-foreground mt-1">Thứ Hai đầu tuần</p>
          </div>
        </label>

        <label className={cn(
          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none',
          sendMonthly ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
        )}>
          <input type="checkbox" checked={sendMonthly} onChange={(e) => onChange('sendMonthly', e.target.checked)}
            className="h-4 w-4 rounded accent-primary" />
          <div>
            <p className="text-sm font-medium leading-none">Hàng tháng</p>
            <p className="text-xs text-muted-foreground mt-1">Ngày cuối tháng</p>
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Hàng ngày (chọn thứ)</p>
          <button
            type="button"
            onClick={setWeekdays}
            className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
              WEEKDAYS.every((d) => sendDays.includes(d))
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/50',
            )}
          >
            T2 – T6
          </button>
        </div>
        <div className="flex gap-1.5">
          {DAYS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              className={cn(
                'flex-1 h-9 rounded-lg text-xs font-semibold border transition-all',
                sendDays.includes(value)
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time picker */}
      {hasAnySchedule && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">Giờ gửi:</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <select value={sendHour} onChange={(e) => onChange('sendHour', Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
            </select>
            <span className="text-muted-foreground font-medium">:</span>
            <select value={sendMinute} onChange={(e) => onChange('sendMinute', Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
            </select>
          </div>
          <span className="text-xs text-muted-foreground">(UTC+7)</span>
        </div>
      )}

      {hasAnySchedule && (
        <div className="flex flex-wrap gap-2">
          {sendWeekly && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <CalendarDays className="h-3 w-3" />
              Thứ Hai lúc {String(sendHour).padStart(2, '0')}:{String(sendMinute).padStart(2, '0')}
            </div>
          )}
          {sendMonthly && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <CalendarDays className="h-3 w-3" />
              Cuối tháng lúc {String(sendHour).padStart(2, '0')}:{String(sendMinute).padStart(2, '0')}
            </div>
          )}
          {sendDays.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <CalendarDays className="h-3 w-3" />
              {DAYS.filter((d) => sendDays.includes(d.value)).map((d) => d.label).join(', ')} lúc {String(sendHour).padStart(2, '0')}:{String(sendMinute).padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      <div className="pt-2 border-t">
        <DigestRecipientsFields recipientIds={recipientIds} onChange={onRecipientsChange} />
      </div>
    </div>
  );
}
