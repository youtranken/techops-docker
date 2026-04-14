import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeIp, lookupIpInfo } from '@/lib/ip-utils';

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not logged in' } },
      { status: 401 }
    );
  }

  const raw =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const ip = normalizeIp(raw);
  const ipInfo = await lookupIpInfo(ip);

  await prisma.userActivityLog.create({
    data: {
      userId: session.user.id,
      action: 'LOGOUT',
      ipAddress: ip,
      ipType: ipInfo.ipType,
      ispName: ipInfo.ispName,
      city: ipInfo.city,
      country: ipInfo.country,
      userAgent: req.headers.get('user-agent') ?? 'unknown',
      metadata: { timestamp: new Date().toISOString() },
    },
  });

  return NextResponse.json({ success: true });
}
