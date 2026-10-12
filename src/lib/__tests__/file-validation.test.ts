import { describe, it, expect } from 'vitest';
import { validateFile, TASK_ATTACHMENT_TYPES } from '../file-validation';

const ZIP = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const ALLOWED = TASK_ATTACHMENT_TYPES;

function makeFile(name: string, bytes: number[], type = '') {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('validateFile — Office', () => {
  it.each(['docx', 'xlsx', 'pptx'] as const)('chấp nhận .%s (ZIP)', async (ext) => {
    const res = await validateFile(makeFile(`a.${ext}`, ZIP, MIME[ext]), ALLOWED);
    expect(res.valid).toBe(true);
  });

  it.each([
    ['doc', 'application/msword'],
    ['xls', 'application/vnd.ms-excel'],
    ['ppt', 'application/vnd.ms-powerpoint'],
  ])('từ chối .%s đời cũ (có thể chứa macro)', async (ext, type) => {
    const res = await validateFile(makeFile(`a.${ext}`, OLE, type), ALLOWED);
    expect(res.valid).toBe(false);
  });

  it('chấp nhận khi browser gửi type rỗng (Windows) — suy MIME từ extension', async () => {
    expect((await validateFile(makeFile('bao-cao.xlsx', ZIP, ''), ALLOWED)).valid).toBe(true);
    expect((await validateFile(makeFile('bao-cao.docx', ZIP, 'application/octet-stream'), ALLOWED)).valid).toBe(true);
  });

  it('từ chối file .docx giả mạo (nội dung không phải ZIP)', async () => {
    const res = await validateFile(makeFile('fake.docx', PDF, MIME.docx), ALLOWED);
    expect(res.valid).toBe(false);
  });

  it('từ chối file .exe đổi type thành docx', async () => {
    const res = await validateFile(makeFile('virus.exe', [0x4d, 0x5a, 0x90, 0x00], MIME.docx), ALLOWED);
    // .exe không có trong EXTENSION_MIME → dùng type khai báo (docx) → magic bytes không khớp ZIP
    expect(res.valid).toBe(false);
  });

  it('vẫn chấp nhận PDF như cũ', async () => {
    expect((await validateFile(makeFile('a.pdf', PDF, 'application/pdf'), ALLOWED)).valid).toBe(true);
  });
});
