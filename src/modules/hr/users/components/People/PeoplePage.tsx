'use client';

/**
 * Trang Nhân sự V2 (A3-4) — preview `people.html`. Nghiệp vụ giữ V1 /hr/users: API, quyền theo vai trò + quyền menu `hr`,
 * Xuất CSV (ADMIN/BOSS), Tạo (ADMIN), hàng loạt (ADMIN/BOSS), phân trang phía máy chủ 20/trang.
 * Mới (chỉ giao diện): bảng yên tĩnh + menu ⋯, ngăn chi tiết có Lịch sử, hộp thoại V2, hỏi xác nhận trước khi vô hiệu hoá.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, Info, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/shared/ui/Pagination';
import { HrPageHead } from '../../../shared/HrPageHead';
import { exportHref } from '../../view/people-logic';
import { usePeoplePage } from './usePeoplePage';
import { usePeopleActions } from './usePeopleActions';
import { PeopleFilters } from './PeopleFilters';
import { PeopleBulkBar } from './PeopleBulkBar';
import { PeopleTable } from './PeopleTable';
import { UserDrawer } from './UserDrawer';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';
export function PeoplePage() {
  const t = useTranslations();
  const s = usePeoplePage();
  const a = usePeopleActions({ onCleared: () => s.setSelected([]) });
  const [creating, setCreating] = React.useState(false);
  const p = s.pagination;

  const actions = (
    <>
      {s.privileged && (
        <Button type="button" variant="outline" size="md" onClick={() => window.open(exportHref(s.filters), '_blank')} className="max-[680px]:h-11">
          <Download aria-hidden />{t('pp.export')}
        </Button>
      )}
      {s.isAdmin && (
        <Button type="button" size="md" onClick={() => setCreating(true)} className="max-[680px]:h-11" data-testid="pp-create-btn">
          <UserPlus aria-hidden />{t('pp.create')}
        </Button>
      )}
    </>
  );

  return (
    <div>
      <HrPageHead
        title={t('pp.title')}
        sub={p ? t(s.privileged ? 'ppx.sub' : 'pp.subEmp', { n: p.total }) : ' '}
        actions={s.privileged || s.isAdmin ? actions : undefined}
        showPerms={s.privileged}
      />
      {s.selected.length > 0 ? <PeopleBulkBar s={s} a={a} /> : <PeopleFilters s={s} />}
      {!s.privileged && s.role && (
        <p className="mb-3 flex items-center gap-2 text-[13px] text-ink-2"><Info aria-hidden className="size-4 flex-none text-ink-3" />{t('pp.empNote')}</p>
      )}
      <PeopleTable s={s} a={a} />
      {p && p.totalPages > 1 && <Pagination page={p.page} pageSize={p.limit} total={p.total} onPageChange={s.setPage} />}

      <UserDrawer s={s} a={a} />
      {s.isAdmin && <CreateUserDialog open={creating} onClose={() => setCreating(false)} />}
      <EditUserDialog user={a.editing} onClose={() => a.setEditing(null)} canChangeRole={s.privileged} isSelf={a.editing?.id === s.selfId} />
      <ResetPasswordDialog user={a.pwTarget} onClose={() => a.setPwTarget(null)} />
    </div>
  );
}
