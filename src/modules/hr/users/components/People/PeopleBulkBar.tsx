'use client';

/** Thanh hàng loạt (preview people `.bulk`): thay hàng lọc khi đang chọn. Đúng 4 thao tác V1 (bulk-action). */
import * as Menu from '@radix-ui/react-dropdown-menu';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoleLabel } from '../../../shared/HrPageHead';
import type { PeoplePageState } from './usePeoplePage';
import type { PeopleActions } from './usePeopleActions';

export function PeopleBulkBar({ s, a }: { s: PeoplePageState; a: PeopleActions }) {
  const t = useTranslations();
  const roleLabel = useRoleLabel();
  const ids = s.selected;
  const dis = a.bulkPending;
  const btn = 'bg-surface max-[680px]:h-11';
  return (
    <div role="toolbar" aria-label={t('pp.bulk.label')} data-testid="pp-bulk" className="mb-3 flex min-h-11 flex-wrap items-center gap-2 rounded-ctl bg-surface-2 py-[5px] pl-3.5 pr-1.5 max-[680px]:p-2.5">
      <b aria-live="polite" className="mr-1.5 whitespace-nowrap text-[13px] font-semibold text-ink max-[680px]:flex-[1_1_100%]">{t('pp.bulk.n', { n: ids.length })}</b>
      <Menu.Root modal={false}>
        <Menu.Trigger asChild>
          <Button type="button" variant="outline" size="xs" disabled={dis} className={btn}>
            {t('pp.bulk.role')}<ChevronDown aria-hidden />
          </Button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="start" sideOffset={6} className="v2-pop z-[65] min-w-[200px] rounded-card border border-line bg-surface p-1.5 text-ink shadow-v2-pop">
            {s.roles.map((r) => (
              <Menu.Item
                key={r.id}
                onSelect={() => a.runBulk('changeRole', ids, { id: r.id, label: roleLabel(r.name) })}
                className="flex min-h-9 cursor-default select-none items-center rounded-sm px-2.5 text-sm outline-none data-[highlighted]:bg-surface-2"
              >
                {roleLabel(r.name)}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <Button type="button" variant="outline" size="xs" disabled={dis} className={btn} onClick={() => a.runBulk('forceChangePassword', ids)}>{t('pp.bulk.force')}</Button>
      <Button type="button" variant="outline" size="xs" disabled={dis} className={btn} onClick={() => a.runBulk('activate', ids)}>{t('pp.bulk.unlock')}</Button>
      <Button type="button" variant="neg" size="xs" disabled={dis} className={btn} onClick={() => a.runBulk('deactivate', ids)}>{t('pp.bulk.lock')}</Button>
      <span className="flex-1 max-[680px]:hidden" />
      <Button type="button" variant="subtle" size="xs" className="max-[680px]:h-11" onClick={() => s.setSelected([])}>{t('pp.bulk.clear')}</Button>
    </div>
  );
}
