'use client';

/**
 * Thanh công cụ (ô tìm + nút Bộ lọc) · hộp "Lọc ticket" · chip bộ lọc đang áp (preview helpdesk `.tools`, `dlgFilter`, `.fchips`).
 * Bộ lọc giữ V1: Ưu tiên / Trạng thái / IT Support (giá trị lấy từ `?options=1`, thêm "Chưa có IT Support" = `__none__`),
 * Từ ngày / Đến ngày theo ngày tạo ticket. Ô tìm kiếm gửi sau 300 ms (V1 gửi mỗi phím — cùng tham số `search`).
 */
import * as React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { FilterChip } from '@/shared/ui/FilterChip';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { FilterOptions, PendingFilters } from '../../types';
import { chipKeys, filterFormFrom, IT_NONE, statusOptions, type FilterForm, type FormKey } from './hd-logic';
import { useHdLabels } from './HdCells';

export function HdSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations();
  const [text, setText] = React.useState(value);
  const last = React.useRef(value);
  React.useEffect(() => { if (value !== last.current) { last.current = value; setText(value); } }, [value]);
  React.useEffect(() => {
    if (text === last.current) return;
    const h = setTimeout(() => { last.current = text; onChange(text); }, 300);
    return () => clearTimeout(h);
  }, [text, onChange]);
  return (
    <label className="relative flex h-9 min-w-0 flex-1 items-center min-[1400px]:w-[240px] min-[1400px]:flex-none max-[1399px]:max-w-[360px] max-[680px]:h-11 max-[680px]:max-w-none">
      <Search aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-ink-3" />
      <span className="sr-only">{t('hd.search')}</span>
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('hd.search')} data-testid="hd-search"
        className="h-full w-full rounded-ctl border border-line-2 bg-surface pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>
  );
}

export function HdFilterButton({ count, onClick, btnRef }: { count: number; onClick: () => void; btnRef: React.Ref<HTMLButtonElement> }) {
  const t = useTranslations();
  return (
    <Button ref={btnRef} type="button" variant="outline" size="md" onClick={onClick} aria-haspopup="dialog" data-testid="hd-filter-btn"
      className={cn('flex-none max-[680px]:h-11 max-[680px]:px-3', count > 0 && 'border-primary-text text-primary-text')}>
      <SlidersHorizontal aria-hidden />
      <span>{count ? t('tl.f.n', { n: count }) : t('filter.btn')}</span>
    </Button>
  );
}

const selectClass = cn(inputClass, 'pr-8');

export function HdFilterDialog({ open, filters, options, onApply, onClose }: {
  open: boolean; filters: PendingFilters; options?: FilterOptions; onApply: (f: FilterForm) => void; onClose: () => void;
}) {
  const t = useTranslations();
  const l = useHdLabels();
  const [form, setForm] = React.useState<FilterForm>(() => filterFormFrom(filters));
  React.useEffect(() => { if (open) setForm(filterFormFrom(filters)); }, [open, filters]);
  const set = (k: FormKey) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const all = <option value="">{t('hd.f.all')}</option>;

  return (
    <ActionDialog open={open} onClose={onClose} title={t('hd.f.title')} size="sm" okLabel={t('hd.f.apply')} onOk={() => onApply(form)} data-testid="hd-filter-dlg">
      <Field id="hdf-uuTien" label={t('filter.priority')} optional={false}>
        <select className={selectClass} value={form.uuTien} onChange={set('uuTien')}>
          {all}
          {(options?.uuTien ?? []).map((v) => <option key={v} value={v}>{l.priority(v)}</option>)}
        </select>
      </Field>
      <Field id="hdf-trangThai" label={t('hd.col.status')} optional={false}>
        <select className={selectClass} value={form.trangThai} onChange={set('trangThai')}>
          {all}
          {statusOptions(options?.trangThai ?? [], l.status).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field id="hdf-itSupport" label={t('hd.f.it')} optional={false}>
        <select className={selectClass} value={form.itSupport} onChange={set('itSupport')}>
          {all}
          <option value={IT_NONE}>{t('hd.f.itNone')}</option>
          {(options?.itSupport ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="hdf-dateFrom" label={t('hd.f.from')} optional={false}>
          <input type="date" className={inputClass} value={form.dateFrom} onChange={set('dateFrom')} />
        </Field>
        <Field id="hdf-dateTo" label={t('hd.f.to')} optional={false}>
          <input type="date" className={inputClass} value={form.dateTo} onChange={set('dateTo')} />
        </Field>
      </div>
    </ActionDialog>
  );
}

export function HdChips({ filters, onRemove, onClear }: { filters: PendingFilters; onRemove: (k: FormKey) => void; onClear: () => void }) {
  const t = useTranslations();
  const f = useFormat();
  const l = useHdLabels();
  const keys = chipKeys(filters);
  if (!keys.length) return null;
  const label: Record<FormKey, string> = { uuTien: t('filter.priority'), trangThai: t('hd.col.status'), itSupport: t('hd.f.it'), dateFrom: t('hd.f.from'), dateTo: t('hd.f.to') };
  const value = (k: FormKey, v: string) =>
    k === 'uuTien' ? l.priority(v) : k === 'trangThai' ? l.status(v) : k === 'itSupport' ? (v === IT_NONE ? t('hd.f.itNone') : v) : f.date(v);
  return (
    <div className="-mt-1 mb-3.5 flex flex-wrap items-center gap-1.5" data-testid="hd-chips">
      {keys.map((k) => <FilterChip key={k} label={label[k]} value={value(k, filters[k] as string)} onRemove={() => onRemove(k)} />)}
      <button type="button" onClick={onClear} className="rounded-md px-1.5 py-1 text-[13px] font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {t('hd.f.clear')}
      </button>
    </div>
  );
}
