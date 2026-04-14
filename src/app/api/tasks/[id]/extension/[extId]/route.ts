import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { extensionService } from '@/modules/tasks/services/extension.service';
import { prisma } from '@/lib/prisma';

interface RouteParams { params: Promise<{ id: string; extId: string }> }

async function verifyExtensionOwnership(extId: string, taskId: string): Promise<boolean> {
  const ext = await prisma.extensionRequest.findUnique({ where: { id: extId }, select: { taskId: true } });
  return ext?.taskId === taskId;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id, extId } = await params;
  if (!await verifyExtensionOwnership(extId, id)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy yêu cầu gia hạn' } }, { status: 404 });
  }
  const body = await req.json();
  try {
    if (body.status === 'APPROVED') {
      await extensionService.approve(extId, { responseNote: body.responseNote }, user);
    } else if (body.status === 'REJECTED') {
      await extensionService.reject(extId, { responseNote: body.responseNote }, user);
    } else {
      return NextResponse.json({ error: { code: 'INVALID_STATUS', message: 'status phải là APPROVED hoặc REJECTED' } }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status = e.code === 'EXTENSION_NOT_FOUND' ? 404 : e.code === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id, extId } = await params;
  if (!await verifyExtensionOwnership(extId, id)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy yêu cầu gia hạn' } }, { status: 404 });
  }
  try {
    await extensionService.withdraw(extId, user);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status = e.code === 'EXTENSION_NOT_FOUND' ? 404 : e.code === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}
