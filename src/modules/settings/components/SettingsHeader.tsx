'use client';

/** Đầu khu Cài đặt (V1, giữ nguyên tới lát Cài đặt). Trang Hồ sơ có đầu trang riêng theo preview → ẩn ở đó (A3-2). */
import { usePathname } from 'next/navigation';

export function SettingsHeader() {
  const pathname = usePathname();
  if (pathname === '/settings/profile') return null;
  return (
    <div className="flex items-center gap-3 pb-2 border-b">
      <div className="p-2 rounded-xl bg-primary/10">
        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-sm text-muted-foreground">Quản lý cấu hình hệ thống và tài khoản</p>
      </div>
    </div>
  );
}
