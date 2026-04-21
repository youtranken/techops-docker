'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePasswordSection() {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [isPending, setIsPending] = useState(false);

  const set = (key: keyof typeof form, val: string) => setForm((p) => ({ ...p, [key]: val }));
  const toggleShow = (key: keyof typeof show) => setShow((p) => ({ ...p, [key]: !p[key] }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch('/api/settings/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Đổi mật khẩu thất bại');
        return;
      }
      toast.success('Đã đổi mật khẩu thành công');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-base font-semibold">Đổi mật khẩu</h3>
          <p className="text-xs text-muted-foreground">Mật khẩu phải ít nhất 8 ký tự</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <div className="space-y-1">
          <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={show.current ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => toggleShow('current')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="newPassword">Mật khẩu mới</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={show.next ? 'text' : 'password'}
              value={form.newPassword}
              onChange={(e) => set('newPassword', e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => toggleShow('next')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {show.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={show.confirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => toggleShow('confirm')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.confirmPassword && form.newPassword !== form.confirmPassword && (
            <p className="text-xs text-destructive">Mật khẩu xác nhận không khớp</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending || !form.currentPassword || !form.newPassword || !form.confirmPassword}
        >
          {isPending ? 'Đang xử lý...' : 'Đổi mật khẩu'}
        </Button>
      </form>
    </div>
  );
}
