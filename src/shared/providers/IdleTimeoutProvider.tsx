'use client';

/**
 * Tự đăng xuất khi không thao tác. LOGIC GIỮ NGUYÊN V1:
 * - Thời gian lấy từ /api/settings/security/idle-timeout (làm mới 5 phút/lần; lỗi → 30 phút); 0 = tắt.
 * - Sự kiện tính là "thao tác": mousedown, mousemove, keydown, scroll, touchstart, click.
 * - Kiểm tra mỗi 30 giây: còn ≤1 phút → cảnh báo; hết giờ → báo hết phiên + signOut({ callbackUrl: '/login' }).
 * V2 (A1-4) chỉ đổi giao diện cảnh báo theo preview (`.toast.idle`): thẻ có đếm ngược + [Đăng xuất] [Tiếp tục làm việc].
 * Đếm ngược tính từ lần thao tác cuối; có thao tác thì thẻ tự ẩn (vì V1 đã tính lại từ đầu).
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

// Warning shown 1 minute before logout
const WARNING_BEFORE_LOGOUT_MS = 60 * 1000;

interface IdleTimeoutProviderProps {
  children: React.ReactNode;
}

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function IdleTimeoutProvider({ children }: IdleTimeoutProviderProps) {
  const t = useTranslations();
  const { status } = useSession();
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  /** thẻ cảnh báo đang hiện (chỉ giao diện) */
  const [warning, setWarning] = useState(false);
  const [left, setLeft] = useState(WARNING_BEFORE_LOGOUT_MS);
  const keepRef = useRef<HTMLButtonElement>(null);

  // Fetch idle timeout config
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/settings/security/idle-timeout');
        if (res.ok) {
          const data = await res.json();
          setIdleTimeoutMinutes(data.idleTimeoutMinutes);
        }
      } catch (err) {
        console.error('[IdleTimeout] Failed to fetch config:', err);
        // Use default 30 minutes
        setIdleTimeoutMinutes(30);
      }
    };

    fetchConfig();
    // Refresh config every 5 minutes in case admin changes it
    const intervalId = setInterval(fetchConfig, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [status]);

  // Reset activity timestamp
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Check for idle timeout
  const checkIdleTimeout = useCallback(() => {
    if (!idleTimeoutMinutes || idleTimeoutMinutes === 0) return;

    const now = Date.now();
    const idleMs = now - lastActivityRef.current;
    const timeoutMs = idleTimeoutMinutes * 60 * 1000;

    // Show warning before logout
    if (idleMs >= timeoutMs - WARNING_BEFORE_LOGOUT_MS && !warningShownRef.current) {
      warningShownRef.current = true;
      setLeft(timeoutMs - idleMs);
      setWarning(true);
    }

    // Logout on timeout
    if (idleMs >= timeoutMs) {
      setWarning(false);
      toast.error(t('idle.expired.t'), { description: t('idle.expired.d') });
      signOut({ callbackUrl: '/login' });
    }
  }, [idleTimeoutMinutes, t]);

  // Set up activity listeners and check interval
  useEffect(() => {
    if (status !== 'authenticated' || !idleTimeoutMinutes) return;

    // Listen for activity events
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetActivity, { passive: true });
    });

    // Check idle timeout every 30 seconds
    timeoutIdRef.current = setInterval(checkIdleTimeout, 30 * 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetActivity);
      });
      if (timeoutIdRef.current) {
        clearInterval(timeoutIdRef.current);
      }
    };
  }, [status, idleTimeoutMinutes, resetActivity, checkIdleTimeout]);

  // Giao diện: đếm ngược mỗi giây khi thẻ đang hiện; có thao tác (V1 đã reset) → ẩn thẻ
  useEffect(() => {
    if (!warning || !idleTimeoutMinutes) return;
    const timeoutMs = idleTimeoutMinutes * 60 * 1000;
    const id = setInterval(() => {
      const remain = timeoutMs - (Date.now() - lastActivityRef.current);
      if (remain > WARNING_BEFORE_LOGOUT_MS) setWarning(false);
      else setLeft(remain);
    }, 1000);
    return () => clearInterval(id);
  }, [warning, idleTimeoutMinutes]);

  useEffect(() => {
    if (warning) keepRef.current?.focus({ preventScroll: true });
  }, [warning]);

  function keepWorking() {
    resetActivity();
    setWarning(false);
    toast.success(t('idle.kept'));
  }

  async function logoutNow() {
    setWarning(false);
    try {
      await fetch('/api/auth/logout-log', { method: 'POST' });
    } catch {
      // non-blocking
    }
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <>
      {children}
      {warning && idleTimeoutMinutes ? (
        <div
          role="alertdialog"
          aria-labelledby="idle-t"
          aria-describedby="idle-d"
          className="v2-pop fixed bottom-4 left-1/2 z-[150] flex w-[min(420px,calc(100vw-24px))] -translate-x-1/2 items-start gap-2.5 rounded-[10px] border border-line-2 bg-surface px-3.5 py-3 text-[13px] leading-[1.45] text-ink shadow-v2-pop dark:bg-pop-2"
        >
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-c-review" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <b id="idle-t" className="font-semibold">{t('idle.t')}</b>
            <span id="idle-d" className="text-ink-2">
              {t('idle.d', { m: idleTimeoutMinutes })} <span className="font-mono tabular-nums text-ink">{mmss(left)}</span>
            </span>
            <div className="mt-1.5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="subtle" size="xs" onClick={logoutNow}>
                {t('top.signout')}
              </Button>
              <Button ref={keepRef} type="button" size="xs" onClick={keepWorking}>
                {t('idle.keep')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
