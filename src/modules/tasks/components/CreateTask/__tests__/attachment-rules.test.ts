import { describe, it, expect } from 'vitest';
import { validateNewAttachments, MAX_FILE_COUNT, MAX_SIZE_MB } from '../attachment-rules';

function makeFile(name: string, sizeBytes = 100) {
  return new File([new Uint8Array(sizeBytes)], name);
}

describe('validateNewAttachments', () => {
  it.each(['a.pdf', 'a.JPG', 'a.jpeg', 'a.png', 'a.docx', 'a.xlsx', 'a.pptx'])('chấp nhận %s', (name) => {
    expect(validateNewAttachments([makeFile(name)], 0)).toBeNull();
  });

  it.each(['a.doc', 'a.xls', 'a.ppt', 'a.docm', 'a.exe', 'noext'])('từ chối %s', (name) => {
    expect(validateNewAttachments([makeFile(name)], 0)).toMatch(/không hợp lệ/);
  });

  it(`từ chối file vượt ${MAX_SIZE_MB}MB`, () => {
    const big = makeFile('big.xlsx', MAX_SIZE_MB * 1024 * 1024 + 1);
    expect(validateNewAttachments([big], 0)).toMatch(/vượt quá/);
  });

  it(`từ chối khi tổng vượt ${MAX_FILE_COUNT} file (tính cả file đang có)`, () => {
    expect(validateNewAttachments([makeFile('a.pdf'), makeFile('b.pdf')], 2)).toMatch(/Tối đa/);
    expect(validateNewAttachments([makeFile('a.pdf')], 2)).toBeNull();
  });
});
