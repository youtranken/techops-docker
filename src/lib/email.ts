import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

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
        auth: { user: dbConfig.user, pass: dbConfig.password },
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

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const { transporter, from } = await getTransporter();
    await transporter.sendMail({
      from: options.from ?? from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send email:', error instanceof Error ? error.message : 'Unknown error');
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
