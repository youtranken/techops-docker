import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { permissionService } from '@/modules/rbac/services/permission.service';
import { z } from 'zod';
import type { TaskStatus, WorkflowMode } from '@prisma/client';

const bodySchema = z.object({
  userId: z.string().min(1),
  status: z.enum([
    'DRAFT',
    'PENDING_APPROVAL',
    'WAITING_ACKNOWLEDGE',
    'IN_PROGRESS',
    'PENDING_REVIEW',
    'COMPLETED',
    'CANCELLED',
  ]),
  workflowMode: z.enum(['IMMEDIATE', 'NEED_APPROVAL']),
  isForceMode: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const actor = await requireAuth();
  if (actor instanceof NextResponse) return actor;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const { userId, status, workflowMode, isForceMode } = parsed.data;

  // Non-admin users can only check their own permissions
  if (actor.role.name !== 'ADMIN' && actor.id !== userId) {
    return NextResponse.json(
      { error: { code: 'PERMISSION_DENIED', message: 'Access denied' } },
      { status: 403 },
    );
  }

  try {
    const allowedActions = await permissionService.getAllowedActions(
      userId,
      status as TaskStatus,
      workflowMode as WorkflowMode,
      isForceMode,
    );

    return NextResponse.json({ allowedActions });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'PERMISSION_CHECK_FAILED', message: 'Permission check failed' } },
      { status: 500 },
    );
  }
}
