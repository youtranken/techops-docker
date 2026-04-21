import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { validateFile } from '@/lib/file-validation';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  // Rate limit check
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResponse = await rateLimitApi(identifier);
  if (rateLimitResponse) return rateLimitResponse;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: { code: 'NO_FILE', message: 'Không có file' } }, { status: 400 });
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'File tối đa 2MB' } }, { status: 400 });
  }

  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);

  // Validate file type and magic bytes
  const validation = await validateFile(file, ALLOWED_TYPES);
  if (!validation.valid) {
    return NextResponse.json(
      { error: { code: 'INVALID_FILE', message: validation.error ?? 'File không hợp lệ' } },
      { status: 400 }
    );
  }

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png'].includes(ext) ? ext : 'jpg';
  const fileName = `avatar_${user.id}_${Date.now()}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

  const avatarUrl = `/api/files/avatars/${fileName}`;

  // Xóa avatar cũ trước khi lưu mới (US4.5)
  const existing = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { avatarUrl: true },
  });
  if (existing?.avatarUrl) {
    const oldFileName = existing.avatarUrl.split('/').pop();
    if (oldFileName) {
      const oldPath = path.join(process.cwd(), 'uploads', 'avatars', oldFileName);
      unlink(oldPath).catch(() => { /* file có thể đã bị xóa trước đó */ });
    }
  }

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { avatarUrl },
    create: { userId: user.id, avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
