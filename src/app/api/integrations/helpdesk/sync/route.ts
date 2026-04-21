import { NextRequest, NextResponse } from 'next/server';
import { requireRole, validateSameOrigin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { helpdeskSyncService } from '@/modules/helpdesk/services/helpdesk-sync.service';

export async function POST(req: NextRequest) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });

  try {
    let body: { manualData?: unknown } = {};
    try { body = await req.json() as { manualData?: unknown }; } catch { /* body rỗng = auto sync */ }

    const isManual = body?.manualData !== undefined;

    if (isManual) {
      const raw = body.manualData;
      const arr = Array.isArray(raw) ? raw
        : (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
          ? (raw as { data: unknown[] }).data : null);
      if (arr && arr.length > 500) {
        return NextResponse.json(
          { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Tối đa 500 tickets mỗi lần import thủ công' } },
          { status: 413 },
        );
      }
    }

    const result = isManual
      ? await helpdeskSyncService.syncFromData(body.manualData)
      : await helpdeskSyncService.sync();

    // Ghi lịch sử sync vào DB
    // Ghi lịch sử sync — không block response nếu ghi log thất bại
    void prisma.helpdeskSyncLog.create({
      data: {
        mode:        isManual ? 'manual' : 'auto',
        synced:      result.synced,
        pending:     result.pending,
        skipped:     result.skipped,
        errors:      result.errors.length,
        errorDetail: result.errors.length > 0 ? result.errors as unknown as object[] : undefined,
        fetchedCount: result.fetchedCount,
      },
    }).catch((e: unknown) => {
      console.error('[HelpdeskSync] SyncLog write failed:', e instanceof Error ? e.message : e);
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: 'SYNC_FAILED', message: err instanceof Error ? err.message : 'Sync thất bại' } },
      { status: 500 },
    );
  }
}

/** Lấy lịch sử sync gần nhất (tối đa 20 lần) */
export async function GET() {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const logs = await prisma.helpdeskSyncLog.findMany({
    orderBy: { ranAt: 'desc' },
    take:    20,
  });

  return NextResponse.json(logs);
}
