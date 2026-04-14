import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
const MAX_FILES = 3; // Max 3 files per upload
const ALLOWED_EXTENSIONS = ['.pdf']; // PDF only

export async function handleFileUpload(
  request: NextRequest,
  taskId: string
): Promise<Array<{ fileName: string; filePath: string; fileSize: number }>> {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (files.length === 0) {
    throw new Error('No files uploaded');
  }

  if (files.length > MAX_FILES) {
    throw new Error(`Maximum ${MAX_FILES} files allowed`);
  }

  const uploadDir = path.join(UPLOAD_DIR, taskId);
  await mkdir(uploadDir, { recursive: true });

  const results = [];

  for (const file of files) {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Validate extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File type ${ext} not allowed. Only PDF files accepted.`);
    }

    // Sanitize filename (remove path traversal attempts)
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const fileName = `${timestamp}-${safeName}`;
    const filePath = path.join(uploadDir, fileName);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    results.push({
      fileName,
      filePath,
      fileSize: file.size,
    });
  }

  return results;
}
