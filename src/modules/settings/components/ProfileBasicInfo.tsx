'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil } from 'lucide-react';
import { useUpdateProfile } from '../hooks/useProfile';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/constants';
import type { UserProfileData } from '../types';

const TIMEZONES = [
  { value: 'Asia/Bangkok',     label: 'GMT+7 — Việt Nam / Bangkok' },
  { value: 'Asia/Ho_Chi_Minh', label: 'GMT+7 — Hồ Chí Minh (legacy)' },
  { value: 'Asia/Singapore',   label: 'GMT+8 — Singapore' },
  { value: 'Asia/Tokyo',       label: 'GMT+9 — Tokyo' },
  { value: 'UTC',              label: 'UTC' },
];

interface Props { profile: UserProfileData }

export function ProfileBasicInfo({ profile }: Props) {
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    displayName: profile.displayName,
    position:   profile.profile?.position    ?? '',
    department: profile.profile?.department  ?? '',
    timezone:   profile.profile?.timezone    ?? 'Asia/Bangkok',
    bio:        profile.profile?.bio         ?? '',
  });
  const [dirty, setDirty] = useState(false);

  function patch(key: keyof typeof form, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await update.mutateAsync(form);
      toast.success('Đã lưu thông tin cơ bản');
      setDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu');
    }
  }

  return (
    <div className="rounded-xl border p-6 space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Thông tin cơ bản</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Tên hiển thị <span className="text-destructive">*</span></Label>
          <Input value={form.displayName} onChange={(e) => patch('displayName', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Vai trò</Label>
          <Input value={ROLE_LABELS[profile.role?.name ?? ''] ?? profile.role?.name ?? '—'} disabled className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Chức vụ</Label>
          <Input value={form.position} onChange={(e) => patch('position', e.target.value)} placeholder="VD: IT Support Engineer" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phòng ban</Label>
          <Input value={form.department} onChange={(e) => patch('department', e.target.value)} placeholder="VD: IT Department" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Múi giờ</Label>
          <select value={form.timezone} onChange={(e) => patch('timezone', e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Giới thiệu bản thân</Label>
          <textarea value={form.bio} onChange={(e) => patch('bio', e.target.value)}
            rows={3} maxLength={500} placeholder="Mô tả ngắn về bản thân, vai trò trong nhóm..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          <p className="text-xs text-muted-foreground text-right">{form.bio.length}/500</p>
        </div>
      </div>

      {dirty && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={update.isPending} className="gap-1.5">
            {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
            Lưu thay đổi
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setForm({ displayName: profile.displayName, position: profile.profile?.position ?? '', department: profile.profile?.department ?? '', timezone: profile.profile?.timezone ?? 'Asia/Bangkok', bio: profile.profile?.bio ?? '' }); setDirty(false); }}>Hủy</Button>
        </div>
      )}
    </div>
  );
}
