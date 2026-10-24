'use client';

/**
 * Thanh chọn kỳ dùng chung (preview `.pbar`): [Tháng | Quý/Năm | Tuỳ chọn] + ô chọn tháng/quý/năm hoặc 2 ô ngày.
 * Chỉ sinh dateFrom/dateTo như V1 (Tuỳ chọn của V1 cũng chọn được mọi khoảng); bắt đầu > kết thúc → báo lỗi, không đổi kỳ.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';
import { controlClass } from '@/shared/ui/Field';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { rangeToggle, type Period, type Range } from '../../view/report-logic';

/** Nhãn kỳ: "Tháng 10/2026", "Quý 4/2026", "Năm 2026", "01/10/2026 – 15/10/2026". */
export function usePeriodLabel() {
  const t = useTranslations();
  const f = useFormat();
  return (p: Period): string => {
    switch (p.kind) {
      case 'month': return t('rpx.lbl.month', { n: p.m, y: p.y });
      case 'quarter': return t('rp.lbl.quarter', { q: p.q, y: p.y });
      case 'year': return t('rp.lbl.year', { y: p.y });
      case 'range': return t('rp.lbl.range', { a: f.date(`${p.a}T12:00:00+07:00`), b: f.date(`${p.b}T12:00:00+07:00`) });
      default: return '—';
    }
  };
}

export const selectCls = cn(controlClass, 'h-[34px] w-auto min-w-[150px] pr-8 text-[13px] max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1');
const dateCls = cn(controlClass, 'h-[34px] w-[148px] min-w-0 px-2 text-[13px] max-[680px]:h-11 max-[680px]:w-auto max-[680px]:flex-1');

export interface PeriodBarProps<P extends string> {
  presets: { value: P; label: string }[];
  preset: P;
  onPreset: (p: P) => void;
  /** Ô chọn khi không phải Tuỳ chọn */
  picker?: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void };
  range: Range;
  onRange: (r: Range) => void;
  customValue: P;
  aside?: React.ReactNode;
  today: string;
}

export function PeriodBar<P extends string>({ presets, preset, onPreset, picker, range, onRange, customValue, aside, today }: PeriodBarProps<P>) {
  const t = useTranslations();
  const [draft, setDraft] = React.useState<Range>(range);
  const [invalid, setInvalid] = React.useState(false);
  React.useEffect(() => { setDraft(range); setInvalid(false); }, [range.dateFrom, range.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (key: keyof Range, v: string) => {
    const r = rangeToggle(draft, key, v);
    setDraft(r.range);
    setInvalid(r.invalid);
    if (!r.invalid && r.range.dateFrom && r.range.dateTo) onRange(r.range);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-2" data-testid="rp-pbar">
      <Segmented ariaLabel={t('rp.period')} value={preset} onChange={onPreset} options={presets}
        className="max-[680px]:w-full max-[680px]:[&>button]:h-9 max-[680px]:[&>button]:flex-1 max-[680px]:[&>button]:justify-center" />
      {preset === customValue ? (
        <span className="flex min-w-0 items-center gap-1.5 max-[680px]:w-full">
          <label className="sr-only" htmlFor="rp-from">{t('rp.from')}</label>
          <input id="rp-from" type="date" className={dateCls} value={draft.dateFrom} max={today} aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'rp-perr' : undefined} onChange={(e) => edit('dateFrom', e.target.value)} />
          <span aria-hidden className="text-ink-3">–</span>
          <label className="sr-only" htmlFor="rp-to">{t('rp.to')}</label>
          <input id="rp-to" type="date" className={dateCls} value={draft.dateTo} aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'rp-perr' : undefined} onChange={(e) => edit('dateTo', e.target.value)} />
        </span>
      ) : picker ? (
        <>
          <label className="sr-only" htmlFor="rp-pick">{t('rp.pick')}</label>
          <select id="rp-pick" className={selectCls} value={picker.value} onChange={(e) => picker.onChange(e.target.value)}>
            {picker.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </>
      ) : null}
      {invalid && (
        <p id="rp-perr" role="alert" className="m-0 flex basis-full items-center gap-1.5 text-[13px] text-danger-ink">
          <AlertCircle aria-hidden className="size-3.5" />{t('rp.err.range')}
        </p>
      )}
      {aside && <p className="m-0 ml-auto text-[13px] text-ink-2 max-[680px]:ml-0 max-[680px]:basis-full">{aside}</p>}
    </div>
  );
}
