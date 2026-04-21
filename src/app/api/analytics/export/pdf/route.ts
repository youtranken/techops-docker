import { NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { pdfService, type PdfMode } from '@/modules/analytics/services/pdf.service';

export async function GET(req: Request) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get('mode') ?? 'full') as PdfMode;
  const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
  const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

  const buffer = await pdfService.generate({ dateFrom, dateTo }, mode);

  const filename = `analytics-${mode}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(buffer as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}
