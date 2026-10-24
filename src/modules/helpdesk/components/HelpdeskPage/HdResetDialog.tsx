'use client';

/**
 * "Đặt lại dữ liệu Helpdesk" — chỉ ADMIN (API V1 `reset` + `reset/request-otp` đều requireRole ADMIN).
 * 2 bước như V1: gửi OTP tới email → nhập mã 6 số → DELETE /reset?otp=…
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import { useRequestResetOtp, useResetHelpdesk } from '../../hooks/useHelpdeskReset';
import { otpReady, sanitizeOtp } from './hd-logic';

export function HdResetDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const req = useRequestResetOtp();
  const reset = useResetHelpdesk();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [otp, setOtp] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { if (open) { setStep(1); setOtp(''); setErr(null); } }, [open]);

  const send = (again = false) => req.mutate(undefined, {
    onSuccess: () => {
      toast.info(t('hdx.reset.sent'));
      if (!again) setStep(2);
      setTimeout(() => document.getElementById('hd-otp')?.focus(), 0);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const confirm = () => {
    if (!otpReady(otp)) { setErr(t('hd.reset.e6')); document.getElementById('hd-otp')?.focus(); return; }
    reset.mutate(otp, {
      onSuccess: (d) => { toast.success(t('hd.reset.done', { t: d.tasks, p: d.pending })); onDone(); onClose(); },
      onError: (e) => setErr(errMsg(e)),
    });
  };

  return (
    <ActionDialog open={open} onClose={onClose} size="sm" danger title={t('hd.reset.title')} data-testid="hd-reset-dlg"
      okLabel={step === 1 ? t('hd.reset.send') : t('hd.reset.ok')} onOk={step === 1 ? () => send() : confirm}
      pending={req.isPending || reset.isPending}>
      {step === 1 ? (
        <>
          <DialogNote tone="bad">{t('hd.reset.warn')}</DialogNote>
          <ul className="m-0 my-3.5 list-disc pl-5 text-[13px] text-ink-2"><li>{t('hd.reset.l3')}</li></ul>
          <p className="text-[13px] text-ink-2">{t('hdx.reset.otpTo')}</p>
          <p className="text-xs text-ink-3">{t('hd.reset.adminOnly')}</p>
        </>
      ) : (
        <>
          <p>{t('hdx.reset.step2')}</p>
          <Field id="hd-otp" label={t('hd.reset.otpL')} required error={err ?? undefined}>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} data-testid="hd-otp"
              onChange={(e) => { setOtp(sanitizeOtp(e.target.value)); if (err) setErr(null); }}
              className={cn(inputClass, '!h-12 max-w-[220px] text-center font-mono text-[22px] font-medium tracking-[.4em]')} />
          </Field>
          <button type="button" onClick={() => send(true)} disabled={req.isPending}
            className="mt-2 rounded-md px-1 py-1 text-[13px] font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
            {t('hd.reset.resend')}
          </button>
        </>
      )}
    </ActionDialog>
  );
}
