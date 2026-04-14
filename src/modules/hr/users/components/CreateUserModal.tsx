'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateUser } from '../hooks/useCreateUser';
import {
  UsernameField, DisplayNameField, EmailField, RoleField, type CreateUserForm,
} from './UserFormFields';
import { PasswordField, ConfirmPasswordField, ServerError } from './UserPasswordFields';

const schema = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chữ cái, số, dấu _'),
  displayName: z.string().min(1, 'Bắt buộc').max(100),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  password: z.string().min(6, 'Tối thiểu 6 ký tự'),
  confirmPassword: z.string(),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp', path: ['confirmPassword'],
});

interface Props { open: boolean; onClose: () => void; }

export function CreateUserModal({ open, onClose }: Props) {
  const createUser = useCreateUser();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<CreateUserForm>({ resolver: zodResolver(schema), defaultValues: { username: '', displayName: '', email: '', password: '', confirmPassword: '', roleId: '' } });

  function handleClose() { reset(); setServerError(null); onClose(); }

  async function onSubmit(values: CreateUserForm) {
    setServerError(null);
    try {
      await createUser.mutateAsync({ username: values.username, displayName: values.displayName, email: values.email || undefined, password: values.password, roleId: values.roleId });
      handleClose();
    } catch (err: unknown) {
      setServerError((err as Error).message ?? 'Đã xảy ra lỗi');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Tạo người dùng mới</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <UsernameField register={register} errors={errors} />
          <DisplayNameField register={register} errors={errors} />
          <EmailField register={register} errors={errors} />
          <RoleField watch={watch} setValue={setValue} errors={errors} />
          <PasswordField register={register} errors={errors} />
          <ConfirmPasswordField register={register} errors={errors} />
          <ServerError message={serverError} />
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting || createUser.isPending}>
              {isSubmitting || createUser.isPending ? 'Đang tạo...' : 'Tạo người dùng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
