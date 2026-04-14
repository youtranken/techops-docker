'use client';

import { CalendarDays, Clock, Hash } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { UserProfileData } from '../types';

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  BOSS:     'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  EMPLOYEE: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
};

function fmt(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props { profile: UserProfileData }

export function ProfileMeta({ profile }: Props) {
  const roleName = profile.role?.name ?? '';

  return (
    <div className="rounded-xl border p-6 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Thông tin tài khoản</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted shrink-0"><Hash className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <p className="text-xs text-muted-foreground">ID tài khoản</p>
            <p className="text-sm font-mono truncate">{profile.id?.slice(0, 8)}…</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted shrink-0"><CalendarDays className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Ngày tạo</p>
            <p className="text-sm">{fmt(profile.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted shrink-0"><Clock className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Vai trò</p>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', ROLE_COLORS[roleName] ?? 'bg-muted text-muted-foreground')}>
              {ROLE_LABELS[roleName] ?? roleName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
