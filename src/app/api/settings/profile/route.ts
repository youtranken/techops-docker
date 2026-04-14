import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { profileService } from '@/modules/settings/services/profile.service';
import { z } from 'zod';

const updateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  avatarUrl: z.string().nullable().optional(),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const profile = await profileService.get(user.id);
  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } },
      { status: 400 }
    );
  }

  try {
    const updated = await profileService.update(user.id, parsed.data);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi';
    return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: msg } }, { status: 400 });
  }
}
