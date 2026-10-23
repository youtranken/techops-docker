'use client';

/**
 * Lọc "Hạn hoàn thành" (V1 DateFilter): Hôm nay / 7 ngày / 30 ngày / Quá hạn hoặc Từ ngày – Đến ngày.
 * Giá trị vẫn ghi vào URL `datePreset` / `dateFrom` / `dateTo` như V1; quy đổi sang API ở `list-logic.resolveDates`.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClass } from '@/shared/ui/Field';
import { DATE_PRESETS, filterUpdate, type ListState, type Updates } from './list-logic';

const lbl = 'mb-1.5 block text-[13px] font-medium text-ink';

export function DateFilter({ state, onUpdate }: { state: ListState; onUpdate: (u: Updates) => void }) {
  const t = useTranslations();
  const hasRange = !!(state.dateFrom || state.dateTo);
  const [custom, setCustom] = React.useState(hasRange);
  React.useEffect(() => { if (hasRange) setCustom(true); }, [hasRange]);
  const preset = (DATE_PRESETS as readonly string[]).includes(state.datePreset) ? state.datePreset : '';
  const value = custom || hasRange ? 'custom' : preset;
  const rangeErr = !!(state.dateFrom && state.dateTo && state.dateTo < state.dateFrom);

  return (
    <>
      <div>
        <label htmlFor="tl-f-time" className={lbl}>{t('tl.f.time')}</label>
        <select
          id="tl-f-time"
          className={cn(inputClass, 'pr-8')}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') { setCustom(true); onUpdate({ datePreset: undefined, page: undefined }); return; }
            setCustom(false);
            onUpdate(filterUpdate('datePreset', v || 'all'));
          }}
        >
          <option value="">{t('tl.f.tAll')}</option>
          {DATE_PRESETS.map((p) => <option key={p} value={p}>{t(`tl.f.t.${p}`)}</option>)}
          <option value="custom">{t('tl.f.t.custom')}</option>
        </select>
      </div>
      {value === 'custom' && (
        <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3 sm:max-w-[416px]">
          <div>
            <label htmlFor="tl-f-from" className={lbl}>{t('tl.f.from')}</label>
            <input
              id="tl-f-from" type="date" className={cn(inputClass, 'font-mono text-[13px]')}
              value={state.dateFrom}
              onChange={(e) => onUpdate(filterUpdate('dateFrom', e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="tl-f-to" className={lbl}>{t('tl.f.to')}</label>
            <input
              id="tl-f-to" type="date" className={cn(inputClass, 'font-mono text-[13px]')}
              value={state.dateTo}
              min={state.dateFrom || undefined}
              aria-invalid={rangeErr || undefined}
              aria-describedby={rangeErr ? 'tl-f-to-err' : undefined}
              onChange={(e) => onUpdate(filterUpdate('dateTo', e.target.value))}
            />
            {rangeErr && (
              <p id="tl-f-to-err" className="m-0 mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
                <AlertCircle aria-hidden className="size-3.5 flex-none" />
                <span>{t('tl.f.rangeErr')}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
