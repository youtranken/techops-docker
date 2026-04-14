'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Bell, Users, User } from 'lucide-react';
import { useNotificationPrefs, useUpdateNotificationPrefs, NOTIFICATION_TYPES } from '../hooks/useNotificationPrefs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NotificationTypeList } from './NotificationTypeList';

type RoleFilter = 'all' | 'BOSS' | 'EMPLOYEE';

const ROLE_TABS: { key: RoleFilter; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Tất cả', icon: Bell },
  { key: 'BOSS', label: 'Quản lý', icon: Users },
  { key: 'EMPLOYEE', label: 'Nhân viên', icon: User },
];

export function NotificationSection() {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.name ?? 'EMPLOYEE';
  const { data: prefs, isLoading } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailTypes, setEmailTypes] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('all');

  useEffect(() => {
    if (prefs) { setEmailEnabled(prefs.emailEnabled); setEmailTypes(prefs.emailTypes); setIsDirty(false); }
  }, [prefs]);

  function toggleType(type: string) {
    setEmailTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
    setIsDirty(true);
  }

  function toggleAll(types: string[], checked: boolean) {
    setEmailTypes((prev) => {
      const next = new Set(prev);
      types.forEach((t) => checked ? next.add(t) : next.delete(t));
      return Array.from(next);
    });
    setIsDirty(true);
  }

  async function handleSave() {
    try {
      await update.mutateAsync({ emailEnabled, emailTypes });
      toast.success('Đã lưu cài đặt thông báo');
      setIsDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu');
    }
  }

  const isAdmin = userRole === 'ADMIN';
  const isBossOrAdmin = ['ADMIN', 'BOSS'].includes(userRole);

  const filteredEntries = Object.entries(NOTIFICATION_TYPES).filter(([, info]) => {
    if (userRole === 'EMPLOYEE') return info.roles.includes('EMPLOYEE');
    if (activeFilter === 'all') return true;
    return info.roles.includes(activeFilter as 'BOSS' | 'EMPLOYEE');
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Cài đặt thông báo</h2>
        <p className="text-sm text-muted-foreground">Chọn loại thông báo muốn nhận qua email</p>
      </div>

      {/* Master toggle — Admin only */}
      {isAdmin && (
        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Thông báo qua Email</p>
              <p className="text-xs text-muted-foreground">Bật/tắt toàn bộ email thông báo của hệ thống</p>
            </div>
          </div>
          <button type="button" role="switch" aria-checked={emailEnabled}
            onClick={() => { setEmailEnabled((v) => !v); setIsDirty(true); }}
            className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              emailEnabled ? 'bg-primary' : 'bg-input')}>
            <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform',
              emailEnabled ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
      )}

      {/* Notification types — show for Admin (when enabled) and always for Boss */}
      {(!isAdmin || emailEnabled) && (
        <div className="space-y-4">
          {/* Role filter — Boss/Admin only */}
          {isBossOrAdmin && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
              {ROLE_TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveFilter(key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    activeFilter === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
          )}
          <NotificationTypeList
            filteredEntries={filteredEntries}
            emailTypes={emailTypes}
            toggleType={toggleType}
            toggleAll={toggleAll}
            readOnly={userRole === 'EMPLOYEE'}
          />
        </div>
      )}

      {isDirty && userRole !== 'EMPLOYEE' && (
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button onClick={handleSave} disabled={update.isPending} size="sm">
            {update.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            if (prefs) { setEmailEnabled(prefs.emailEnabled); setEmailTypes(prefs.emailTypes); setIsDirty(false); }
          }}>Hủy</Button>
        </div>
      )}
    </div>
  );
}
