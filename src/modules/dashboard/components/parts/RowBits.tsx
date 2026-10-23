'use client';

/** Mảnh nhỏ trong dòng việc: cờ ưu tiên (chỉ Khẩn/Cao như preview), mã việc, người làm. */
import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { priorityTone, PRIORITY_TONE_META } from '@/shared/ui/status-meta';
import type { AssigneeSnippet } from '../../services/stats/types';

export function RowFlag({ name, level }: { name?: string | null; level: number | null }) {
  const t = useTranslations();
  if (!name || level === null) return null;
  const tone = priorityTone(level);
  if (tone !== 'urgent' && tone !== 'high') return null;
  return (
    <span className="inline-flex flex-none self-center" style={{ color: PRIORITY_TONE_META[tone].color }} title={`${t('filter.priority')}: ${name}`}>
      <Flag aria-hidden className="size-3" fill="currentColor" />
      <span className="sr-only">{name}, </span>
    </span>
  );
}

export function Code({ code }: { code: string | null }) {
  return code ? <span className="font-mono text-xs">{code}</span> : null;
}

export function People({ list }: { list: AssigneeSnippet[] }) {
  const t = useTranslations();
  if (!list.length) return <span>{t('card.unassigned')}</span>;
  const extra = list.length - 3;
  return (
    <span className="flex items-center -space-x-1" title={list.map((a) => a.displayName).join(', ')}>
      {list.slice(0, 3).map((a, i) => (
        <UserAvatar key={i} displayName={a.displayName} avatarUrl={a.avatarUrl} avatarColor={a.avatarColor} size="xs" className="ring-2 ring-surface" />
      ))}
      {extra > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-surface-2 font-mono text-[9px] text-ink-2 ring-2 ring-surface">+{extra}</span>
      )}
    </span>
  );
}
