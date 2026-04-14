import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { extensionService } from '@/modules/tasks/services/extension.service';

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await req.json();
  try {
    await extensionService.create(id, {
      reason: body.reason ?? '',
      requestedDate: body.requestedDate ?? '',
    }, user);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}
