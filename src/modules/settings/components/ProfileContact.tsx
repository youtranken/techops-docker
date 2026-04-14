'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone, AtSign } from 'lucide-react';
import { useUpdateProfile } from '../hooks/useProfile';
import { toast } from 'sonner';
import type { UserProfileData } from '../types';

interface Props { profile: UserProfileData }

export function ProfileContact({ profile }: Props) {
  const update = useUpdateProfile();
  const [email, setEmail] = useState(profile.email ?? '');
  const [phone, setPhone] = useState(profile.profile?.phone ?? '');
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    try {
      await update.mutateAsync({ email, phone });
      toast.success('Đã lưu thông tin liên hệ');
      setDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu');
    }
  }

  return (
    <div className="rounded-xl border p-6 space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Liên hệ</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><AtSign className="h-3 w-3" />Username</Label>
          <Input value={profile.username} disabled className="bg-muted font-mono text-sm" />
          <p className="text-[11px] text-muted-foreground">Không thể thay đổi</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" />Email</Label>
          <Input type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setDirty(true); }}
            placeholder="your@email.com" />
          <p className="text-[11px] text-muted-foreground">Dùng cho thông báo hệ thống</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" />Điện thoại</Label>
          <Input type="tel" value={phone}
            onChange={(e) => { setPhone(e.target.value); setDirty(true); }}
            placeholder="0912 345 678" />
        </div>
      </div>

      {dirty && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={update.isPending} className="gap-1.5">
            {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Lưu thay đổi
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEmail(profile.email ?? ''); setPhone(profile.profile?.phone ?? ''); setDirty(false); }}>Hủy</Button>
        </div>
      )}
    </div>
  );
}
