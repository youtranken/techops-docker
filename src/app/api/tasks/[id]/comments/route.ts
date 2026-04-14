import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { commentService } from '@/modules/tasks/services/comment.service';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');

  try {
    const result = await commentService.list(id, { page, limit }, user);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await req.json();

  try {
    const comment = await commentService.create(
      id,
      { content: body.content ?? '', mentions: body.mentions },
      user,
    );
    return NextResponse.json(comment, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status = e.code === 'COMMENT_PERMISSION_DENIED' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}
