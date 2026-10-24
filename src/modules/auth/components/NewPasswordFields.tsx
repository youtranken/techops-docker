'use client';

/** Ô "Mật khẩu mới" + danh sách yêu cầu + "Nhập lại mật khẩu mới" (preview password.html) — dùng cho đổi lần đầu và đặt lại. */
import { useTranslations } from 'next-intl';
import { Field } from '@/shared/ui/Field';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { PasswordPolicyList } from '@/shared/ui/PasswordPolicyList';
import type { PasswordPolicyConfig } from '@/modules/settings/types';
import { DEFAULT_POLICY, policyChecks } from '@/modules/settings/lib/password-rules';

export const NEW_IDS = { next: 'pw-new', confirm: 'pw-confirm' } as const;

export function NewPasswordFields({ next, confirm, onNext, onConfirm, onConfirmBlur, errNext, errConfirm, policyBad, policy, disabled }: {
  next: string;
  confirm: string;
  onNext: (v: string) => void;
  onConfirm: (v: string) => void;
  onConfirmBlur?: () => void;
  errNext?: string;
  errConfirm?: string;
  policyBad?: boolean;
  policy: PasswordPolicyConfig | null;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const checks = policyChecks(policy ?? DEFAULT_POLICY, next);
  return (
    <>
      <Field id={NEW_IDS.next} label={t('au.new._')} optional={false} error={errNext}>
        <PasswordInput value={next} onChange={onNext} autoComplete="new-password" extraDescribedBy="pw-pol-h" disabled={disabled} />
      </Field>
      <PasswordPolicyList id="pw-pol-h" checks={checks} bad={policyBad} loading={!policy} className="-mt-2 mb-4" />
      <div onBlur={onConfirmBlur}>
        <Field id={NEW_IDS.confirm} label={t('au.new2._')} optional={false} error={errConfirm}>
          <PasswordInput value={confirm} onChange={onConfirm} autoComplete="new-password" noToggle disabled={disabled} />
        </Field>
      </div>
    </>
  );
}
