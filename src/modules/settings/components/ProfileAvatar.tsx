'use client';

import { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useUpdateProfile, useUploadAvatar } from '../hooks/useProfile';
import { toast } from 'sonner';
import type { UserProfileData } from '../types';
import { useErrorMessage } from '@/lib/useErrorMessage';

function getInitials(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

const COLOR_PRESETS = [
  '#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6',
  '#EC4899','#14B8A6','#F97316','#6366F1','#84CC16',
];

interface Props { profile: UserProfileData }

export function ProfileAvatar({ profile }: Props) {
  const errMsg = useErrorMessage();
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const update = useUpdateProfile();

  const avatarColor = profile.profile?.avatarColor ?? '#3B82F6';
  const avatarUrl   = profile.profile?.avatarUrl ?? null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const allowedExts = ['jpg', 'jpeg', 'png'];
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error('Chỉ chấp nhận file JPEG hoặc PNG');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File quá lớn, tối đa 2MB');
      e.target.value = '';
      return;
    }

    try {
      const { avatarUrl: url } = await upload.mutateAsync(file);
      await update.mutateAsync({ avatarUrl: url });
      toast.success('Đã cập nhật ảnh đại diện');
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Lỗi upload'));
    }
    e.target.value = '';
  }

  async function handleColor(color: string) {
    try { await update.mutateAsync({ avatarColor: color }); }
    catch { /* silent */ }
  }

  return (
    <div className="rounded-xl border p-6 space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ảnh đại diện</h3>

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <Avatar className="w-20 h-20 ring-4 ring-background shadow-md">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.displayName} className="object-cover" />}
            <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white text-xl font-bold">
              {getInitials(profile.displayName || 'U')}
            </AvatarFallback>
          </Avatar>
          <button onClick={() => fileRef.current?.click()} disabled={upload.isPending}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden" onChange={handleFile} />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="font-semibold truncate">{profile.displayName}</p>
          <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
          <p className="text-xs text-muted-foreground">JPEG · PNG — tối đa 2MB</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Màu nền</p>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => handleColor(c)}
              title={c}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-2"
              style={{ backgroundColor: c, outline: avatarColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
            />
          ))}
          <input type="color" value={avatarColor}
            onChange={(e) => handleColor(e.target.value)}
            className="h-7 w-9 rounded border cursor-pointer" title="Màu tùy chỉnh" />
        </div>
      </div>
    </div>
  );
}
