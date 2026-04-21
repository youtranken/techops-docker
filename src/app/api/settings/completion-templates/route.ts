import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { canAccessSettingsFeature } from '@/lib/settings-guard';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  title:      z.string().min(1).max(200),
  content:    z.string().min(1).max(5000),
  category:   z.string().max(100).optional(),
  taskTypeId: z.string().cuid().optional().nullable(),
  isActive:   z.boolean().default(true),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  // Management endpoint — trả về tất cả (cả inactive) để ADMIN/BOSS quản lý
  // Endpoint task/{id}/report-templates mới lọc isActive: true cho người dùng
  const isManager = ['ADMIN', 'BOSS'].includes(user.role.name);
  const templates = await prisma.reportTemplate.findMany({
    where: isManager ? undefined : { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, content: true, category: true, taskTypeId: true, isActive: true, createdAt: true },
  });

  return NextResponse.json({ data: templates });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  // Employee có permission 'completion_templates' (cấp qua HR) cũng được phép, không chỉ ADMIN/BOSS
  const allowed = await canAccessSettingsFeature(user.id, user.role.name, 'completion_templates');
  if (!allowed) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const template = await prisma.reportTemplate.create({
    data: { ...parsed.data, taskTypeId: parsed.data.taskTypeId ?? null, createdBy: user.id },
  });

  return NextResponse.json({ data: template }, { status: 201 });
}
