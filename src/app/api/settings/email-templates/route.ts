import { NextRequest, NextResponse } from 'next/server';
import { requireRole, validateSameOrigin } from '@/lib/auth-utils';
import { emailTemplateService } from '@/modules/settings/services/email-template.service';
import { sanitizeHtml } from '@/lib/sanitize';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

const VALID_TEMPLATE_KEYS = [
  'TASK_ASSIGNED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_COMPLETED',
  'PLAN_APPROVAL_REQUESTED', 'REVIEW_REQUIRED', 'REVISION_REQUIRED',
  'TRANSFER_RECEIVED', 'EXTENSION_REQUESTED', 'EXTENSION_APPROVED',
  'EXTENSION_REJECTED', 'DEADLINE_REMINDER', 'COMMENT_ADDED', 'ALL_FAILED',
] as const;

const upsertSchema = z.object({
  key: z.enum(VALID_TEMPLATE_KEYS),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).transform((v) => sanitizeHtml(v, true)),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const templates = await emailTemplateService.list();
  return NextResponse.json(templates);
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
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } },
      { status: 400 }
    );
  }

  const { key, ...data } = parsed.data;
  const template = await emailTemplateService.upsert(key, data);
  await logUserActivity({ userId: user.id, action: 'CHANGE_SETTINGS', metadata: { setting: 'email_template', key } });
  return NextResponse.json(template);
}
