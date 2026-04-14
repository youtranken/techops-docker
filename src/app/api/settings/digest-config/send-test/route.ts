import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { digestConfigService } from '@/modules/settings/services/digest-config.service';
import { collectDigestData } from '@/modules/settings/services/digest-data.service';
import { buildDigestHtml } from '@/modules/settings/services/digest-email.template';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';
import dayjs from 'dayjs';
import type { DigestContentType } from '@/modules/settings/types';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (!['ADMIN', 'BOSS'].includes(user.role.name)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Email không hợp lệ' } },
      { status: 400 },
    );
  }

  const config = await digestConfigService.get();
  const contentTypes = (config?.contentTypes ?? ['DEADLINE_SOON', 'IN_PROGRESS', 'OVERDUE', 'PENDING_APPROVAL', 'SUMMARY_BY_EMPLOYEE']) as DigestContentType[];
  const subject = config?.emailSubject ?? 'Báo cáo định kỳ TechOps - {date}';
  const greeting = config?.emailGreeting ?? 'Xin chào, đây là báo cáo tình trạng công việc định kỳ từ hệ thống TechOps.';

  const data = await collectDigestData(contentTypes);
  const date = dayjs().format('DD/MM/YYYY');
  const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/,'');
  const html = buildDigestHtml(data, contentTypes, subject, greeting, 'Gửi thử', date, baseUrl);

  await sendEmail({
    to: parsed.data.email,
    subject: `[Thử nghiệm] ${subject.replace('{date}', date)}`,
    html,
  });

  return NextResponse.json({ message: `Đã gửi email thử đến ${parsed.data.email}` });
}
