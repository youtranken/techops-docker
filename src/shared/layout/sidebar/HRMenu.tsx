import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Shield, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HR_PERMISSIONS_ITEMS } from './config';

interface HRMenuProps {
  collapsed: boolean;
  isAdmin: boolean;
  isPrivileged: boolean;
}

/**
 * HR menu dropdown with permissions submenu
 */
export function HRMenu({ collapsed, isAdmin, isPrivileged }: HRMenuProps) {
  const pathname = usePathname();
  const [hrOpen, setHrOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);

  const hrActive = pathname.startsWith('/hr');

  // Auto-open when on HR routes
  useEffect(() => {
    if (hrActive) setHrOpen(true);
    if (pathname.startsWith('/hr/permissions')) setPermOpen(true);
  }, [hrActive, pathname]);

  if (collapsed) {
    // Collapsed: icon-only link to /hr/users
    return (
      <Link
        href="/hr/users"
        title="HR"
        className={cn(
          'flex items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-colors',
          hrActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        )}
      >
        <Users className="w-5 h-5 shrink-0" />
      </Link>
    );
  }

  // Expanded: full dropdown
  return (
    <>
      <button
        onClick={() => setHrOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          hrActive
            ? 'bg-blue-600/80 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        )}
      >
        <Users className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">HR</span>
        <ChevronDown
          className={cn('w-4 h-4 transition-transform', hrOpen && 'rotate-180')}
        />
      </button>

      {hrOpen && (
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
          <Link
            href="/hr/users"
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/hr/users')
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Users className="w-4 h-4 shrink-0" />
            Nhân viên
          </Link>

          {/* Permissions submenu - only for privileged users */}
          {isPrivileged && (
            <div>
              <button
                onClick={() => setPermOpen((o) => !o)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith('/hr/permissions')
                    ? 'bg-blue-600/60 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Phân quyền</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', permOpen && 'rotate-180')} />
              </button>
              
              {permOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-700 pl-3">
                  {HR_PERMISSIONS_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'block rounded px-2 py-1.5 text-xs font-medium transition-colors',
                        pathname === item.href
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
