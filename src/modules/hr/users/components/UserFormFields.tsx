'use client';

/**
 * Shared form field components: text/select fields.
 * Password fields: see UserPasswordFields.tsx
 */
import {
  type UseFormRegister,
  type UseFormWatch,
  type UseFormSetValue,
  type FieldErrors,
} from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRoles } from '../hooks/useRoles';
import { ROLE_LABELS } from '@/lib/constants';

export interface UserFormBase {
  displayName: string;
  email?: string;
  roleId: string;
  password?: string;
  confirmPassword?: string;
}

export interface CreateUserForm extends UserFormBase {
  username: string;
  // password/confirmPassword inherited as optional from UserFormBase — mode xác định bởi schema runtime
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BaseRegisterProps { register: UseFormRegister<any>; errors: FieldErrors<any>; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BaseWatchProps { watch: UseFormWatch<any>; setValue: UseFormSetValue<any>; errors: FieldErrors<any>; }

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function Req() { return <span className="text-destructive">*</span>; }

export function UsernameField({ register, errors }: BaseRegisterProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="username">Tên đăng nhập <Req /></Label>
      <Input id="username" placeholder="vd: john_doe" autoComplete="off" {...register('username')} />
      <FieldError message={errors.username?.message as string | undefined} />
    </div>
  );
}

export function DisplayNameField({ register, errors }: BaseRegisterProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="displayName">Tên hiển thị <Req /></Label>
      <Input id="displayName" placeholder="vd: Nguyễn Văn A" {...register('displayName')} />
      <FieldError message={errors.displayName?.message as string | undefined} />
    </div>
  );
}

export function EmailField({ register, errors }: BaseRegisterProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="vd: user@company.com" {...register('email')} />
      <FieldError message={errors.email?.message as string | undefined} />
    </div>
  );
}

export function RoleField({ watch, setValue, errors }: BaseWatchProps) {
  const { data: roles = [], isLoading } = useRoles();
  return (
    <div className="space-y-1">
      <Label htmlFor="roleId">Vai trò <Req /></Label>
      <Select
        value={watch('roleId')}
        onValueChange={(val) => setValue('roleId', val, { shouldValidate: true })}
        disabled={isLoading}
      >
        <SelectTrigger id="roleId"><SelectValue placeholder="Chọn vai trò..." /></SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {ROLE_LABELS[role.name] ?? role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError message={errors.roleId?.message as string | undefined} />
    </div>
  );
}