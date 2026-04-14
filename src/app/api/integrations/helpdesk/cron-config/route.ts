import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { helpdeskCronConfigService } from '@/modules/helpdesk/services/helpdesk-cron-config.service';

export async function GET() {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const config = await helpdeskCronConfigService.get();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json() as { enabled?: boolean; hour?: number; minute?: number; enabled2?: boolean; hour2?: number; minute2?: number };
    const updated = await helpdeskCronConfigService.update(body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: err instanceof Error ? err.message : 'Lỗi cập nhật' } },
      { status: 400 },
    );
  }
}
