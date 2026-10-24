'use client';

/**
 * Mục "Thông báo" — email thông báo (preview `pNotifications`). API V1: GET/PATCH /api/settings/notification-prefs.
 * Giữ V1: Boss/Admin sửa cấu hình dùng chung (PATCH { emailEnabled, emailTypes }), nhân viên chỉ xem cấu hình của mình
 * (PATCH 403); công tắc tổng chỉ Admin thấy (V1 ẩn với Boss và nhân viên). Lọc theo người nhận chỉ Boss/Admin.
 * Thay đổi gom vào 1 thanh lưu.
 */
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { NOTIFICATION_TYPES } from '../../types';
import { useNotificationPrefs, useUpdateNotificationPrefs } from '../../hooks/useNotificationPrefs';
import { notifBody, visibleNotifTypes, type NotifFilter } from '../../lib/config-forms';
import { CheckList } from '../shell/choices';
import { FormSkeleton, HeadTag, MasterSwitch, Note, PanelError, PanelHead, SettingsBlock } from '../shell/parts';
import { useReportDirty } from '../shell/SettingsDirty';

type Form = { emailEnabled: boolean; emailTypes: string[] };
const same = (a: Form, b: Form) => a.emailEnabled === b.emailEnabled && a.emailTypes.length === b.emailTypes.length && a.emailTypes.every((x) => b.emailTypes.includes(x));

export function NotificationsPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  /** Nhãn vai trò = ROLE_LABELS V1 (BOSS "Quản lý") như A3-4 */
  const roleLabel = (r: string) => t(`ppx.role.${r}`);
  const { data: session } = useSession();
  const role = session?.user?.role?.name ?? 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const priv = isAdmin || role === 'BOSS';
  const readOnly = !priv;
  const { data, isLoading, isError, refetch } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const [base, setBase] = React.useState<Form | null>(null);
  const [form, setForm] = React.useState<Form | null>(null);
  const [filter, setFilter] = React.useState<NotifFilter>('all');
  const dirty = !readOnly && !!base && !!form && !same(base, form);
  useReportDirty(dirty);

  React.useEffect(() => {
    if (!data || update.isPending) return;
    const f = { emailEnabled: data.emailEnabled, emailTypes: [...data.emailTypes] };
    setBase(f);
    setForm(f);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form) return;
    try {
      await update.mutateAsync(notifBody(form));
      setBase(form);
      toast.success(t('set.saved._', { s: t('set.s.notifications') }));
    } catch (err) {
      toast.error(errMsg(err, 'Lỗi khi lưu'));
    }
  }

  const keys = visibleNotifTypes(role, filter);
  const off = !!form && !form.emailEnabled;
  const toggle = (k: string) => setForm((f) => f && ({ ...f, emailTypes: f.emailTypes.includes(k) ? f.emailTypes.filter((x) => x !== k) : [...f.emailTypes, k] }));
  const toggleAll = (checked: boolean) => setForm((f) => {
    if (!f) return f;
    const next = new Set(f.emailTypes);
    keys.forEach((k) => (checked ? next.add(k) : next.delete(k)));
    return { ...f, emailTypes: Array.from(next) };
  });
  const whoLabel = (k: string) => t('set.to', { w: NOTIFICATION_TYPES[k].roles.map((r) => roleLabel(r)).join(', ') });

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead
        title={t('set.s.notifications')}
        description={t('set.d.notifications')}
        tags={readOnly ? <HeadTag icon={Eye}>{t('set.ro._')}</HeadTag> : undefined}
      />
      {isLoading ? <FormSkeleton /> : isError || !form ? <PanelError onRetry={() => refetch()} /> : (
        <div data-testid="nt-form">
          {readOnly && <Note>{t('setx.nt.roNote')}</Note>}
          {isAdmin && (
            <MasterSwitch
              id="nt-master"
              title={t('set.nt.master')}
              hint={t('set.nt.masterH')}
              checked={form.emailEnabled}
              onChange={(v) => setForm({ ...form, emailEnabled: v })}
            />
          )}
          <SettingsBlock
            id="nt-types"
            title={t('set.nt.types')}
            description={t(priv ? 'set.nt.typesH' : 'set.nt.typesHe')}
          >
            {priv && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Segmented<NotifFilter>
                  ariaLabel={t('set.nt.filter')}
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: t('set.nt.f.all') },
                    { value: 'BOSS', label: roleLabel('BOSS') },
                    { value: 'EMPLOYEE', label: roleLabel('EMPLOYEE') },
                  ]}
                />
              </div>
            )}
            {isAdmin && off && <Note tone="warn">{t('set.nt.offNote')}</Note>}
            <CheckList
              testId="nt-list"
              items={keys.map((k) => ({ value: k, title: t(`set.nt.${k}._`), description: t(`set.nt.${k}.d`), who: priv ? whoLabel(k) : undefined }))}
              selected={form.emailTypes}
              onToggle={toggle}
              onAll={toggleAll}
              allLabel={t('set.selAllN', { n: keys.length })}
              disabled={readOnly || (isAdmin && off)}
              dim={isAdmin && off}
            />
          </SettingsBlock>
          <StickySaveBar dirty={dirty} saving={update.isPending} onSave={save} onReset={() => base && setForm(base)} message={t('set.dirty')} saveText={t('set.save')} resetText={t('set.undo')} />
        </div>
      )}
    </section>
  );
}
