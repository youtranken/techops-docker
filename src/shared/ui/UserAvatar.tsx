'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[1][0] + words[words.length - 1][0]).toUpperCase();
}

interface UserAvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const TEXT_SIZE_MAP = {
  xs: 'text-[9px]',
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

export function UserAvatar({
  displayName,
  avatarUrl,
  avatarColor,
  size = 'md',
  className,
}: UserAvatarProps) {
  const initials = getInitials(displayName);
  const bgColor = avatarColor ?? '#6366f1';

  return (
    <Avatar className={cn(SIZE_MAP[size], 'shrink-0', className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
      )}
      <AvatarFallback
        style={{ backgroundColor: bgColor }}
        className={cn('text-white font-semibold', TEXT_SIZE_MAP[size])}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
