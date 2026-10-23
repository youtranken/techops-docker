'use client';

/**
 * Menu thao tác nhanh ⋯ (preview `App.quickMenu`, _SPEC §5) trên dòng bảng / thẻ / chi tiết.
 * - Nhận danh sách NHÓM hành động; nhóm rỗng bị bỏ, các nhóm ngăn bằng vạch. Không còn mục nào → không hiện nút.
 * - Hành động không hợp lệ thì KHÔNG truyền vào (không làm mờ) — trang tự lọc theo quyền V1.
 * - Bàn phím (Radix): Enter/Space/↓ mở, ↑↓ Home End di chuyển, Esc đóng và trả focus về ⋯.
 * - Chặn nổi bọt click/phím ở nút và trong menu (React vẫn nổi bọt qua portal) để không mở dòng.
 */
import * as React from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface QuickMenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}
export type QuickMenuGroup = QuickMenuItem[];

export interface QuickMenuProps {
  groups: QuickMenuGroup[];
  /** aria-label của nút ⋯ */
  label?: string;
  align?: 'start' | 'end';
  className?: string;
  triggerClassName?: string;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function QuickMenu({ groups, label, align = 'end', className, triggerClassName }: QuickMenuProps) {
  const t = useTranslations();
  const visible = groups.filter((g) => g.length > 0);
  if (visible.length === 0) return null;

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={label ?? t('ui.quickActions')}
        onClick={stop}
        onKeyDown={stop}
        onPointerDown={stop}
        className={cn(
          'grid size-8 flex-none place-items-center rounded-md border-0 bg-transparent text-ink-3 outline-none',
          'hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-surface-2 data-[state=open]:text-ink',
          triggerClassName,
        )}
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          onClick={stop}
          onKeyDown={stop}
          onPointerDown={stop}
          className={cn(
            'v2-pop z-[65] max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[220px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-card border border-line bg-surface p-1.5 text-ink shadow-v2-pop outline-none',
            className,
          )}
        >
          {visible.map((g, gi) => (
            <React.Fragment key={g.map((i) => i.key).join('|')}>
              {gi > 0 && <Menu.Separator className="mx-0 my-1 h-px bg-line" />}
              {g.map((item) => {
                const Icon = item.icon;
                return (
                  <Menu.Item
                    key={item.key}
                    disabled={item.disabled}
                    data-danger={item.danger ? 'true' : undefined}
                    onSelect={() => item.onSelect()}
                    className={cn(
                      'flex min-h-9 w-full cursor-default select-none items-center gap-2.5 whitespace-nowrap rounded-sm px-2.5 text-sm text-ink outline-none',
                      'data-[highlighted]:bg-surface-2 data-[disabled]:opacity-45',
                      item.danger && 'text-danger',
                    )}
                  >
                    {Icon && <Icon className={cn('size-4 flex-none', item.danger ? 'text-danger' : 'text-ink-3')} />}
                    {item.label}
                  </Menu.Item>
                );
              })}
            </React.Fragment>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
