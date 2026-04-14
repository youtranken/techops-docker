import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';

export async function GET() {
  const checks = {
    database: false,
    redis: false,
  };

  // Check DB connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    // DB check failed
  }

  // Check Redis connectivity
  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = true;
  } catch {
    // Redis check failed
  }

  const allHealthy = checks.database && checks.redis;

  // Minimal response - no version, no error details
    return NextResponse.json({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
