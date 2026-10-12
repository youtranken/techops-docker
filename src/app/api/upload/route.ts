import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { validateFile, TASK_ATTACHMENT_TYPES } from '@/lib/file-validation';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const RESOLVED_UPLOAD_DIR = path.resolve(UPLOAD_DIR);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const rateLimitResponse = await rateLimitApi(getRateLimitIdentifier(req, user.id));
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const formData = await req.formData();
    const file      = formData.get('file')      as File | null;
    const taskId    = formData.get('taskId')    as string | null;
    const subFolder = formData.get('subFolder') as string | null;

    if (!file) {
      return NextResponse.json({ error: { code: 'NO_FILE', message: 'Không có file' } }, { status: 400 });
    }

    // H4: Verify user has access to this task
    if (taskId) {
      const isPrivileged = ['ADMIN', 'BOSS'].includes(user.role.name);
      if (!isPrivileged) {
        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            OR: [{ creatorId: user.id }, { assignees: { some: { userId: user.id } } }],
          },
          select: { id: true },
        });
        if (!task) {
          return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền upload file cho task này' } }, { status: 403 });
        }
      }
    }

    const validation = await validateFile(file, TASK_ATTACHMENT_TYPES);
    if (!validation.valid) {
      return NextResponse.json({ error: { code: 'INVALID_FILE', message: validation.error ?? 'File không hợp lệ' } }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'File vượt quá 10MB' } }, { status: 400 });
    }

    // H3: Sanitize subDir to prevent path traversal on write
    const safeTaskId    = (taskId    ?? 'misc').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeSubFolder = subFolder ? subFolder.replace(/[^a-zA-Z0-9_-]/g, '_') : null;
    const safeSubDir    = safeSubFolder ? `${safeTaskId}/${safeSubFolder}` : safeTaskId;
    const uploadDir     = path.join(RESOLVED_UPLOAD_DIR, safeSubDir);

    // Guard: must stay within UPLOAD_DIR
    if (!path.resolve(uploadDir).startsWith(RESOLVED_UPLOAD_DIR)) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid path' } }, { status: 403 });
    }

    await mkdir(uploadDir, { recursive: true });

    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(safeSubDir, fileName);
    const fullPath = path.join(RESOLVED_UPLOAD_DIR, filePath);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    return NextResponse.json({ filePath, fileName: file.name, fileSize: file.size });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: { code: 'UPLOAD_FAILED', message: e.message ?? 'Upload thất bại' } }, { status: 500 });
  }
}
