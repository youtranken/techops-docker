'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPassword } from '../hooks/useResetPassword';

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Yếu', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Trung bình', color: 'bg-yellow-500' };
  if (score <= 3) return { score, label: 'Khá', color: 'bg-blue-500' };
  return { score, label: 'Mạnh', color: 'bg-green-500' };
}

const schema = z
  .object({
    password: z.string().min(6, 'Tối thiểu 6 ký tự'),
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
  const { register, handleSubmit, reset: resetForm, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });
  const pwValue = useWatch({ control, name: 'password', defaultValue: '' });
  const strength = getStrength(pwValue ?? '');

  function handleClose() { resetForm(); onClose(); }

  async function onSubmit(values: FormValues) {
    if (!userId) return;
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
            <Input id="cp-password" type="password" placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" {...register('password')} />
            {pwValue && pwValue.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 mt-1">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-muted'}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength.score <= 1 ? 'text-red-500' : strength.score <= 2 ? 'text-yellow-600' : strength.score <= 3 ? 'text-blue-600' : 'text-green-600'}`}>
                  Độ bảo mật: {strength.label}
                </p>
              </div>
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
