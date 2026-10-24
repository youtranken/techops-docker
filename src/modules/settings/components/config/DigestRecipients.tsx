'use client';

/**
 * Người nhận Báo cáo định kỳ (preview `.rcp`). Danh sách = người dùng đang hoạt động (V1: /api/hr/users?isActive=true&limit=200).
 * Giữ V1: chọn được cả người chưa có email (V1 không chặn); "Chọn tất cả" áp cho danh sách đang lọc.
 */
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Skeleton } from '@/shared/ui/States';
import { cn } from '@/lib/utils';

interface UserOption {
  id: string;
  displayName: string;
  email: string | null;
  role: { name: string; label: string };
  profile: { avatarColor: string; avatarUrl: string | null } | null;
}

function useActiveUsers() {
  return useQuery({
    queryKey: ['digest-recipients'],
    queryFn: async (): Promise<UserOption[]> => {
      const res = await fetch('/api/hr/users?isActive=true&limit=200');
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: UserOption[] };
      return json.data ?? [];
    },
    staleTime: 60_000,
  });
}

export function DigestRecipients({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const t = useTranslations();
  const { data: users = [], isLoading } = useActiveUsers();
  const [q, setQ] = React.useState('');
  const s = q.toLowerCase();
  const list = users.filter((u) => u.displayName.toLowerCase().includes(s) || (u.email ?? '').toLowerCase().includes(s));
  const allSel = list.length > 0 && list.every((u) => ids.includes(u.id));

  function toggle(id: string) {
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }
  function toggleAll() {
    const vis = list.map((u) => u.id);
    onChange(allSel ? ids.filter((id) => !vis.includes(id)) : Array.from(new Set([...ids, ...vis])));
  }

  return (
    <div className="overflow-hidden rounded-ctl border border-line" data-testid="dg-rcp">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 p-2">
        <label className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-ctl border border-line-2 bg-surface px-2.5 focus-within:ring-2 focus-within:ring-ring max-[680px]:h-10">
          <Search aria-hidden className="size-4 flex-none text-ink-3" />
          <span className="sr-only">{t('set.dg.rcpQ')}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('set.dg.rcpQ')} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" />
        </label>
        {list.length > 0 && (
          <button type="button" onClick={toggleAll} className="flex-none rounded px-1.5 py-0.5 text-[13px] font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t(allSel ? 'set.clearAll' : 'set.selAll')}
          </button>
        )}
      </div>
      <div className="max-h-[264px] overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="grid gap-3 p-3.5" aria-busy="true">
            {[0, 1, 2].map((i) => <Skeleton key={i} variant="line" className="h-7" />)}
          </div>
        ) : list.length === 0 ? (
          <p className="m-0 px-4 py-6 text-center text-[13px] text-ink-3">{t('set.dg.rcpNone')}</p>
        ) : list.map((u, i) => (
          <label key={u.id} className={cn('flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-[color-mix(in_srgb,var(--surface-2)_60%,transparent)]', i > 0 && 'border-t border-line')}>
            <input type="checkbox" className="size-4 flex-none accent-primary" checked={ids.includes(u.id)} onChange={() => toggle(u.id)} />
            <UserAvatar displayName={u.displayName} avatarUrl={u.profile?.avatarUrl} avatarColor={u.profile?.avatarColor} size="sm" className="flex-none" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[13px] font-medium text-ink">{u.displayName}</b>
              <span className="block truncate text-xs text-ink-3">
                {u.email ?? <i>{t('set.dg.noMail')}</i>} · {['ADMIN', 'BOSS', 'EMPLOYEE'].includes(u.role.name) ? t(`ppx.role.${u.role.name}`) : u.role.label}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
