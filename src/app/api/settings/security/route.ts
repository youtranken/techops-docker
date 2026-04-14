import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { securityConfigService } from '@/modules/settings/services/security-config.service';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

// ─── Validation Schema ───────────────────────────────────────────────────────

const rateLimitSchema = z.object({
  enabled: z.boolean(),
  maxRequests: z.number().int().min(10).max(10000),
  windowSeconds: z.number().int().min(10).max(3600),
  loginMaxAttempts: z.number().int().min(1).max(100),
  lockoutMinutes: z.number().int().min(1).max(1440),
});

const passwordPolicySchema = z.object({
  minLength: z.number().int().min(6).max(128),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumber: z.boolean(),
  requireSpecialChar: z.boolean(),
  expiryDays: z.number().int().min(0).max(365),
  historyCount: z.number().int().min(0).max(24),
});

const sessionSchema = z.object({
  idleTimeoutMinutes: z.number().int().min(5).max(1440),
  maxSessionHours: z.number().int().min(1).max(168),
  allowMultipleSessions: z.boolean(),
});

const securityConfigSchema = z.object({
  rateLimit: rateLimitSchema.optional(),
  passwordPolicy: passwordPolicySchema.optional(),
  session: sessionSchema.optional(),
});

// ─── GET: Lấy cấu hình hiện tại ──────────────────────────────────────────────

export async function GET() {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const config = await securityConfigService.get();
  return NextResponse.json(config);
}

// ─── PUT: Cập nhật cấu hình ──────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  // Rate limit check
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResponse = await rateLimitApi(identifier);
  if (rateLimitResponse) return rateLimitResponse;

  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = securityConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const updated = await securityConfigService.update(parsed.data);

    // Ghi audit log
    await logUserActivity({
      userId: user.id,
      action: 'CHANGE_SETTINGS',
      metadata: { 
        settingType: 'security_config',
        changes: Object.keys(parsed.data),
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: msg } },
      { status: 500 }
    );
  }
}

// ─── POST: Reset về mặc định ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const body = await req.json();

  if (body.action !== 'reset') {
    return NextResponse.json(
      { error: { code: 'INVALID_ACTION', message: 'Action không hợp lệ' } },
      { status: 400 }
    );
  }

  const config = await securityConfigService.reset();

  // Ghi audit log
  await logUserActivity({
    userId: user.id,
    action: 'CHANGE_SETTINGS',
    metadata: { 
      settingType: 'security_config',
      action: 'reset_to_default',
    },
  });

  return NextResponse.json(config);
}
