'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateUser } from '../hooks/useUpdateUser';
import type { UserWithRole } from '../types';
import { DisplayNameField, EmailField, RoleField } from './UserFormFields';
import { PasswordField, ConfirmPasswordField, ServerError } from './UserPasswordFields';

const schema = z.object({
  displayName: z.string().min(1, 'Bắt buộc').max(100),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
  password: z.string().min(6, 'Tối thiểu 6 ký tự').or(z.literal('')).optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => { if (!d.password) return true; return d.password === d.confirmPassword; },
  { message: 'Mật khẩu không khớp', path: ['confirmPassword'] });

type FormValues = z.infer<typeof schema>;

interface Props { user: UserWithRole | null; onClose: () => void; canChangeRole?: boolean; }

export function EditUserModal({ user, onClose, canChangeRole = false }: Props) {
  const updateUser = useUpdateUser();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user) { reset({ displayName: user.displayName, email: user.email ?? '', roleId: user.roleId, password: '', confirmPassword: '' }); setServerError(null); }
  }, [user, reset]);

  function handleClose() { reset(); setServerError(null); onClose(); }

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setServerError(null);
    const payload: Record<string, unknown> = { displayName: values.displayName, email: values.email || undefined, roleId: values.roleId };
    if (values.password) payload.password = values.password;
    try {
      await updateUser.mutateAsync({ id: user.id, data: payload });
      handleClose();
    } catch (err: unknown) {
      setServerError((err as Error).message ?? 'Đã xảy ra lỗi');
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa: <span className="font-mono text-base">{user?.username}</span></DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <DisplayNameField register={register} errors={errors} />
          <EmailField register={register} errors={errors} />
          {canChangeRole && <RoleField watch={watch} setValue={setValue} errors={errors} />}
          <PasswordField register={register} errors={errors} label="Mật khẩu mới (để trống nếu không đổi)" required={false} />
          {watch('password') && <ConfirmPasswordField register={register} errors={errors} />}
          <ServerError message={serverError} />
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting || updateUser.isPending}>
              {isSubmitting || updateUser.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
