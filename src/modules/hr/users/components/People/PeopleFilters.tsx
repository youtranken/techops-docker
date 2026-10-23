'use client';

/** Hàng lọc (preview people `.ctl`): tìm · vai trò · trạng thái · ngày tạo (V1) · Xoá bộ lọc · "n người". */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRoleLabel } from '../../../shared/HrPageHead';
import { filterCount, type PeopleFilters, type StatusFilter } from '../../view/people-logic';
import type { PeoplePageState } from './usePeoplePage';

export const selectCls = cn(
  'h-9 rounded-ctl border border-line-2 bg-surface pl-2.5 pr-7 text-[13px] text-ink',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11',
);

/** Ô tìm: gõ xong 300 ms mới lọc (V1 lọc theo từng phím). */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
    <label className="relative flex h-9 w-[260px] items-center max-[1023px]:min-w-[200px] max-[1023px]:flex-1 max-[680px]:h-11 max-[680px]:w-full max-[680px]:flex-[1_1_100%]">
      <Search aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-ink-3" />
      <span className="sr-only">{t('pp.search')}</span>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('pp.search')}
        data-testid="pp-search"
        className="h-full w-full rounded-ctl border border-line-2 bg-surface pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

export function PeopleFilters({ s }: { s: PeoplePageState }) {
  const t = useTranslations();
  const roleLabel = useRoleLabel();
  const f = s.filters;
  const onSearch = React.useCallback((v: string) => s.setFilter('search', v), [s]);
  const n = filterCount(f);
  const total = s.pagination?.total;
  return (
    <div role="search" className="mb-3 flex min-h-11 flex-wrap items-center gap-2">
      <SearchBox value={f.search} onChange={onSearch} />
      {s.privileged && (
        <select aria-label={t('pp.f.role')} value={f.roleId} onChange={(e) => s.setFilter('roleId', e.target.value)} className={cn(selectCls, 'max-[680px]:min-w-0 max-[680px]:flex-1')} data-testid="pp-role">
          <option value="">{t('pp.f.allRoles')}</option>
          {s.roles.map((r) => (
            <option key={r.id} value={r.id}>{roleLabel(r.name)} ({r._count.users})</option>
          ))}
        </select>
      )}
      <select aria-label={t('pp.f.status')} value={f.status} onChange={(e) => s.setFilter('status', e.target.value as StatusFilter)} className={cn(selectCls, 'max-[680px]:min-w-0 max-[680px]:flex-1')} data-testid="pp-status">
        <option value="all">{t('pp.f.allSt')}</option>
        <option value="active">{t('pp.st.active')}</option>
        <option value="inactive">{t('pp.st.locked')}</option>
      </select>
      <DateRange f={f} s={s} />
      {(n > 0 || f.search) && (
        <Button type="button" variant="subtle" size="xs" onClick={s.clearAll} className="max-[680px]:h-11">
          {t('pp.f.clear')}
        </Button>
      )}
      {total !== undefined && (
        <span aria-live="polite" className="ml-auto whitespace-nowrap text-[13px] text-ink-3 max-[680px]:hidden">{t('pp.shown', { n: total })}</span>
      )}
    </div>
  );
}

/** Lọc theo ngày tạo (V1 có, preview không có → giữ V1) */
function DateRange({ f, s }: { f: PeopleFilters; s: PeoplePageState }) {
  const t = useTranslations();
  const inp = 'h-9 w-[138px] rounded-ctl border border-line-2 bg-surface px-2 text-[13px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11 max-[680px]:w-auto max-[680px]:min-w-0 max-[680px]:flex-1';
  return (
    <fieldset className="m-0 flex min-w-0 items-center gap-1.5 border-0 p-0 max-[680px]:flex-[1_1_100%]">
      <legend className="sr-only">{t('ppx.f.created')}</legend>
      <span aria-hidden className="text-[13px] text-ink-3 max-[1023px]:hidden">{t('ppx.f.created')}</span>
      <input type="date" aria-label={t('ppx.f.from')} value={f.createdFrom} onChange={(e) => s.setFilter('createdFrom', e.target.value)} className={inp} />
      <span aria-hidden className="text-ink-3">–</span>
      <input type="date" aria-label={t('ppx.f.to')} value={f.createdTo} onChange={(e) => s.setFilter('createdTo', e.target.value)} className={inp} />
      {(f.createdFrom || f.createdTo) && (
        <button
          type="button"
          aria-label={t('ppx.f.clearDate')}
          onClick={() => { s.setFilter('createdFrom', ''); s.setFilter('createdTo', ''); }}
          className="grid size-8 flex-none place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:size-11"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </fieldset>
  );
}
