'use client';

/** Cột chọn nhân viên (preview permissions `.ulist`): tìm + danh sách; ≤1023 thành ô chọn (`.upick`). */
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { inputClass } from '@/shared/ui/Field';
import { cn } from '@/lib/utils';
import type { UserPermRow } from '../../types';
import { differsFromDefault, matchUser } from '../../view/perm-logic';

export function PermUserList({ rows, q, onQ, current, onPick }: {
  rows: UserPermRow[]; q: string; onQ: (v: string) => void; current: string | null; onPick: (id: string) => void;
}) {
  const t = useTranslations();
  const list = rows.filter((u) => matchUser(u, q));
  return (
    <aside aria-label={t('pp.u.pick')} className="sticky top-[76px] flex max-h-[calc(100dvh-160px)] flex-col rounded-card border border-line bg-surface shadow-v2-1 max-[1023px]:hidden">
      <label className="relative m-3 mb-2 flex h-9 items-center">
        <Search aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-ink-3" />
        <span className="sr-only">{t('pp.u.search')}</span>
        <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder={t('pp.u.search')}
          className="h-full w-full rounded-ctl border border-line-2 bg-surface pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </label>
      <ul className="m-0 list-none overflow-y-auto px-1.5 pb-2 pt-0">
        {list.length === 0 && <li className="px-3.5 py-4 text-[13px] text-ink-3">{t('pp.u.none')}</li>}
        {list.map((u) => {
          const own = differsFromDefault(u);
          return (
            <li key={u.id}>
              <button type="button" aria-current={u.id === current ? 'true' : undefined} onClick={() => onPick(u.id)} data-uid={u.id}
                className={cn('flex min-h-[50px] w-full items-center gap-2.5 rounded-ctl py-1.5 pl-2 pr-2.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', u.id === current && 'bg-primary-soft hover:bg-primary-soft')}>
                <UserAvatar displayName={u.displayName} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-[13px] font-medium text-ink">{u.displayName}</b>
                  <small className="truncate font-mono text-xs text-ink-3">{u.username}</small>
                </span>
                {own && (
                  <span title={t('ppx.u.custom')} className="size-2 flex-none rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]">
                    <span className="sr-only">{t('ppx.u.custom')}</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function PermUserPick({ rows, current, onPick }: { rows: UserPermRow[]; current: string | null; onPick: (id: string) => void }) {
  const t = useTranslations();
  return (
    <div className="mb-4 hidden max-[1023px]:block">
      <label htmlFor="perm-user-pick" className="mb-1.5 block text-[13px] font-medium text-ink">{t('pp.u.pick')}</label>
      <select id="perm-user-pick" className={inputClass} value={current ?? ''} onChange={(e) => onPick(e.target.value)}>
        {rows.map((u) => <option key={u.id} value={u.id}>{u.displayName}{differsFromDefault(u) ? ` · ${t('ppx.u.custom')}` : ''}</option>)}
      </select>
    </div>
  );
}
