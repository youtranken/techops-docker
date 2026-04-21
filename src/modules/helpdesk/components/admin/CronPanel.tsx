'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useHelpdeskCronConfig } from '../../hooks/useHelpdeskCronConfig';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatLastRun(lastRunAt: string | null) {
  if (!lastRunAt) return null;
  return new Date(lastRunAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' });
}

function TimeSlotInputs({
  hour, minute, onChange,
}: {
  hour: number; minute: number;
  onChange: (field: 'hour' | 'minute', val: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Giờ (0–23)</Label>
        <Input
          type="number" min={0} max={23} value={hour}
          onChange={(e) => onChange('hour', Math.min(23, Math.max(0, Number(e.target.value))))}
          className="w-20 text-center"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Phút (0–59)</Label>
        <Input
          type="number" min={0} max={59} value={minute}
          onChange={(e) => onChange('minute', Math.min(59, Math.max(0, Number(e.target.value))))}
          className="w-20 text-center"
        />
      </div>
      <p className="text-sm text-muted-foreground pb-2">
        → Mỗi ngày lúc <span className="font-semibold text-foreground">{pad(hour)}:{pad(minute)}</span>
      </p>
    </div>
  );
}

export function CronPanel() {
  const { config, save, isSaving, saveError } = useHelpdeskCronConfig();

  const [hour,     setHour]     = useState(7);
  const [minute,   setMinute]   = useState(0);
  const [enabled,  setEnabled]  = useState(true);
  const [hour2,    setHour2]    = useState(12);
  const [minute2,  setMinute2]  = useState(0);
  const [enabled2, setEnabled2] = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (!config) return;
    setHour(config.hour);
    setMinute(config.minute);
    setEnabled(config.enabled);
    setHour2(config.hour2);
    setMinute2(config.minute2);
    setEnabled2(config.enabled2);
  }, [config]);

  function handleSave() {
    save({ enabled, hour, minute, enabled2, hour2, minute2 }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); },
    });
  }

  return (
    <div className="border-t border-border px-5 py-4 space-y-4 bg-muted/30">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lịch Get API tự động</p>

      {/* Slot 1 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Trạng thái</Label>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <span className="text-sm text-muted-foreground">{enabled ? 'Bật' : 'Tắt'}</span>
            </div>
          </div>
          <div className={`${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <TimeSlotInputs
              hour={hour} minute={minute}
              onChange={(f, v) => f === 'hour' ? setHour(v) : setMinute(v)}
            />
          </div>
        </div>

        {/* Slot 2 */}
        <div className="flex flex-wrap items-end gap-4 pt-1 border-t border-border/60">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Thời điểm 2 (tuỳ chọn)</Label>
            <div className="flex items-center gap-2">
              <Switch checked={enabled2} onCheckedChange={setEnabled2} />
              <span className="text-sm text-muted-foreground">{enabled2 ? 'Bật' : 'Tắt'}</span>
            </div>
          </div>
          <div className={`${!enabled2 ? 'opacity-40 pointer-events-none' : ''}`}>
            <TimeSlotInputs
              hour={hour2} minute={minute2}
              onChange={(f, v) => f === 'hour' ? setHour2(v) : setMinute2(v)}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? 'Đang lưu...' : 'Lưu lịch'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Đã áp dụng
          </span>
        )}
        {saveError && !isSaving && (
          <span className="text-xs text-destructive">
            Lỗi: {saveError.message}
          </span>
        )}
        {config?.lastRunAt && (
          <span className="text-xs text-muted-foreground">
            Lần cuối: {formatLastRun(config.lastRunAt)}
            {config.lastResult && ` · ${config.lastResult.synced} task · ${config.lastResult.errors} lỗi`}
          </span>
        )}
      </div>
    </div>
  );
}
