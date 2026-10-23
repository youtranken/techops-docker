'use client';

/**
 * Hộp "Lịch tự động" (preview `dlgCron`, V1 CronPanel): 2 khung giờ bật/tắt + giờ chạy.
 * Gửi đúng 6 trường như V1 (`cronPayload`). V1 dùng 2 ô số giờ/phút — V2 dùng 1 ô giờ, cùng giá trị.
 * V1 cho trùng giờ 2 khung → V2 cũng cho (không thêm luật "trùng giờ" của preview).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { useHelpdeskCronConfig } from '../../hooks/useHelpdeskCronConfig';
import { cronErrors, cronFormFrom, cronPayload, cronTimes, fmtDateTime, type CronForm } from './hd-logic';
import { useCounts } from './HdSyncBar';

export function HdCronDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const counts = useCounts();
  const { config, isLoading, save, isSaving } = useHelpdeskCronConfig();
  const [form, setForm] = React.useState<CronForm>(() => cronFormFrom(config));
  const [showErr, setShowErr] = React.useState(false);
  React.useEffect(() => { if (open) { setForm(cronFormFrom(config)); setShowErr(false); } }, [open, config]);

  const errs = showErr ? cronErrors(form) : {};
  const on = [form.e1 && form.t1, form.e2 && form.t2].filter(Boolean) as string[];
  const submit = () => {
    if (Object.keys(cronErrors(form)).length) { setShowErr(true); return; }
    save(cronPayload(form, config), {
      onSuccess: (c) => { const ts = cronTimes(c); toast.success(ts.length ? t('hd.toast.cron', { t: ts.join(', ') }) : t('hd.toast.cronOff')); onClose(); },
      onError: (e) => toast.error(errMsg(e)),
    });
  };

  const slot = (i: 1 | 2, label: string) => {
    const e = i === 1 ? form.e1 : form.e2;
    const v = i === 1 ? form.t1 : form.t2;
    return (
      <div className={cn('border-b border-line py-3.5 first:pt-1 last:border-b-0')} data-slot={i}>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={e} data-testid={`hd-cron-e${i}`}
            onChange={(ev) => setForm((p) => ({ ...p, [`e${i}`]: ev.target.checked }))} />
          {label}
        </label>
        <Field id={`hd-cron-t${i}`} label={t('hd.cron.time')} optional={false} className={cn('ml-[26px] mt-2.5 w-[150px] max-[680px]:w-auto', !e && 'opacity-50')}
          error={errs[`t${i}` as 't1' | 't2'] ? t('hd.cron.errEmpty') : undefined}>
          <input type="time" className={cn(inputClass, 'font-mono')} value={v} disabled={!e}
            onChange={(ev) => setForm((p) => ({ ...p, [`t${i}`]: ev.target.value }))} />
        </Field>
      </div>
    );
  };

  const last = config?.lastRunAt ? t('hd.cron.last', {
    t: fmtDateTime(config.lastRunAt, f.locale),
    r: config.lastResult ? counts(config.lastResult) : '—',
  }) : null;

  return (
    <ActionDialog open={open} onClose={onClose} size="sm" title={t('hd.cron.title')} sub={t('hd.cron.sub')} data-testid="hd-cron-dlg"
      okLabel={t('hd.cron.save')} onOk={submit} pending={isSaving} okDisabled={isLoading}>
      {slot(1, t('hd.cron.s1'))}
      {slot(2, t('hd.cron.s2'))}
      <p className="!mb-0 mt-3.5 text-[13px] text-ink-2" aria-live="polite">
        {on.length
          ? t('hd.cron.sum', { t: new Intl.ListFormat(f.locale, { type: 'conjunction' }).format(on) })
          : t('hd.cron.sumOff')}
      </p>
      {last && <p className="!mb-0 mt-1.5 text-xs text-ink-3">{last}</p>}
    </ActionDialog>
  );
}
