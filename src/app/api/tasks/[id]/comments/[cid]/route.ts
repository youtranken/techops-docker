import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { commentService } from '@/modules/tasks/services/comment.service';

interface RouteParams { params: Promise<{ id: string; cid: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { cid } = await params;
  const body = await req.json();

  try {
    const comment = await commentService.update(cid, { content: body.content ?? '' }, user);
    return NextResponse.json(comment);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status =
      e.code === 'COMMENT_NOT_FOUND' ? 404 :
      e.code === 'COMMENT_PERMISSION_DENIED' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { cid } = await params;

  try {
    await commentService.softDelete(cid, user);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status =
      e.code === 'COMMENT_NOT_FOUND' ? 404 :
      e.code === 'COMMENT_PERMISSION_DENIED' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}
