'use client';

/**
 * Mục "Nhắc quá hạn" (preview `pOverdue`). API V1: GET/PATCH /api/settings/overdue-reminder-config (Boss/Admin; trang chặn vai trò khác).
 * Giữ V1: tắt thì ẩn cấu hình chi tiết; mỗi nhóm phải giữ ít nhất 1 mục; "Chọn tất cả" chỉ chọn (không bỏ được);
 * PATCH gửi nguyên form.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { useErrorMessage } from '@/lib/useErrorMessage';
import type { OverdueReminderConfigInput } from '../../types';
import { useOverdueReminderConfig, useUpdateOverdueReminderConfig } from '../../hooks/useOverdueReminderConfig';
import { OVERDUE_CATEGORIES, OVERDUE_INDIVIDUAL, overdueFormFrom } from '../../lib/config-forms';
import { toggleMin1 } from '../../lib/schedule';
import { CheckList, DayPicker, ScheduleSummary, TimePicker, useDayList } from '../shell/choices';
import { FormSkeleton, MasterSwitch, Note, PanelError, PanelHead, SettingsBlock } from '../shell/parts';
import { useReportDirty } from '../shell/SettingsDirty';

const CAT_DOT: Record<string, string> = {
  PENDING_APPROVAL: 'bg-c-approval', PENDING_REVIEW: 'bg-c-review', IN_PROGRESS: 'bg-c-progress', WAITING_ACKNOWLEDGE: 'bg-c-pickup',
};

export function OverduePage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const dayList = useDayList();
  const { data, isLoading, isError, refetch } = useOverdueReminderConfig();
  const update = useUpdateOverdueReminderConfig();
  const [base, setBase] = React.useState<OverdueReminderConfigInput | null>(null);
  const [form, setForm] = React.useState<OverdueReminderConfigInput | null>(null);
  const dirty = !!base && !!form && JSON.stringify(base) !== JSON.stringify(form);
  useReportDirty(dirty);

  React.useEffect(() => {
    if (!data || update.isPending) return;
    const f = overdueFormFrom(data);
    setBase(f);
    setForm(f);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = <K extends keyof OverdueReminderConfigInput>(k: K, v: OverdueReminderConfigInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!form) return;
    try {
      const saved = await update.mutateAsync(form);
      const f = overdueFormFrom(saved);
      setBase(f);
      setForm(f);
      toast.success(t('set.saved._', { s: t('set.s.overdue') }));
    } catch (err) {
      toast.error(errMsg(err, 'Lỗi khi lưu'));
    }
  }

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead title={t('set.s.overdue')} description={t('set.d.overdue')} />
      {isLoading ? <FormSkeleton blocks={3} /> : isError || !form ? <PanelError onRetry={() => refetch()} /> : (
        <div data-testid="ov-form">
          <MasterSwitch id="ov-master" title={t('set.ov.master')} hint={t('set.ov.masterH')} checked={form.enabled} onChange={(v) => patch('enabled', v)} />
          {form.enabled && form.sendDays.length === 0 && <Note tone="warn" role="status">{t('set.ov.warnDays')}</Note>}
          {form.enabled && (
            <>
              <SettingsBlock id="ov-sched" title={t('set.dg.sched')} description={t('setx.ov.schedH')}>
                <DayPicker id="ov-days" label={t('set.ov.days')} days={form.sendDays} onChange={(d) => patch('sendDays', d)} />
                <TimePicker id="ov-time" hour={form.sendHour} minute={form.sendMinute} onChange={(h, m) => setForm({ ...form, sendHour: h, sendMinute: m })} />
                <ScheduleSummary parts={form.sendDays.length ? [dayList(form.sendDays)] : []} hour={form.sendHour} minute={form.sendMinute} />
              </SettingsBlock>
              <SettingsBlock id="ov-cat" title={t('set.ov.cat')} description={t('set.ov.catH')} aside={t('set.min1')}>
                <CheckList
                  testId="ov-cat-list"
                  items={OVERDUE_CATEGORIES.map((k) => {
                    const last = form.digestCategories.length <= 1 && form.digestCategories.includes(k);
                    return { value: k, title: t(`set.oc.${k}._`), description: t(`set.oc.${k}.d`), disabled: last, title_attr: last ? t('set.min1') : undefined, pre: <span aria-hidden className={`size-2 flex-none rounded-full ${CAT_DOT[k]}`} /> };
                  })}
                  selected={form.digestCategories}
                  onToggle={(k) => patch('digestCategories', toggleMin1(form.digestCategories, k as never))}
                  onAll={() => patch('digestCategories', [...OVERDUE_CATEGORIES])}
                  allOnly
                />
              </SettingsBlock>
              <SettingsBlock id="ov-ind" title={t('set.ov.ind')} description={t('set.ov.indH')} aside={t('set.min1')}>
                <CheckList
                  testId="ov-ind-list"
                  items={OVERDUE_INDIVIDUAL.map((k) => {
                    const last = form.individualEmailTypes.length <= 1 && form.individualEmailTypes.includes(k);
                    return { value: k, title: t(`set.oi.${k}._`), description: t(`set.oi.${k}.d`), disabled: last, title_attr: last ? t('set.min1') : undefined };
                  })}
                  selected={form.individualEmailTypes}
                  onToggle={(k) => patch('individualEmailTypes', toggleMin1(form.individualEmailTypes, k as never))}
                  onAll={() => patch('individualEmailTypes', [...OVERDUE_INDIVIDUAL])}
                  allOnly
                />
              </SettingsBlock>
            </>
          )}
          <StickySaveBar dirty={dirty} saving={update.isPending} onSave={save} onReset={() => base && setForm(base)} message={t('set.dirty')} saveText={t('set.save')} resetText={t('set.undo')} />
        </div>
      )}
    </section>
  );
}
