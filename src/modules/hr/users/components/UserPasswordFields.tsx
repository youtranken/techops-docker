'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BaseRegisterProps } from './UserFormFields';

function Req() { return <span className="text-destructive">*</span>; }

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function PasswordField({
  register,
  errors,
  label = 'Mật khẩu',
  required = true,
}: BaseRegisterProps & { label?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label htmlFor="password">{label} {required && <Req />}</Label>
      <Input
        id="password"
        type="password"
        placeholder="Tối thiểu 8 ký tự"
        autoComplete="new-password"
        {...register('password')}
      />
      <FieldError message={errors.password?.message as string | undefined} />
    </div>
  );
}

export function ConfirmPasswordField({ register, errors }: BaseRegisterProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="confirmPassword">Xác nhận mật khẩu <Req /></Label>
      <Input
        id="confirmPassword"
        type="password"
        placeholder="Nhập lại mật khẩu"
        autoComplete="new-password"
        {...register('confirmPassword')}
      />
      <FieldError message={errors.confirmPassword?.message as string | undefined} />
    </div>
  );
}

export function ServerError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
      {message}
    </p>
  );
}
