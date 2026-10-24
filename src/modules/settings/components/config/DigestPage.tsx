'use client';

/**
 * Mục "Báo cáo định kỳ" (preview `pDigest`). API V1: GET/PATCH /api/settings/digest-config, POST …/send-test (Boss/Admin).
 * Giữ V1: tắt thì ẩn cấu hình chi tiết; PATCH gửi nguyên form; luật lịch/nội dung của route báo trước khi gửi;
 * "Gửi thử" dùng cấu hình ĐÃ LƯU (route đọc DB) — vẫn bấm được khi đang sửa như V1, kèm lời nhắc.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, inputClass, textareaClass } from '@/shared/ui/Field';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import type { DigestConfigInput } from '../../types';
import type { FieldError } from '../../lib/catalog-forms';
import { useDigestConfig, useSendTestDigest, useUpdateDigestConfig } from '../../hooks/useDigestConfig';
import { DIGEST_CONTENT_KEYS, digestBody, digestFormFrom, validateDigest } from '../../lib/config-forms';
import { CheckList, DayPicker, ScheduleSummary, TimePicker, fillNodes, useDayList } from '../shell/choices';
import { FormSkeleton, MasterSwitch, NoAccess, Note, PanelError, PanelHead, SettingsBlock, httpStatus } from '../shell/parts';
import { useReportDirty } from '../shell/SettingsDirty';
import { DigestRecipients } from './DigestRecipients';

type FieldK = 'emailSubject' | 'emailGreeting';

export function DigestPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const dayList = useDayList();
  const { data, isLoading, isError, error, refetch } = useDigestConfig();
  const update = useUpdateDigestConfig();
  const [base, setBase] = React.useState<DigestConfigInput | null>(null);
  const [form, setForm] = React.useState<DigestConfigInput | null>(null);
  const [errs, setErrs] = React.useState<Partial<Record<FieldK, FieldError>>>({});
  const dirty = !!base && !!form && JSON.stringify(digestBody(base)) !== JSON.stringify(digestBody(form));
  useReportDirty(dirty);

  React.useEffect(() => {
    if (isLoading || isError || update.isPending) return;
    const f = digestFormFrom(data ?? null);
    setBase(f);
    setForm(f);
  }, [data, isLoading, isError]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = <K extends keyof DigestConfigInput>(k: K, v: DigestConfigInput[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    if (k in errs) setErrs((e) => ({ ...e, [k]: undefined }));
  };

  async function save() {
    if (!form) return;
    const r = validateDigest(form);
    setErrs(r.fields);
    const first = (['emailSubject', 'emailGreeting'] as const).find((k) => r.fields[k]);
    if (first) { document.getElementById(`dg-${first}`)?.focus(); return; }
    if (r.form) { toast.error(t(r.form)); return; }
    try {
      const saved = await update.mutateAsync(digestBody(form));
      const f = digestFormFrom(saved);
      setBase(f);
      setForm(f);
      toast.success(t('set.saved._', { s: t('set.s.digest') }));
    } catch (err) {
      toast.error(errMsg(err, 'Lỗi khi lưu'));
    }
  }

  if (httpStatus(error) === 403) {
    return <section aria-labelledby="set-panel-title"><PanelHead title={t('set.s.digest')} description={t('set.d.digest')} /><NoAccess /></section>;
  }

  const noSched = !!form && !form.sendWeekly && !form.sendMonthly && form.sendDays.length === 0;
  const parts = form ? [form.sendWeekly && t('set.dg.sumW'), form.sendMonthly && t('set.dg.sumM'), form.sendDays.length > 0 && dayList(form.sendDays)].filter(Boolean) as string[] : [];
  const msg = (k: FieldK) => (errs[k] ? t(errs[k]!.key, errs[k]!.values) : undefined);

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead title={t('set.s.digest')} description={t('set.d.digest')} />
      {isLoading ? <FormSkeleton blocks={3} /> : isError || !form ? <PanelError onRetry={() => refetch()} /> : (
        <div data-testid="dg-form">
          <MasterSwitch id="dg-master" title={t('set.dg.master')} hint={t('set.dg.masterH')} checked={form.enabled} onChange={(v) => patch('enabled', v)} />
          {form.enabled && noSched && <Note tone="warn" role="status">{t('set.dg.warnSched')}</Note>}
          {form.enabled && form.contentTypes.length === 0 && <Note tone="warn" role="status">{t('set.dg.warnContent')}</Note>}
          {form.enabled && (
            <>
              <SettingsBlock id="dg-sched" title={t('set.dg.sched')} description={t('setx.dg.schedH')}>
                <div className="mb-4">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink">{t('set.dg.period')}</span>
                  <CheckList
                    columns={2}
                    items={[
                      { value: 'w', title: t('set.dg.weekly'), description: t('set.dg.weeklyH') },
                      { value: 'm', title: t('set.dg.monthly'), description: t('set.dg.monthlyH') },
                    ]}
                    selected={[form.sendWeekly && 'w', form.sendMonthly && 'm'].filter(Boolean) as string[]}
                    onToggle={(v) => (v === 'w' ? patch('sendWeekly', !form.sendWeekly) : patch('sendMonthly', !form.sendMonthly))}
                  />
                </div>
                <DayPicker id="dg-days" label={t('set.dg.days')} days={form.sendDays} onChange={(d) => patch('sendDays', d)} />
                <TimePicker id="dg-time" hour={form.sendHour} minute={form.sendMinute} onChange={(h, m) => setForm({ ...form, sendHour: h, sendMinute: m })} />
                <ScheduleSummary parts={parts} hour={form.sendHour} minute={form.sendMinute} />
              </SettingsBlock>

              <SettingsBlock
                id="dg-rcp"
                title={t('set.dg.rcp')}
                description={t('set.dg.rcpH')}
                aside={<span className={cn(form.recipientIds.length && 'font-medium text-primary-text')}>{form.recipientIds.length ? t('set.dg.rcpN', { n: form.recipientIds.length }) : t('set.dg.rcpAll')}</span>}
              >
                <DigestRecipients ids={form.recipientIds} onChange={(ids) => patch('recipientIds', ids)} />
              </SettingsBlock>

              <SettingsBlock id="dg-content" title={t('set.dg.content')} description={t('set.dg.contentH')}>
                <CheckList
                  testId="dg-content-list"
                  items={DIGEST_CONTENT_KEYS.map((k) => ({ value: k, title: t(`set.dc.${k}._`), description: t(`set.dc.${k}.d`) }))}
                  selected={form.contentTypes}
                  onToggle={(k) => patch('contentTypes', form.contentTypes.includes(k as never) ? form.contentTypes.filter((x) => x !== k) : [...form.contentTypes, k as never])}
                  onAll={(on) => patch('contentTypes', on ? [...DIGEST_CONTENT_KEYS] : [])}
                />
              </SettingsBlock>

              <SettingsBlock id="dg-tpl" title={t('set.dg.tpl')}>
                <Field id="dg-emailSubject" label={t('set.dg.subj')} required error={msg('emailSubject')} hint={fillNodes(t.raw('set.dg.subjH') as string, { v: <code className="rounded bg-surface-2 px-1 font-mono">{'{date}'}</code> })}>
                  <input className={inputClass} value={form.emailSubject} maxLength={200} onChange={(e) => patch('emailSubject', e.target.value)} />
                </Field>
                <Field id="dg-emailGreeting" label={t('set.dg.greet')} optional={false} error={msg('emailGreeting')}>
                  <textarea className={cn(textareaClass, 'min-h-[84px]')} rows={3} value={form.emailGreeting} maxLength={500} onChange={(e) => patch('emailGreeting', e.target.value)} />
                </Field>
                <DigestTest dirty={dirty} />
              </SettingsBlock>
            </>
          )}
          <StickySaveBar dirty={dirty} saving={update.isPending} onSave={save} onReset={() => { if (base) { setForm(base); setErrs({}); } }} message={t('set.dirty')} saveText={t('set.save')} resetText={t('set.undo')} />
        </div>
      )}
    </section>
  );
}

/** Gửi thử — V1: POST { email }, route dùng cấu hình đã lưu */
function DigestTest({ dirty }: { dirty: boolean }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const send = useSendTestDigest();
  const [to, setTo] = React.useState('');
  const [err, setErr] = React.useState<string | undefined>();

  async function go() {
    const v = to.trim();
    if (!v) { setErr(t('set.v.req')); document.getElementById('dg-test-to')?.focus(); return; }
    if (!z.string().email().safeParse(v).success) { setErr(t('set.v.mail')); document.getElementById('dg-test-to')?.focus(); return; }
    setErr(undefined);
    try {
      await send.mutateAsync(v);
      toast.success(t('set.dg.sent', { e: v }));
      setTo('');
    } catch (e) {
      toast.error(errMsg(e, 'Lỗi khi gửi'));
    }
  }

  return (
    <div className="mt-2 border-t border-line pt-4">
      <div className="flex items-end gap-2.5 max-[680px]:flex-col max-[680px]:items-stretch">
        <Field id="dg-test-to" label={t('set.dg.testTo')} optional={false} error={err} className="mb-0 min-w-0 flex-1">
          <input className={inputClass} type="email" value={to} placeholder="ten@pmh.com.vn" autoComplete="email" onChange={(e) => { setTo(e.target.value); setErr(undefined); }} />
        </Field>
        <Button type="button" variant="outline" size="md" onClick={go} disabled={send.isPending} className={cn('max-[680px]:h-11', err && 'mb-[26px] max-[680px]:mb-0')} data-testid="dg-test-btn">
          <Send aria-hidden />{t(send.isPending ? 'set.sending' : 'set.dg.test')}
        </Button>
      </div>
      <p className="m-0 mt-1.5 text-xs text-ink-3">{t(dirty ? 'set.testDirty' : 'set.dg.testH')}</p>
    </div>
  );
}
