import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
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

  // Security: prevent path traversal
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath   = path.resolve(RESOLVED_UPLOAD_DIR, normalized);

  if (!fullPath.startsWith(RESOLVED_UPLOAD_DIR)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
