'use client';

/**
 * Ngăn chi tiết người dùng (preview people `App.drawer` + `.pf` + `.kv` + Lịch sử) — gộp hộp "Lịch sử hoạt động" V1.
 * Thông tin = dữ liệu dòng V1 (không gọi API mới). Lịch sử = GET /api/logs/users?userId (như V1, 15/trang).
 * Nhân viên xem người khác: chỉ thông tin cơ bản (API lịch sử V1 chỉ trả của chính họ).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, X, KeyRound, Lock, Pencil } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { KvGrid } from '@/shared/ui/KvGrid';
import { QuickMenu } from '@/shared/ui/QuickMenu';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { DialogNote } from '@/shared/ui/ActionDialog';
import { useFormat } from '@/i18n/useFormat';
import { useRoleLabel } from '../../../shared/HrPageHead';
import { canSeeHistory, rowActionGroups } from '../../view/people-logic';
import type { UserWithRoleAndTasks } from '../../types';
import { UserHistoryList } from './UserHistoryList';
import { UserStatus, useRowMenu } from './PeopleTable';
import type { PeoplePageState } from './usePeoplePage';
import type { PeopleActions } from './usePeopleActions';

const iconBtn = 'grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function UserDrawer({ s, a }: { s: PeoplePageState; a: PeopleActions }) {
  const t = useTranslations();
  const id = a.drawer?.id ?? null;
  const found = s.rows.find((u) => u.id === id) ?? null;
  // giữ người cuối để nội dung không biến mất khi ngăn đang trượt ra
  const [last, setLast] = React.useState<UserWithRoleAndTasks | null>(found);
  React.useEffect(() => { if (found) setLast(found); }, [found]);
  const u = found ?? last;
  const open = !!id && !!found;
  const menu = useRowMenu(s, a);
  const close = () => a.setDrawer(null);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="right" aria-describedby={undefined} data-testid="pp-drawer" className="v2-drawer flex w-full flex-col gap-0 border-0 bg-surface p-0 sm:max-w-[480px] max-[680px]:max-w-none">
        <header className="flex h-14 flex-none items-center gap-1 border-b border-line pl-4 pr-3 max-[680px]:pl-3 max-[680px]:pr-2">
          <button type="button" onClick={close} className="-ml-1.5 inline-flex h-9 items-center gap-1 rounded-md pl-1 pr-2.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink min-[681px]:hidden">
            <ChevronLeft aria-hidden className="size-5" />{t('pp.back')}
          </button>
          <span className="flex-1" />
          {u && <QuickMenu groups={menu(u)} label={t('pp.more', { n: u.displayName })} />}
          <span aria-hidden className="mx-1 h-5 w-px bg-line max-[680px]:hidden" />
          <button type="button" onClick={close} className={`${iconBtn} max-[680px]:hidden`} aria-label={t('app.close')}>
            <X aria-hidden className="size-5" />
          </button>
        </header>
        {u && <DrawerBody u={u} s={s} a={a} history={!!a.drawer?.history} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ u, s, a, history }: { u: UserWithRoleAndTasks; s: PeoplePageState; a: PeopleActions; history: boolean }) {
  const t = useTranslations();
  const fmt = useFormat();
  const roleLabel = useRoleLabel();
  const full = canSeeHistory(u, s.ctx);
  const actions = rowActionGroups({ id: u.id, isActive: u.isActive, email: u.email, hasTasks: u.hasTasks, roleName: u.role.name }, s.ctx).flat();
  const histRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => { if (history) histRef.current?.scrollIntoView({ block: 'start' }); }, [history, u.id]);

  const items = [
    { key: 'role', label: t('pp.col.role'), value: roleLabel(u.role.name) },
    { key: 'st', label: t('pp.col.status'), value: <UserStatus u={u} /> },
    { key: 'user', label: t('pp.k.user'), value: <span className="font-mono text-[13px]">{u.username}</span> },
    { key: 'created', label: t('pp.k.created'), value: <span className="font-mono text-[13px]">{fmt.date(u.createdAt)}</span> },
    ...(full ? [{ key: 'pw', label: t('pp.k.pw'), value: u.passwordChangedAt ? <span className="font-mono text-[13px]">{fmt.date(u.passwordChangedAt)}</span> : <span className="text-ink-3">{t('pp.k.pwNone')}</span> }] : []),
  ];

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-5 max-[680px]:px-4">
        <div className="mb-5 flex items-center gap-3.5">
          <UserAvatar displayName={u.displayName} avatarUrl={u.profile?.avatarUrl} avatarColor={u.profile?.avatarColor} size="lg" className="size-12 max-[680px]:size-10" />
          <div className="min-w-0">
            <SheetTitle asChild>
              <h2 className="m-0 font-head text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">{u.displayName}</h2>
            </SheetTitle>
            <p className="m-0 mt-0.5 text-[13px] text-ink-2 [overflow-wrap:anywhere]">{u.email ?? <span className="text-ink-3">{t('pp.noEmail')}</span>}</p>
          </div>
        </div>
        {!u.isActive && <DialogNote icon={Lock} className="mb-5 mt-0 first:mt-0">{t('pp.n.locked')}</DialogNote>}
        {u.isActive && u.mustChangePassword && <DialogNote tone="warn" icon={KeyRound} className="mb-5 mt-0 first:mt-0">{t('pp.n.mc')}</DialogNote>}
        <div className="overflow-hidden rounded-card border border-line">
          <KvGrid items={items} />
        </div>
        {full ? (
          <section ref={histRef} className="mt-6 scroll-mt-4" data-testid="pp-history">
            <h3 className="m-0 mb-2.5 font-head text-sm font-semibold text-ink">{t('pp.m.hist')}</h3>
            <UserHistoryList userId={u.id} />
          </section>
        ) : (
          <DialogNote className="mt-5">{t('pp.n.limited')}</DialogNote>
        )}
      </div>
      {(actions.includes('edit') || actions.includes('password') || actions.includes('activate')) && (
        <div className="flex flex-none justify-end gap-2 border-t border-line px-4 py-3 max-[680px]:pb-[max(12px,env(safe-area-inset-bottom))] max-[680px]:[&>button]:h-11 max-[680px]:[&>button]:flex-1">
          {actions.includes('activate') && <Button type="button" size="md" onClick={() => a.run('activate', u)}>{t('pp.m.unlock')}</Button>}
          {actions.includes('password') && <Button type="button" variant="outline" size="md" onClick={() => a.run('password', u)}><KeyRound aria-hidden />{t('pp.m.pw')}</Button>}
          {actions.includes('edit') && (
            <Button type="button" size="md" onClick={() => a.run('edit', u)}><Pencil aria-hidden />{t(u.id === s.selfId ? 'pp.m.editMe' : 'pp.m.edit')}</Button>
          )}
        </div>
      )}
    </>
  );
}
