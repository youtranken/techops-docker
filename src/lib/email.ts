import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/crypto';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/** Build a transporter: DB config first, fall back to ENV */
async function getTransporter() {
  const dbConfig = await prisma.smtpConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (dbConfig) {
    return {
      transporter: nodemailer.createTransport({
        host: dbConfig.host,
        port: dbConfig.port,
        secure: dbConfig.secure,
        auth: { user: dbConfig.user, pass: decryptSecret(dbConfig.password) },
      }),
      from: `"${dbConfig.fromName}" <${dbConfig.fromEmail}>`,
    };
  }

  // Fallback: ENV vars
  return {
    transporter: nodemailer.createTransport({
      host: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    }),
    from: process.env.EMAIL_FROM ?? '"TechOps" <noreply@techops.com>',
  };
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { transporter, from } = await getTransporter();
    await transporter.sendMail({
      from: options.from ?? from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log('✅ Email sent successfully');
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to send email:', msg);
    return { success: false, error: msg };
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const { transporter } = await getTransporter();
    await transporter.verify();
    console.log('✅ Email service ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}
