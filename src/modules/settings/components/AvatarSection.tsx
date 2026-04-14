'use client';

import { Loader2 } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileBasicInfo } from './ProfileBasicInfo';
import { ProfileContact } from './ProfileContact';
import { ProfileMeta } from './ProfileMeta';

export function AvatarSection() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Không thể tải thông tin profile</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Thông tin cá nhân và cài đặt tài khoản</p>
      </div>

      <ProfileMeta    profile={profile} />
      <ProfileAvatar  profile={profile} />
      <ProfileBasicInfo profile={profile} />
      <ProfileContact profile={profile} />
    </div>
  );
}
