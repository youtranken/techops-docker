import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { userService } from '@/modules/hr/services/user.service';
import { ROLE_LABELS } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const actor = await requireRole(['ADMIN', 'BOSS']);
  if (actor instanceof NextResponse) return actor;

  const { searchParams } = req.nextUrl;
  const filters = {
    search: searchParams.get('search') ?? undefined,
    roleId: searchParams.get('roleId') ?? undefined,
    isActive: searchParams.has('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined,
    createdFrom: searchParams.get('createdFrom') ?? undefined,
    createdTo: searchParams.get('createdTo') ?? undefined,
    limit: 10_000, // export toàn bộ, không phân trang
  };

  const result = await userService.list(filters);

  const header = ['ID', 'Username', 'Tên hiển thị', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo'];
  const rows = result.data.map((u) => [
    u.id,
    u.username,
    u.displayName,
    u.email ?? '',
    ROLE_LABELS[u.role.name] ?? u.role.name,
    u.isActive ? 'Hoạt động' : 'Vô hiệu hóa',
    new Date(u.createdAt).toLocaleDateString('vi-VN'),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const fileName = `users_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
