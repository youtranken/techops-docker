import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { helpdeskPendingService } from '@/modules/helpdesk/services/helpdesk-pending.service';

interface RouteParams {
  params: Promise<{ id: string }>;
  }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await req.json() as { assigneeId?: string };
  const { assigneeId } = body;

  if (!assigneeId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'assigneeId là bắt buộc' } },
      { status: 400 },
    );
  }

  try {
    const task = await helpdeskPendingService.assign(id, assigneeId, user);
    return NextResponse.json(task, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'HELPDESK_PENDING_NOT_FOUND') {
        return NextResponse.json(
          { error: { code: 'HELPDESK_PENDING_NOT_FOUND', message: 'Không tìm thấy ticket' } },
          { status: 404 },
        );
      }
      if (err.message === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: { code: 'USER_NOT_FOUND', message: 'Người dùng không tồn tại' } },
          { status: 404 },
        );
      }
    }
    return NextResponse.json(
      { error: { code: 'ASSIGN_FAILED', message: 'Không thể gán IT Support' } },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  try {
    await helpdeskPendingService.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'HELPDESK_PENDING_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'HELPDESK_PENDING_NOT_FOUND', message: 'Không tìm thấy ticket' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Không thể xóa ticket' } },
      { status: 500 },
    );
  }
}
