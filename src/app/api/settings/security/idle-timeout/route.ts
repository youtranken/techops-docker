import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { securityConfigService } from '@/modules/settings/services/security-config.service';

/**
 * GET /api/settings/security/idle-timeout
 * Returns the current idle timeout setting in minutes.
 * Used by client-side IdleTimeout component.
 */
export async function GET() {
  const actor = await requireAuth();
  if (actor instanceof NextResponse) return actor;

  try {
    const config = await securityConfigService.get();
    return NextResponse.json({
      idleTimeoutMinutes: config.session.idleTimeoutMinutes,
    });
  } catch (err) {
    console.error('[IdleTimeout] Failed to get config:', err);
    // Return default if DB fails
    return NextResponse.json({
      idleTimeoutMinutes: 30,
    });
  }
}