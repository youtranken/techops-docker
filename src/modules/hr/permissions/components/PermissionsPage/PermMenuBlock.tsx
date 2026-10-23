'use client';

/**
 * 1 khối menu trong phân quyền theo người (preview permissions `uMenus`): [biểu tượng · tên · mô tả · công tắc menu]
 * + các tính năng bên dưới (công tắc khoá khi menu tắt — như V1). Dòng đã đổi mà chưa lưu có nền nhạt.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3, ChevronDown, Headphones, History, Info, Settings, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { MenuConfig } from '../../types';
import { featureOn, menuOn, type MenuPerm } from '../../view/perm-logic';

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  logs: History, analytics: BarChart3, helpdesk: Headphones, hr: Users, settings: Settings,
};
/** Mô tả trong copy.js nhắc "Vice Manager" → dùng khoá riêng nói đúng nhãn V1 */
const DESC_OVERRIDE: Record<string, string> = { 'hr.deactivate': 'ppx.fd.hr.deactivate', 'hr.delete': 'ppx.fd.hr.delete' };

const sw = 'h-5 w-[34px] border-0 data-[state=unchecked]:bg-[color-mix(in_srgb,var(--ink-3)_45%,var(--surface))] [&>span]:size-4 [&>span]:data-[state=checked]:translate-x-[14px] [&>span]:data-[state=unchecked]:translate-x-0.5 [&>span]:dark:bg-ink disabled:opacity-35';
const chg = 'bg-[color-mix(in_srgb,var(--primary-soft)_45%,var(--surface))]';

export function PermMenuBlock({ m, draft, saved, onMenu, onFeature }: {
  m: MenuConfig; draft: MenuPerm; saved: MenuPerm;
  onMenu: (menu: string, on: boolean) => void;
  onFeature: (menu: string, feat: string, on: boolean) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(true);
  const Icon = ICON[m.key] ?? Settings;
  const on = menuOn(draft, m.key);
  const name = t(`pp.menu.${m.key}`);
  const bodyId = `perm-b-${m.key}`;
  return (
    <section aria-label={name} data-menu={m.key} className="mb-2.5 overflow-clip rounded-card border border-line bg-surface shadow-v2-1">
      <div className={cn('grid min-h-[62px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 pl-2 pr-4 max-[680px]:pl-1', on !== menuOn(saved, m.key) && chg)}>
        <div className="flex min-w-0 items-center gap-2.5">
          {m.features.length ? (
            <button type="button" aria-expanded={open} aria-controls={bodyId} aria-label={t('pp.px.toggle', { m: name })} onClick={() => setOpen((o) => !o)}
              className="grid size-7 flex-none place-items-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronDown aria-hidden className={cn('size-4 transition-transform motion-reduce:transition-none', !open && '-rotate-90')} />
            </button>
          ) : <span className="w-7 flex-none" />}
          <span className="grid size-8 flex-none place-items-center rounded-ctl bg-surface-2 text-ink-2 max-[680px]:hidden"><Icon className="size-[17px]" /></span>
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-baseline gap-2 max-[680px]:flex-col max-[680px]:gap-0.5">
              <b className="truncate font-head text-sm font-semibold text-ink">{name}</b>
              {m.features.length > 0 && <span className="whitespace-nowrap text-xs text-ink-3">{t('pp.px.nFeat', { n: m.features.length })}</span>}
            </span>
            <small className="line-clamp-2 text-xs leading-[1.4] text-ink-3">{t(`pp.md.${m.key}`)}</small>
          </span>
        </div>
        <Switch checked={on} onCheckedChange={(c) => onMenu(m.key, c)} aria-label={name} className={sw} data-sw={m.key} />
      </div>
      {m.features.length > 0 && (
        <div id={bodyId} hidden={!open} className={cn('border-t border-line', !on && '[&>[data-f]]:opacity-60')}>
          {!on && (
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 py-2 pl-[88px] pr-4 text-xs text-ink-2 max-[680px]:pl-9">
              <Info aria-hidden className="size-3.5 text-ink-3" />{t('pp.px.menuOff')}
            </div>
          )}
          {m.features.map((f) => {
            const k = `${m.key}.${f.key}`;
            const fo = featureOn(draft, m.key, f.key);
            const label = t(`pp.feat.${k}`);
            return (
              <div key={f.key} data-f={k} className={cn('grid min-h-[54px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2 pl-[88px] pr-4 first:border-t-0 max-[680px]:pl-9', fo !== featureOn(saved, m.key, f.key) && chg)}>
                <span className="flex min-w-0 flex-col">
                  <b className="text-[13px] font-medium leading-[1.4] text-ink">{label}</b>
                  <small className="line-clamp-2 text-xs leading-[1.4] text-ink-3">{t(DESC_OVERRIDE[k] ?? `pp.fd.${k}`)}</small>
                </span>
                <Switch checked={fo} disabled={!on} onCheckedChange={(c) => onFeature(m.key, f.key, c)} aria-label={`${name} — ${label}`} className={sw} data-sw={k} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
