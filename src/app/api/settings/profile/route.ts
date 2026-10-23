import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { profileService } from '@/modules/settings/services/profile.service';
import { profileUpdateSchema as updateSchema } from '@/modules/settings/validators/profile.schema';

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const profile = await profileService.get(user.id);
  if (!profile) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Profile không tồn tại' } }, { status: 404 });
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
