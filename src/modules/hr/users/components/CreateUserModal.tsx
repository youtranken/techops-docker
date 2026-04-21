'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { useCreateUser } from '../hooks/useCreateUser';
import {
  UsernameField, DisplayNameField, EmailField, RoleField, type CreateUserForm,
} from './UserFormFields';
import { PasswordField, ConfirmPasswordField, ServerError } from './UserPasswordFields';

// Schema khi đặt password thủ công
const schemaManual = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chữ cái, số, dấu _'),
  displayName: z.string().min(1, 'Bắt buộc').max(100),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  password: z.string().min(8, 'Tối thiểu 8 ký tự'),
  confirmPassword: z.string(),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp', path: ['confirmPassword'],
});

// Schema khi gửi link setup — email bắt buộc, không cần password
const schemaSetupLink = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chữ cái, số, dấu _'),
  displayName: z.string().min(1, 'Bắt buộc').max(100),
  email: z.string().email('Email bắt buộc để gửi link thiết lập mật khẩu'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
});

interface Props { open: boolean; onClose: () => void; }

export function CreateUserModal({ open, onClose }: Props) {
  const createUser = useCreateUser();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sendSetupLink, setSendSetupLink] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<CreateUserForm>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(sendSetupLink ? schemaSetupLink : schemaManual) as any,
      defaultValues: { username: '', displayName: '', email: '', password: '', confirmPassword: '', roleId: '' },
    });

  function handleClose() { reset(); setServerError(null); setSendSetupLink(false); onClose(); }

  async function onSubmit(values: CreateUserForm) {
    setServerError(null);
    const isSetupLink = sendSetupLink;
    try {
      const result = await createUser.mutateAsync({
        username: values.username,
        displayName: values.displayName,
        email: values.email || undefined,
        password: isSetupLink ? undefined : values.password,
        roleId: values.roleId,
        sendSetupLink: isSetupLink,
      });
      handleClose();
      if (result.warning) {
        toast.warning(result.warning);
      } else if (isSetupLink) {
        toast.success(`Đã gửi link thiết lập mật khẩu đến ${values.email}`);
      } else {
        toast.success(`Tài khoản "${values.displayName}" đã được tạo thành công`);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Đã xảy ra lỗi';
      setServerError(msg);
      toast.error(msg);
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

          {/* Toggle: gửi link hay đặt password thủ công */}
          <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Gửi link thiết lập mật khẩu</p>
                <p className="text-xs text-muted-foreground">
                  {sendSetupLink
                    ? 'User nhận email và tự đặt mật khẩu — cần có email'
                    : 'Tự đặt mật khẩu ngay khi tạo'}
                </p>
              </div>
            </div>
            <Switch
              checked={sendSetupLink}
              onCheckedChange={(v) => { setSendSetupLink(v); setServerError(null); }}
            />
          </div>

          {/* Password fields chỉ hiện khi không gửi link */}
          {!sendSetupLink && (
            <>
              <PasswordField register={register} errors={errors} />
              <ConfirmPasswordField register={register} errors={errors} />
            </>
          )}

          <ServerError message={serverError} />
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting || createUser.isPending}>
              {isSubmitting || createUser.isPending
                ? 'Đang tạo...'
                : sendSetupLink ? 'Tạo & Gửi link' : 'Tạo người dùng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
