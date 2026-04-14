'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';

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

export function IdleTimeoutProvider({ children }: IdleTimeoutProviderProps) {
  const { status } = useSession();
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

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
      toast.warning('Phiên làm việc sắp hết hạn', {
        description: 'Bạn sẽ bị đăng xuất trong 1 phút do không hoạt động.',
        duration: WARNING_BEFORE_LOGOUT_MS,
      });
    }

    // Logout on timeout
    if (idleMs >= timeoutMs) {
      toast.error('Phiên làm việc đã hết hạn', {
        description: 'Bạn đã bị đăng xuất do không hoạt động.',
      });
      signOut({ callbackUrl: '/login' });
    }
  }, [idleTimeoutMinutes]);

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

  return <>{children}</>;
}