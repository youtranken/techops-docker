'use client';

import { useEffect, useState } from 'react';
import { Users, Check, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserOption {
  id: string;
  displayName: string;
  email: string | null;
  role: { name: string; label: string };
  profile: { avatarColor: string; avatarUrl: string | null } | null;
}

interface Props {
  recipientIds: string[];
  onChange: (ids: string[]) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ user }: { user: UserOption }) {
  if (user.profile?.avatarUrl) {
    return <img src={user.profile.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" />;
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: user.profile?.avatarColor ?? '#6366f1' }}
    >
      {getInitials(user.displayName)}
    </div>
  );
}

export function DigestRecipientsFields({ recipientIds, onChange }: Props) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/hr/users?isActive=true&limit=200')
      .then((r) => r.json())
      .then((res: { data?: UserOption[] }) => setUsers(res.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    onChange(
      recipientIds.includes(id)
        ? recipientIds.filter((x) => x !== id)
        : [...recipientIds, id],
    );
  }

  function toggleAll(filtered: UserOption[]) {
    const ids = filtered.map((u) => u.id);
    const allSelected = ids.every((id) => recipientIds.includes(id));
    if (allSelected) {
      onChange(recipientIds.filter((id) => !ids.includes(id)));
    } else {
      const merged = Array.from(new Set([...recipientIds, ...ids]));
      onChange(merged);
    }
  }

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => recipientIds.includes(u.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Người nhận báo cáo</span>
        </div>
        {recipientIds.length > 0 ? (
          <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {recipientIds.length} người được chọn
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">Mặc định: tất cả Quản lý</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Search + Select all */}
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() => toggleAll(filtered)}
                className="text-xs font-medium text-primary hover:underline shrink-0"
              >
                {allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            )}
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Không tìm thấy người dùng</p>
            ) : (
              filtered.map((user) => {
                const selected = recipientIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggle(user.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      selected ? 'bg-primary/5' : 'hover:bg-muted/40',
                    )}
                  >
                    <Avatar user={user} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email ?? <span className="italic">Chưa có email</span>}
                        <span className="mx-1.5 text-border">·</span>
                        <span>{user.role.label}</span>
                      </p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                      selected ? 'bg-primary border-primary' : 'border-input',
                    )}>
                      {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {recipientIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Chỉ gửi cho người được chọn ở trên. Để gửi cho tất cả Quản lý, hãy bỏ chọn toàn bộ.
        </p>
      )}
    </div>
  );
}
