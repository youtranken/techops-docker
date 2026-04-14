import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { smtpService } from '@/modules/settings/services/smtp.service';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const schema = z.object({ testEmail: z.string().email('Email không hợp lệ') });

export async function POST(req: NextRequest) {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_EMAIL', message: 'Email không hợp lệ' } },
      { status: 400 },
    );
  }
  const { testEmail } = parsed.data;

  const config = await smtpService.get();
  if (!config) {
    return NextResponse.json({ error: { code: 'NO_CONFIG', message: 'Chưa cấu hình SMTP' } }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: testEmail,
      subject: '[TechOps] Test SMTP Connection',
      html: '<p>🎉 Kết nối SMTP thành công! Hệ thống email TechOps đã được cấu hình đúng.</p>',
    });

    return NextResponse.json({ success: true, message: 'Email test đã được gửi thành công' });
  } catch (err: unknown) {
    console.error('[SMTP Test] Connection error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: { code: 'SMTP_ERROR', message: 'Không thể kết nối SMTP. Vui lòng kiểm tra cấu hình.' } },
      { status: 500 },
    );
  }
}
