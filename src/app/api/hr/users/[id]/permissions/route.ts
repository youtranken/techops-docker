import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { permissionService } from '@/modules/rbac/services/permission.service';
import { z } from 'zod';
import type { TaskStatus, WorkflowMode } from '@prisma/client';

const statusValues = [
  'DRAFT',
  'PENDING_APPROVAL',
  'WAITING_ACKNOWLEDGE',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'COMPLETED',
  'CANCELLED',
] as const;

const workflowValues = ['IMMEDIATE', 'NEED_APPROVAL'] as const;

const overrideSchema = z.object({
  status: z.enum(statusValues),
  workflowMode: z.enum(workflowValues),
  action: z.string().min(1),
  type: z.enum(['GRANT', 'REVOKE']),
});

const deleteSchema = z.object({
  status: z.enum(statusValues),
  workflowMode: z.enum(workflowValues),
  action: z.string().min(1),
});

// GET /api/hr/users/[id]/permissions — list all overrides for user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireRole(['ADMIN']);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  try {
    const overrides = await permissionService.getUserOverrides(id);
    return NextResponse.json({ data: overrides });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'PERMISSION_CHECK_FAILED', message: 'Failed to load permissions' } },
      { status: 500 },
    );
  }
}

// POST /api/hr/users/[id]/permissions — grant or revoke override
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireRole(['ADMIN']);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = overrideSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const { status, workflowMode, action, type } = parsed.data;

  try {
    let result;
    if (type === 'GRANT') {
      result = await permissionService.grantOverride(
        id,
        status as TaskStatus,
        workflowMode as WorkflowMode,
        action,
      );
    } else {
      result = await permissionService.revokeOverride(
        id,
        status as TaskStatus,
        workflowMode as WorkflowMode,
        action,
      );
    }
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      );
    }
    const code = type === 'GRANT' ? 'PERMISSION_GRANT_FAILED' : 'PERMISSION_REVOKE_FAILED';
    return NextResponse.json(
      { error: { code, message: `Failed to ${type.toLowerCase()} permission` } },
      { status: 500 },
    );
  }
}

// DELETE /api/hr/users/[id]/permissions — remove override (restore default)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireRole(['ADMIN']);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const { status, workflowMode, action } = parsed.data;

  try {
    await permissionService.deleteOverride(
      id,
      status as TaskStatus,
      workflowMode as WorkflowMode,
      action,
    );
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { code?: string };
    // P2025 = record not found in Prisma
    if (e.code === 'P2025') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Override not found' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'PERMISSION_REVOKE_FAILED', message: 'Failed to remove override' } },
      { status: 500 },
    );
  }
}
