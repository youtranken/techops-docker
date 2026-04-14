import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { helpdeskPendingService } from '@/modules/helpdesk/services/helpdesk-pending.service';
import { buildHelpdeskXlsx } from './export-xlsx.handler';

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const sp = req.nextUrl.searchParams;
  const filters = {
    search:    sp.get('search')    || undefined,
    uuTien:    sp.get('uuTien')    || undefined,
    trangThai: sp.get('trangThai') || undefined,
    itSupport: sp.get('itSupport') || undefined,
    dateFrom:  sp.get('dateFrom')  || undefined,
    dateTo:    sp.get('dateTo')    || undefined,
    page:      sp.get('page')  ? Number(sp.get('page'))  : undefined,
    limit:     sp.get('limit') ? Number(sp.get('limit')) : undefined,
  };

  if (sp.get('options') === '1') {
    try {
      return NextResponse.json(await helpdeskPendingService.filterOptions());
    } catch (err: unknown) {
      return NextResponse.json(
        { error: { code: 'OPTIONS_FAILED', message: err instanceof Error ? err.message : 'Lỗi' } },
        { status: 500 },
      );
    }
  }

  if (sp.get('export') === 'xlsx') {
    try {
      const result = await helpdeskPendingService.list({ ...filters, page: 1, limit: 10_000 });
      const buffer = await buildHelpdeskXlsx(result.data);
      const date   = new Date().toISOString().slice(0, 10);
      return new Response(buffer, {
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="helpdesk-${date}.xlsx"`,
        },
      });
    } catch (err: unknown) {
      return NextResponse.json(
        { error: { code: 'EXPORT_FAILED', message: err instanceof Error ? err.message : 'Lỗi xuất Excel' } },
        { status: 500 },
      );
    }
  }

  try {
    return NextResponse.json(await helpdeskPendingService.list(filters));
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: 'LIST_FAILED', message: err instanceof Error ? err.message : 'Không thể tải danh sách' } },
      { status: 500 },
    );
  }
}
