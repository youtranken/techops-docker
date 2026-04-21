import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  title:      z.string().min(1).max(200).optional(),
  content:    z.string().min(1).max(5000).optional(),
  category:   z.string().max(100).optional().nullable(),
  taskTypeId: z.string().cuid().optional().nullable(),
  isActive:   z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!['ADMIN', 'BOSS'].includes(user.role.name)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } },
      { status: 400 },
    );
  }

  try {
    const template = await prisma.reportTemplate.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: template });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Template không tồn tại' } }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!['ADMIN', 'BOSS'].includes(user.role.name)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.reportTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Template không tồn tại' } }, { status: 404 });
  }
}
