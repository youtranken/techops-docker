'use client';

/**
 * Đầu trang khu Nhân sự V2 (preview people.html / permissions.html `.head` + `.subnav`):
 * tiêu đề + dòng phụ + nút bên phải, dưới là 2 tab Người dùng · Phân quyền (tab Phân quyền chỉ ADMIN/BOSS như V1).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function HrPageHead({ title, sub, actions, showPerms }: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  showPerms: boolean;
}) {
  const t = useTranslations();
  const path = usePathname() ?? '';
  const tabs = [
    { href: '/hr/users', label: t('pp.tab.users'), on: path.startsWith('/hr/users') },
    ...(showPerms ? [{ href: '/hr/permissions', label: t('pp.tab.perms'), on: path.startsWith('/hr/permissions') }] : []),
  ];
  return (
    <>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{title}</h1>
          {sub !== undefined && <p className="m-0 mt-1 text-[13px] text-ink-3" data-testid="hr-sub">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav aria-label={t('pp.subnav')} className="mb-4 flex gap-[22px] border-b border-line max-[680px]:-mx-4 max-[680px]:px-4">
        {tabs.map((x) => (
          <Link
            key={x.href}
            href={x.href}
            aria-current={x.on ? 'page' : undefined}
            className={cn(
              'relative inline-flex h-10 items-center whitespace-nowrap text-sm font-medium text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              x.on && 'font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-sm after:bg-primary',
            )}
          >
            {x.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** Nhãn vai trò: tiếng Việt giữ đúng ROLE_LABELS V1 (BOSS = "Quản lý"; đổi tên là Phase B). */
export const roleKey = (name: string) => (['ADMIN', 'BOSS', 'EMPLOYEE'].includes(name) ? `ppx.role.${name}` : null);
export function useRoleLabel() {
  const t = useTranslations();
  return (name: string) => {
    const k = roleKey(name);
    return k ? t(k) : name;
  };
}
