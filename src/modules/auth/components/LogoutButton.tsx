'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  async function handleLogout() {
    try {
      // Log logout activity before signing out
      await fetch('/api/auth/logout-log', { method: 'POST' });
    } catch {
      // Non-blocking
    }
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      Đăng xuất
    </Button>
  );
}
