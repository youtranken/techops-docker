'use client';

/**
 * Sidebar V2 (preview ds-v2 `.sb .brand .nav .nav-h .sb-foot`).
 * Luật hiện menu giữ nguyên V1 — xem nav/nav-model.ts (buildNav, có test đối chiếu V1).
 * - Desktop: cột 240px, thu gọn thành cột icon 64px kèm tooltip (nhớ bằng cookie, xem DashboardShell).
 * - ≤1023px: ngăn kéo (DashboardShell lo vị trí/nền mờ); luôn ở dạng mở rộng.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard, ListTodo, Star, CheckCheck, Headphones, BarChart3, Users, History, Settings,
  BarChart2, LayoutList, User, Shield, Flag, ListChecks, FileText, Bell, CalendarClock, AlarmClock, Mail,
  ChevronDown, ChevronsLeft, ChevronsRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskCounters } from '@/modules/tasks/hooks/useTaskTracking';
import { ROLE_LABELS } from '@/lib/constants';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { activeNav, type NavGroup, type NavIcon, type NavLink, type NavSection } from './nav/nav-model';

const ICONS: Record<NavIcon, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  home: LayoutDashboard, tasks: ListTodo, star: Star, unseen: CheckCheck, helpdesk: Headphones, reports: BarChart3,
  people: Users, logs: History, settings: Settings, chart: BarChart2, list: LayoutList, user: User, shield: Shield,
  flag: Flag, listChecks: ListChecks, file: FileText, bell: Bell, digest: CalendarClock, alarm: AlarmClock, mail: Mail,
};

export interface SidebarUser { displayName: string; roleName: string; avatarUrl?: string | null; avatarColor?: string | null }

interface SidebarProps {
  groups: NavGroup[];
  user: SidebarUser;
  /** thu gọn thành cột icon (chỉ desktop) */
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** đang là ngăn kéo mobile */
  drawer: boolean;
  onCloseDrawer: () => void;
  isPrivileged: boolean;
}

const itemBase =
  'group/it relative flex items-center gap-2.5 rounded-ctl text-ink-2 no-underline transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-text';
const itemActive = 'bg-primary-soft text-primary-text hover:bg-primary-soft hover:text-primary-text';

/** Tooltip khi thu gọn (preview không có — tự thêm theo yêu cầu A1-4) */
function Tip({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-sm border border-pop-line bg-pop px-2 py-1 text-xs font-medium text-ink opacity-0 shadow-v2-pop transition-opacity group-hover/it:opacity-100 group-focus-visible/it:opacity-100"
    >
      {text}
    </span>
  );
}

function Count({ n, collapsed }: { n: number; collapsed: boolean }) {
  if (collapsed) {
    if (!n) return null;
    return (
      <span className="absolute right-1 top-0.5 min-w-4 rounded-pill bg-primary-fill px-1 text-center font-mono text-[10px] leading-4 text-primary-fill-ink">
        {n > 99 ? '99+' : n}
      </span>
    );
  }
  return <span className="ml-auto font-mono text-xs text-ink-3">{n ? (n > 99 ? '99+' : n) : ''}</span>;
}

export function Sidebar({ groups, user, collapsed, onToggleCollapse, drawer, onCloseDrawer, isPrivileged }: SidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const view = useSearchParams().get('view');
  const active = activeNav(groups, pathname, view);
  const { data: counters } = useTaskCounters(isPrivileged);
  const mini = collapsed && !drawer;

  // Nhóm con: tự mở khi đang ở route của nhóm (giống V1), người dùng bấm để mở/đóng
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (active.section) setOpen((o) => (o[active.section!] ? o : { ...o, [active.section!]: true }));
  }, [active.section]);

  const countOf = (l: NavLink) => (l.counter ? counters?.[l.counter] ?? 0 : 0);
  const roleLabel = ROLE_LABELS[user.roleName] ?? user.roleName;

  function renderLink(l: NavLink, nested = false) {
    const Icon = l.icon ? ICONS[l.icon] : null;
    const isActive = active.link === l.key;
    const label = t(l.label);
    const n = countOf(l);
    const sub = l.sub || nested;
    return (
      <Link
        key={l.key}
        href={l.href}
        aria-current={isActive ? 'page' : undefined}
        aria-label={mini ? (l.counter && n ? t('nav.count', { label, n }) : label) : undefined}
        data-nav={l.key}
        className={cn(
          itemBase,
          mini ? 'h-9 justify-center px-0' : sub ? 'h-8 pl-[38px] pr-2.5 text-[13px]' : 'h-9 px-2.5 text-sm font-medium',
          isActive && itemActive,
        )}
      >
        {Icon && (
          <Icon
            aria-hidden
            className={cn(
              'shrink-0',
              sub && !mini ? 'size-[15px]' : 'size-[18px]',
              l.icon === 'star' && 'fill-amber text-amber',
            )}
          />
        )}
        {!mini && <span className="min-w-0 truncate">{label}</span>}
        {l.counter && <Count n={n} collapsed={mini} />}
        {mini && <Tip text={l.counter && n ? `${label} (${n})` : label} />}
      </Link>
    );
  }

  function renderSection(s: NavSection) {
    const Icon = ICONS[s.icon];
    const label = t(s.label);
    const inSection = active.section === s.key;
    if (mini) {
      return (
        <Link
          key={s.key}
          href={s.href}
          aria-label={label}
          aria-current={inSection ? 'page' : undefined}
          data-nav={s.key}
          className={cn(itemBase, 'h-9 justify-center px-0', inSection && itemActive)}
        >
          <Icon aria-hidden className="size-[18px] shrink-0" />
          <Tip text={label} />
        </Link>
      );
    }
    const isOpen = !!open[s.key];
    const panelId = `nav-sec-${s.key}`;
    return (
      <div key={s.key}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          data-nav={s.key}
          onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
          className={cn(itemBase, 'h-9 w-full px-2.5 text-left text-sm font-medium', inSection && 'text-ink')}
        >
          <Icon aria-hidden className={cn('size-[18px] shrink-0', inSection && 'text-primary-text')} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-ink-3 transition-transform', isOpen && 'rotate-180')} />
        </button>
        {isOpen && (
          <div id={panelId} className="mt-0.5 space-y-0.5">
            {s.children.map((c) =>
              c.kind === 'heading' ? (
                <div key={c.key} className="pb-1 pl-[38px] pr-2.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                  {t(c.label)}
                </div>
              ) : (
                renderLink(c, true)
              ),
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      id="app-sidebar"
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-line bg-surface dark:bg-[#13161B]',
        drawer ? 'w-[272px] max-w-[86vw] dark:border-pop-line dark:bg-pop' : mini ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand: logo PMH V1 + TechOps + dòng phụ */}
      <div className={cn('flex shrink-0 items-center pt-4', mini ? 'justify-center px-2 pb-3' : 'px-3 pb-2')}>
        <Link
          href="/"
          aria-label={mini ? 'TechOps' : undefined}
          className={cn('flex min-w-0 items-center gap-2.5 rounded-ctl no-underline', !mini && 'px-2 py-1')}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-pmh.png" alt="PMH" className="size-8 shrink-0 object-contain" />
          {!mini && (
            <span className="min-w-0">
              <b className="block font-head text-base font-semibold leading-tight tracking-tight text-ink">{t('app.name')}</b>
              <small className="block truncate text-xs text-ink-3">{t('app.org')}</small>
            </span>
          )}
        </Link>
        {drawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            aria-label={t('nav.close')}
            className="ml-auto grid size-9 place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <X aria-hidden className="size-[18px]" />
          </button>
        )}
      </div>

      <nav aria-label={t('nav.label')} className={cn('min-h-0 flex-1 px-3 pb-3', mini ? 'overflow-visible px-2' : 'overflow-y-auto')}>
        {groups.map((g, gi) => (
          <div key={g.key} role="group" aria-label={t(g.label)} className="space-y-0.5">
            {mini ? (
              gi > 0 && <hr className="mx-2 my-2 border-line" />
            ) : (
              <div className="px-2.5 pb-1.5 pt-3.5 text-xs font-medium text-ink-3">{t(g.label)}</div>
            )}
            {g.entries.map((e) => (e.kind === 'link' ? renderLink(e) : renderSection(e)))}
          </div>
        ))}
      </nav>

      {/* Chân: người dùng + nút thu gọn (chỉ desktop, nằm TRONG sidebar → không đè nội dung) */}
      <div className={cn('flex shrink-0 items-center gap-2.5 border-t border-line', mini ? 'flex-col px-2 py-3' : 'px-3 py-3')}>
        <UserAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} avatarColor={user.avatarColor} size="md" />
        {!mini && (
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[13px] font-medium text-ink">{user.displayName}</b>
            <span className="block truncate text-xs text-ink-3">{roleLabel}</span>
          </div>
        )}
        {!drawer && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            aria-pressed={collapsed}
            className="group/it relative hidden size-8 shrink-0 place-items-center rounded-ctl text-ink-3 hover:bg-surface-2 hover:text-ink lg:grid"
          >
            {collapsed ? <ChevronsRight aria-hidden className="size-4" /> : <ChevronsLeft aria-hidden className="size-4" />}
            {mini && <Tip text={t('nav.expand')} />}
          </button>
        )}
      </div>
    </aside>
  );
}
