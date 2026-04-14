import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAuth } from '@/lib/auth-utils';
import { userService } from '@/modules/hr/services/user.service';
import { validatePassword } from '@/lib/password-policy';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ, số và _'),
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
  roleId: z.string().cuid(),
});

export async function GET(req: NextRequest) {
  const actor = await requireAuth();
  if (actor instanceof NextResponse) return actor;

  const isPrivileged = ['ADMIN', 'BOSS'].includes(actor.role.name);

  const { searchParams } = req.nextUrl;
  const filters = {
    search: searchParams.get('search') ?? undefined,
    roleId: searchParams.get('roleId') ?? undefined,
    isActive: searchParams.has('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined,
    page: searchParams.has('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
    createdFrom: searchParams.get('createdFrom') ?? undefined,
    createdTo: searchParams.get('createdTo') ?? undefined,
  };

  // EMPLOYEE chỉ thấy chính mình và các EMPLOYEE khác (không thấy ADMIN/BOSS)
  if (!isPrivileged) {
    const result = await userService.listForEmployee(actor.id, filters);
    return NextResponse.json(result);
  }

  const result = await userService.list(filters);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  // Rate limit check for user creation
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResponse = await rateLimitApi(identifier);
  if (rateLimitResponse) return rateLimitResponse;

  const actor = await requireRole(['ADMIN']);
  if (actor instanceof NextResponse) return actor;

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  // Validate password against security policy
  const passwordValidation = await validatePassword(parsed.data.password);
  if (!passwordValidation.valid) {
    return NextResponse.json(
      { error: { code: 'PASSWORD_POLICY_VIOLATION', message: passwordValidation.errors.join(', ') } },
      { status: 400 }
    );
  }

  try {
    const user = await userService.create(parsed.data, actor.id);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'USER_DUPLICATE') {
      return NextResponse.json(
        { error: { code: 'USER_DUPLICATE', message: e.message } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: 'USER_CREATE_FAILED', message: 'Failed to create user' } },
      { status: 500 }
    );
  }
}
