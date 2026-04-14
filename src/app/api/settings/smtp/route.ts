import { NextRequest, NextResponse } from 'next/server';
import { requireRole, validateSameOrigin } from '@/lib/auth-utils';
import { smtpService } from '@/modules/settings/services/smtp.service';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

const smtpSchema = z.object({
  host:      z.string().trim().min(1, 'Host không được để trống'),
  port:      z.number().int().min(1).max(65535),
  secure:    z.boolean(),
  user:      z.string().trim().min(1, 'Tài khoản không được để trống'),
  password:  z.string().optional(),
  fromName:  z.string().trim().min(1, 'Tên hiển thị không được để trống'),
  fromEmail: z.string().trim().email('Email gửi không hợp lệ'),
  isActive:  z.boolean(),
});

export async function GET() {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const config = await smtpService.get();
  if (!config) return NextResponse.json(null);
  return NextResponse.json(smtpService.mask(config));
}

export async function PUT(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  if (!validateSameOrigin(req)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });
  }

  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = smtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const config = await smtpService.upsert(parsed.data);
    await logUserActivity({
      userId: user.id,
      action: 'CHANGE_SETTINGS',
      ipAddress: getRateLimitIdentifier(req),
      metadata: { setting: 'smtp', host: parsed.data.host, port: parsed.data.port },
    });
    return NextResponse.json(smtpService.mask(config));
  } catch {
    return NextResponse.json({ error: { code: 'SAVE_FAILED', message: 'Không thể lưu cấu hình SMTP' } }, { status: 400 });
  }
}
