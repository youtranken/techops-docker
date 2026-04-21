import { NextResponse } from 'next/server';
import { getCurrentPasswordPolicy } from '@/lib/password-policy';

/**
 * GET /api/auth/password-policy
 * Public endpoint — returns password requirements so the UI can display them.
 * No auth required (accessible during first-login change-password flow).
 */
export async function GET() {
  const policy = await getCurrentPasswordPolicy();
  return NextResponse.json({ policy });
}
