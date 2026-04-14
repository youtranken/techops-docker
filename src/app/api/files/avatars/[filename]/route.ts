import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
};

interface RouteParams {
  params: Promise<{ filename: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { filename } = await params;

  // Prevent path traversal
  if (!filename || /[/\\.]\./.test(filename) || filename.includes('..')) {
    return new NextResponse(null, { status: 400 });
  }

  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return new NextResponse(null, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
