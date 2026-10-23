'use client';

/**
 * Trang Phân quyền V2 (A3-4) — preview `permissions.html`, phần "Theo người dùng" (đúng V1: quyền menu riêng cho
 * từng nhân viên đang hoạt động; ADMIN/BOSS luôn đủ quyền nên không có trong danh sách).
 * Trang con V1 /hr/permissions/{logs,users,analytics,helpdesk,settings} giữ nguyên, hiện thành bộ lọc menu.
 * "Theo vai trò" và "Quyền công việc riêng" của preview là Phase B (V1 không có / không có hiệu lực).
 */
import * as React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/States';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { PhaseBBadge } from '@/shared/ui/PhaseBBadge';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { HrPageHead, useRoleLabel } from '../../../shared/HrPageHead';
import { useSidebarPermissions } from '../../hooks/useSidebarPermissions';
import { changeCount, DEFAULT_PERM, menusFor, PERM_ROUTE_MENU } from '../../view/perm-logic';
import { usePermEditor } from './usePermEditor';
import { PermMenuBlock } from './PermMenuBlock';
import { PermUserList, PermUserPick } from './PermUserList';

const FILTERS = [null, 'logs', 'users', 'analytics', 'helpdesk', 'settings'] as const;

export function PermissionsPage({ route }: { route?: keyof typeof PERM_ROUTE_MENU }) {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const role = session?.user?.role?.name ?? '';
  const privileged = role === 'ADMIN' || role === 'BOSS';
  const q = useSidebarPermissions();
  const ed = usePermEditor(privileged ? q.data : undefined);
  const roleLabel = useRoleLabel();
  const [uq, setUq] = React.useState('');
  const menus = menusFor(route ? PERM_ROUTE_MENU[route] : null);
  const dev = process.env.NODE_ENV !== 'production';

  const head = <HrPageHead title={t('pp.pm.title')} sub={t('ppx.pm.sub')} showPerms={privileged || status === 'loading'} />;
  if (status !== 'loading' && !privileged) {
    return (
      <div>
        {head}
        <EmptyState icon={Lock} title={t('pp.na.t')} description={t('ppx.na.d')}
          action={<Button asChild size="md"><Link href="/hr/users">{t('pp.na.back')}</Link></Button>} />
      </div>
    );
  }
  const rows = q.data ?? [];
  const u = ed.user;

  return (
    <div className={cn(ed.changes > 0 && 'max-[680px]:pb-20')}>
      {head}
      <nav aria-label={t('ppx.pm.filter')} className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const on = (route ?? null) === f;
          return (
            <Link key={f ?? 'all'} href={f ? `/hr/permissions/${f}` : '/hr/permissions'} aria-current={on ? 'page' : undefined}
              className={cn('inline-flex h-8 items-center rounded-pill border px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-10',
                on ? 'border-primary bg-primary-soft text-primary-text' : 'border-line-2 bg-surface text-ink-2 hover:text-ink')}>
              {f ? t(`pp.menu.${PERM_ROUTE_MENU[f]}`) : t('ppx.pm.all')}
            </Link>
          );
        })}
      </nav>
      <p className="m-0 mb-4 text-xs text-ink-3">{t('ppx.pm.userD')}</p>
      {dev && (
        <p className="mb-4 flex items-start gap-2 rounded-card border border-dashed border-line-2 bg-surface px-3.5 py-2.5 text-[13px] text-ink-2">
          <PhaseBBadge className="ml-0 mt-0.5" /><span>{t('ppx.pm.pbRole')}</span>
        </p>
      )}

      {q.isLoading || status === 'loading' ? (
        <div className="grid gap-2.5" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[62px] rounded-card" />)}</div>
      ) : q.isError ? (
        <ErrorState title={t('pp.err.pt')} description={t('pp.err.d')} onRetry={() => void q.refetch()} className="rounded-card border border-line bg-surface" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={t('ppx.pm.noEmp')} description={t('ppx.u.empOnly')} className="rounded-card border border-line bg-surface" />
      ) : (
        <div className="grid grid-cols-[272px_minmax(0,1fr)] items-start gap-5 max-[1023px]:grid-cols-[minmax(0,1fr)]">
          <PermUserList rows={rows} q={uq} onQ={setUq} current={ed.uid} onPick={ed.pick} />
          <div className="min-w-0">
            <PermUserPick rows={rows} current={ed.uid} onPick={ed.pick} />
            {u && ed.cur && ed.saved && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 shadow-v2-1" data-testid="perm-user-head">
                  <UserAvatar displayName={u.displayName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="m-0 font-head text-base font-semibold leading-[1.3] text-ink">{u.displayName}</h2>
                    <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-2">
                      <span>{roleLabel(u.role.name)}</span><span aria-hidden>·</span><span className="font-mono text-xs">{u.username}</span><span aria-hidden>·</span>
                      {changeCount(ed.saved, DEFAULT_PERM) > 0
                        ? <span className="font-medium text-primary-text">{t('ppx.u.customN', { n: changeCount(ed.saved, DEFAULT_PERM) })}</span>
                        : <span>{t('pp.px.uNone')}</span>}
                    </p>
                  </div>
                </div>
                <div className="mx-0.5 mb-2.5 mt-1">
                  <h3 className="m-0 font-head text-sm font-semibold text-ink">{t('pp.u.menus')}</h3>
                  <p className="m-0 mt-0.5 text-xs text-ink-3">{t('pp.u.menusD')}</p>
                </div>
                {menus.map((m) => <PermMenuBlock key={m.key} m={m} draft={ed.cur!} saved={ed.saved!} onMenu={ed.onMenu} onFeature={ed.onFeature} />)}
                {dev && role === 'ADMIN' && (
                  <p className="mt-5 flex items-start gap-2 rounded-card border border-dashed border-line-2 bg-surface px-3.5 py-2.5 text-[13px] text-ink-2">
                    <PhaseBBadge className="ml-0 mt-0.5" /><span><b className="font-medium text-ink">{t('pp.u.tasks')}</b> — {t('ppx.u.tasksPB')}</span>
                  </p>
                )}
                <StickySaveBar dirty={ed.changes > 0} saving={ed.saving} onSave={ed.commit} onReset={ed.undo}
                  message={t('pp.sv.n', { n: ed.changes })} saveText={t('pp.sv.save')} resetText={t('pp.sv.undo')} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
