'use client';

/**
 * Bản nháp quyền menu của nhân viên đang chọn. Mỗi lần bật/tắt áp phép biến đổi V1 (toggleMenu/toggleFeature);
 * Lưu = 1 PUT /api/hr/sidebar-permissions cùng dạng body V1. Đổi người khi còn thay đổi → hỏi bỏ thay đổi.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import type { UserPermRow } from '../../types';
import { useSavePermission } from '../../hooks/useSidebarPermissions';
import { changeCount, savePayload, toggleFeature, toggleMenu, type MenuPerm } from '../../view/perm-logic';

const readHash = () => (typeof window === 'undefined' ? null : /user=([\w-]+)/.exec(window.location.hash)?.[1] ?? null);

export function usePermEditor(rows: UserPermRow[] | undefined) {
  const t = useTranslations();
  const confirm = useConfirm();
  const save = useSavePermission();
  const qc = useQueryClient();
  const [uid, setUid] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<MenuPerm | null>(null);

  // người đang chọn: #user=… (từ menu "Phân quyền menu" ở trang Nhân sự) → không có thì người đầu danh sách
  React.useEffect(() => {
    if (!rows?.length) return;
    if (uid && rows.some((r) => r.id === uid)) return;
    const h = readHash();
    setUid(h && rows.some((r) => r.id === h) ? h : rows[0].id);
  }, [rows, uid]);

  const user = rows?.find((r) => r.id === uid) ?? null;
  const saved: MenuPerm | null = user ? { visibleMenus: user.visibleMenus, featurePermissions: user.featurePermissions } : null;
  const cur = draft ?? saved;
  const changes = saved && draft ? changeCount(saved, draft) : 0;

  // cảnh báo rời trang khi còn thay đổi
  React.useEffect(() => {
    if (!changes) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [changes]);

  async function pick(id: string) {
    if (id === uid) return;
    if (changes && !(await confirm({ title: t('pp.sv.leaveT', { n: changes }), description: t('pp.sv.leaveD'), confirmText: t('pp.sv.leaveOk'), danger: true }))) return;
    setDraft(null);
    setUid(id);
    try { history.replaceState(null, '', `${location.pathname}${location.search}#user=${id}`); } catch { /* bỏ qua */ }
  }
  const onMenu = (m: string, on: boolean) => cur && setDraft(toggleMenu(cur, m, on));
  const onFeature = (m: string, f: string, on: boolean) => cur && setDraft(toggleFeature(cur, m, f, on));
  const undo = () => { setDraft(null); toast.info(t('pp.t.undone')); };
  function commit() {
    if (!user || !draft) return;
    const n = changes;
    save.mutate(savePayload(user.id, draft), {
      onSuccess: () => {
        // ghi ngay bản đã lưu vào cache (tránh nháy về giá trị cũ trong lúc tải lại)
        qc.setQueryData<UserPermRow[]>(['hr', 'sidebar-permissions'], (old) => old?.map((r) => (r.id === user.id ? { ...r, ...draft } : r)));
        setDraft(null);
        toast.success(t('pp.t.userSaved', { n, u: user.displayName })); },
    });
  }

  return { uid, user, saved, cur, changes, pick, onMenu, onFeature, undo, commit, saving: save.isPending };
}
