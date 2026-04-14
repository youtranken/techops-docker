import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { roleService } from '@/modules/hr/services/role.service';

export async function GET() {
  const actor = await requireRole(['ADMIN', 'BOSS']);
  if (actor instanceof NextResponse) return actor;

  const roles = await roleService.list();
  return NextResponse.json({ data: roles });
}
