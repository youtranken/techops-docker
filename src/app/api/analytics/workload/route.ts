import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { researchService } from '@/modules/analytics/services/research.service';

export async function GET() {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const result = await researchService.getWorkloadBalance();
  return NextResponse.json(result);
}
