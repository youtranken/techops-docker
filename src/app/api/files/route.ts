import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR          = process.env.UPLOAD_DIR || './uploads';
const RESOLVED_UPLOAD_DIR = path.resolve(UPLOAD_DIR);

const MIME: Record<string, string> = {
  '.pdf':  'application/pdf',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
};

/**
 * GET /api/files?path=<relative-path>
 * Serve uploaded files (PDF only) with authentication.
 * Returns the file as application/pdf for inline display or download.
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const filePath   = req.nextUrl.searchParams.get('path');
  const forceDownload = req.nextUrl.searchParams.get('dl') === '1';
  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  // Security: explicit reject suspicious sequences trước khi normalize
  // (defense in depth — path.resolve + startsWith vẫn là check chính bên dưới)
  if (
    filePath.includes('\0') ||
    filePath.includes('..') ||
    /%2e%2e/i.test(filePath) ||
    /%00/i.test(filePath)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath   = path.resolve(RESOLVED_UPLOAD_DIR, normalized);

  if (!fullPath.startsWith(RESOLVED_UPLOAD_DIR)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Security: check ownership — file phải tồn tại trong DB và user phải có quyền truy cập task liên quan
  const isPrivileged = ['BOSS', 'ADMIN'].includes(user.role.name);
  if (!isPrivileged) {
    // G6: Quyền tải = Creator + Boss/Admin (đã bypass) + assignee ACTIVE (IN_PROGRESS/COMPLETED).
    //     REJECTED/TRANSFERRED KHÔNG được tải.
    const ACTIVE_STATUS = { notIn: ['REJECTED', 'TRANSFERRED'] as ('REJECTED' | 'TRANSFERRED')[] };

    // Check TaskAttachment
    const taskAttachment = await prisma.taskAttachment.findFirst({
      where: { filePath: normalized },
      select: {
        task: {
          select: {
            creatorId: true,
            assignees: { where: { status: ACTIVE_STATUS }, select: { userId: true } },
          },
        },
      },
    });
    // Check ReportAttachment
    const reportAttachment = !taskAttachment
      ? await prisma.reportAttachment.findFirst({
          where: { filePath: normalized },
          select: {
            report: {
              select: {
                assignee: {
                  select: {
                    task: {
                      select: {
                        creatorId: true,
                        assignees: { where: { status: ACTIVE_STATUS }, select: { userId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : null;

    if (!taskAttachment && !reportAttachment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (taskAttachment) {
      const task = taskAttachment.task;
      const hasAccess = task.creatorId === user.id || task.assignees.some((a) => a.userId === user.id);
      if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (reportAttachment) {
      const task = reportAttachment.report?.assignee?.task;
      const hasAccess =
        task?.creatorId === user.id ||
        task?.assignees.some((a) => a.userId === user.id);
      if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const buffer      = await readFile(fullPath);
    const fileName    = path.basename(fullPath);
    const contentType = MIME[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${forceDownload ? 'attachment' : 'inline'}; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
