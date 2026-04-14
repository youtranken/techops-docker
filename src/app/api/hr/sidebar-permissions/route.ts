import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const VALID_MENUS = ['logs', 'analytics', 'helpdesk', 'hr', 'settings'] as const;
const DEFAULT_MENUS: string[] = ['logs', 'analytics', 'helpdesk', 'hr'];
const DEFAULT_FEATURES: Record<string, string[]> = {
  logs: ['task_activity', 'user_activity'],
  hr: ['edit', 'change_password', 'deactivate', 'delete'],
};

const putSchema = z.object({
  userId: z.string().cuid(),
  visibleMenus: z.array(z.enum(VALID_MENUS)),
  featurePermissions: z.record(z.string(), z.array(z.string())).optional(),
});

function parseFeatures(raw: string): Record<string, string[]> {
  try { return JSON.parse(raw) as Record<string, string[]>; } catch { return {}; }
}

export async function GET(req: NextRequest) {
  const actor = await requireAuth();
  if (actor instanceof NextResponse) return actor;

  const userId = req.nextUrl.searchParams.get('userId');

  if (userId) {
    // EMPLOYEE chỉ được lấy permission của chính mình
    const isPrivileged = ['ADMIN', 'BOSS'].includes(actor.role.name);
    if (!isPrivileged && actor.id !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 },
      );
    }
    const record = await prisma.sidebarPermission.findUnique({ where: { userId } });
    const visibleMenus: string[] = record
      ? (JSON.parse(record.visibleMenus) as string[])
      : DEFAULT_MENUS;
    const featurePermissions: Record<string, string[]> = record
      ? parseFeatures(record.featurePermissions)
      : DEFAULT_FEATURES;
    return NextResponse.json({ data: { userId, visibleMenus, featurePermissions } });
  }

  // List all → chỉ ADMIN/BOSS
  const isPrivileged = ['ADMIN', 'BOSS'].includes(actor.role.name);
  if (!isPrivileged) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }

  const pageParam = req.nextUrl.searchParams.get('page');
  const limitParam = req.nextUrl.searchParams.get('limit');
  const page = Math.max(1, pageParam ? Number(pageParam) : 1);
  const limit = Math.min(200, Math.max(1, limitParam ? Number(limitParam) : 100));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { name: 'EMPLOYEE' } },
      include: { role: true, sidebarPermission: true },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const data = users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    username: u.username,
    role: u.role,
    visibleMenus: u.sidebarPermission
      ? (JSON.parse(u.sidebarPermission.visibleMenus) as string[])
      : DEFAULT_MENUS,
    featurePermissions: u.sidebarPermission
      ? parseFeatures(u.sidebarPermission.featurePermissions)
      : DEFAULT_FEATURES,
  }));

  return NextResponse.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function PUT(req: NextRequest) {
  const actor = await requireRole(['ADMIN', 'BOSS']);
  if (actor instanceof NextResponse) return actor;

  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const { userId, visibleMenus, featurePermissions } = parsed.data;

  const record = await prisma.sidebarPermission.upsert({
    where: { userId },
    update: {
      visibleMenus: JSON.stringify(visibleMenus),
      ...(featurePermissions !== undefined && {
        featurePermissions: JSON.stringify(featurePermissions),
      }),
    },
    create: {
      userId,
      visibleMenus: JSON.stringify(visibleMenus),
      featurePermissions: JSON.stringify(featurePermissions ?? DEFAULT_FEATURES),
    },
  });

  return NextResponse.json({
    data: {
      userId: record.userId,
      visibleMenus,
      featurePermissions: parseFeatures(record.featurePermissions),
    },
  });
}
