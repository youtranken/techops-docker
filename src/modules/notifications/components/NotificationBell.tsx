'use client';

/**
 * Chuông thông báo trên topbar (preview `.notif-wrap #bell .pop`).
 * Giữ hành vi V1: số chưa đọc lấy từ /api/notifications/unread-count (15s); MỞ chuông khi có chưa đọc
 * → gọi read-all (useMarkAllAsRead) ngay như V1. Bấm 1 thông báo → đánh dấu đã đọc + mở công việc.
 */
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationCount, useMarkAllAsRead, fetchNotifications, NOTIFICATIONS_KEY } from '../hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell({ showAdminNote = false }: { showAdminNote?: boolean }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { data: count = 0 } = useNotificationCount();
  const markAllAsRead = useMarkAllAsRead();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const qc = useQueryClient();
  /** id chưa đọc lúc mở — để vẫn hiện chấm "chưa đọc" trong lần mở này dù V1 đã đánh dấu đọc hết */
  const [unreadIds, setUnreadIds] = useState<ReadonlySet<string>>(new Set());

  async function setOpenState(next: boolean) {
    setOpen(next);
    if (!next) return;
    setUnreadIds(new Set());
    if (count > 0) {
      // Lấy danh sách trước để biết mục nào mới, rồi mới đánh dấu đọc hết như V1 (cùng 2 API như cũ).
      try {
        const list = await qc.fetchQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, staleTime: 0 });
        setUnreadIds(new Set(list.filter((n) => !n.isRead).map((n) => n.id)));
      } catch {
        /* danh sách lỗi: dropdown tự hiện trạng thái lỗi */
      }
      markAllAsRead.mutate(); // V1: mở chuông = đọc hết
    }
  }

  // Đóng khi bấm ra ngoài / Esc / đổi trang
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  const label = count > 0 ? `${t('top.notifications')} (${t('notif.unread', { n: count })})` : t('top.notifications');

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notif-pop"
        aria-label={label}
        onClick={() => setOpenState(!open)}
        className={cn(
          'relative grid size-9 place-items-center rounded-ctl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
          open && 'bg-surface-2 text-ink',
        )}
      >
        <Bell aria-hidden className="size-[18px]" />
        {count > 0 && (
          <span
            aria-hidden
            data-testid="bell-count"
            className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-pill bg-danger-fill px-1 font-mono text-[10px] font-medium leading-none text-danger-ink ring-2 ring-canvas"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notif-pop"
          role="dialog"
          aria-labelledby="notif-pop-title"
          className={cn(
            'v2-pop z-40 overflow-hidden rounded-card border border-line bg-surface shadow-v2-pop',
            'absolute right-0 top-11 w-[min(380px,calc(100vw-24px))]',
            'max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[60px] max-sm:w-auto',
          )}
        >
          <NotificationDropdown
            unreadIds={unreadIds}
            showAdminNote={showAdminNote}
            onNavigate={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
