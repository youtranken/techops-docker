'use client';

import { signOut } from 'next-auth/react';

/** Đăng xuất như menu người dùng V1 (Header): ghi nhật ký LOGOUT (không chặn) rồi signOut về /login. */
export async function logout() {
  try {
    await fetch('/api/auth/logout-log', { method: 'POST' });
  } catch {
    // không chặn
  }
  await signOut({ callbackUrl: '/login' });
}
