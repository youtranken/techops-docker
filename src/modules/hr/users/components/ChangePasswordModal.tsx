'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle2, Circle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPassword } from '../hooks/useResetPassword';

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
};

function getPolicyChecks(policy: PasswordPolicy, password: string) {
  const checks = [
    { label: `Ít nhất ${policy.minLength} ký tự`, met: password.length >= policy.minLength },
  ];
  if (policy.requireUppercase) checks.push({ label: 'Có ít nhất 1 chữ hoa (A-Z)', met: /[A-Z]/.test(password) });
  if (policy.requireLowercase) checks.push({ label: 'Có ít nhất 1 chữ thường (a-z)', met: /[a-z]/.test(password) });
  if (policy.requireNumber) checks.push({ label: 'Có ít nhất 1 chữ số (0-9)', met: /[0-9]/.test(password) });
  if (policy.requireSpecialChar) checks.push({ label: 'Có ít nhất 1 ký tự đặc biệt (!@#...)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) });
  return checks;
}

const schema = z
  .object({
    password: z.string().min(1, 'Bắt buộc'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  userId: string | null;
  displayName?: string;
  onClose: () => void;
}

export function ChangePasswordModal({ userId, displayName, onClose }: Props) {
  const reset = useResetPassword();
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);

  useEffect(() => {
    fetch('/api/auth/password-policy')
      .then((r) => r.json())
      .then((d) => { if (d.policy) setPolicy(d.policy); })
      .catch(() => {/* use default */});
  }, []);

  const { register, handleSubmit, reset: resetForm, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });
  const pwValue = useWatch({ control, name: 'password', defaultValue: '' });

  const policyChecks = getPolicyChecks(policy, pwValue ?? '');
  const allPolicyMet = (pwValue ?? '').length > 0 && policyChecks.every((c) => c.met);

  function handleClose() { resetForm(); onClose(); }

  async function onSubmit(values: FormValues) {
    if (!userId) return;
    if (!allPolicyMet) {
      const failed = policyChecks.filter((c) => !c.met).map((c) => c.label);
      toast.error(failed[0] ?? 'Mật khẩu không đạt yêu cầu');
      return;
    }
    try {
      await reset.mutateAsync({ userId, password: values.password });
      toast.success(`Đã đổi mật khẩu cho ${displayName ?? 'người dùng'}`);
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Đổi mật khẩu thất bại');
    }
  }

  return (
    <Dialog open={Boolean(userId)} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            Đổi mật khẩu{displayName ? `: ${displayName}` : ''}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="cp-password">Mật khẩu mới <span className="text-destructive">*</span></Label>
            <Input id="cp-password" type="password" placeholder={`Tối thiểu ${policy.minLength} ký tự`} autoComplete="new-password" {...register('password')} />
            {(pwValue ?? '').length > 0 && (
              <ul className="mt-2 space-y-1">
                {policyChecks.map((check) => (
                  <li key={check.label} className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-green-600' : 'text-gray-400'}`}>
                    {check.met
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      : <Circle className="w-3.5 h-3.5 shrink-0" />}
                    {check.label}
                  </li>
                ))}
              </ul>
            )}
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-confirm">Xác nhận mật khẩu <span className="text-destructive">*</span></Label>
            <Input id="cp-confirm" type="password" placeholder="Nhập lại mật khẩu" autoComplete="new-password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting || reset.isPending}>
              {isSubmitting || reset.isPending ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
