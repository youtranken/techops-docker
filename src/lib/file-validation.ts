/**
 * File validation with magic bytes checking.
 * Prevents uploading malicious files disguised with fake MIME types.
 */

const ZIP = [0x50, 0x4b, 0x03, 0x04];                         // "PK\x03\x04" (ZIP)

// Magic bytes signatures for common file types
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  // PDF
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  
  // JPEG
  'image/jpeg': [
    { bytes: [0xff, 0xd8, 0xff, 0xe0] }, // JFIF
    { bytes: [0xff, 0xd8, 0xff, 0xe1] }, // EXIF
    { bytes: [0xff, 0xd8, 0xff, 0xe2] }, // ICC
    { bytes: [0xff, 0xd8, 0xff, 0xe8] }, // SPIFF
    { bytes: [0xff, 0xd8, 0xff, 0xdb] }, // Raw JPEG
    { bytes: [0xff, 0xd8, 0xff, 0xee] }, // Adobe JPEG
  ],
  'image/jpg': [
    { bytes: [0xff, 0xd8, 0xff, 0xe0] },
    { bytes: [0xff, 0xd8, 0xff, 0xe1] },
    { bytes: [0xff, 0xd8, 0xff, 0xe2] },
    { bytes: [0xff, 0xd8, 0xff, 0xe8] },
    { bytes: [0xff, 0xd8, 0xff, 0xdb] },
    { bytes: [0xff, 0xd8, 0xff, 0xee] },
  ],
  
  // PNG
  'image/png': [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }], // PNG\r\n\x1a\n

  // Office 2007+ (OOXML) = ZIP container
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   [{ bytes: ZIP }], // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':         [{ bytes: ZIP }], // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [{ bytes: ZIP }], // .pptx
};

/** Extension → MIME chuẩn. Dùng khi browser gửi file.type rỗng/octet-stream (hay gặp với file Office trên Windows). */
export const EXTENSION_MIME: Record<string, string> = {
  '.pdf':  'application/pdf',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * MIME được phép đính kèm vào task: PDF, ảnh, Word/Excel/PowerPoint 2007+.
 * Cố ý KHÔNG nhận .doc/.xls/.ppt đời cũ (có thể chứa macro).
 */
export const TASK_ATTACHMENT_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file by checking magic bytes against declared MIME type.
 * @param buffer - File buffer (first 16 bytes are enough)
 * @param declaredType - MIME type declared by the file/browser
 * @param allowedTypes - Set of allowed MIME types
 * @returns Validation result
 */
export function validateFileMagicBytes(
  buffer: Buffer,
  declaredType: string,
  allowedTypes: Set<string>
): FileValidationResult {
  // Check if declared type is allowed
  if (!allowedTypes.has(declaredType)) {
    return { valid: false, error: 'Loại file không được hỗ trợ' };
  }

  // Get expected magic bytes for this type
  const expectedSignatures = MAGIC_BYTES[declaredType];
  if (!expectedSignatures) {
    // No magic bytes check defined for this type - allow by default
    // This is safe because we already checked allowedTypes
    return { valid: true };
  }

  // Check if buffer matches any of the expected signatures
  const matches = expectedSignatures.some((sig) => {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) {
      return false;
    }
    return sig.bytes.every((byte, i) => buffer[offset + i] === byte);
  });

  if (!matches) {
    return {
      valid: false,
      error: 'Nội dung file không khớp với loại file khai báo',
    };
  }

  return { valid: true };
}

/**
 * Validate file from a File object (e.g., from FormData).
 * @param file - File object
 * @param allowedTypes - Set of allowed MIME types
 * @returns Validation result
 */
export async function validateFile(
  file: File,
  allowedTypes: Set<string>
): Promise<FileValidationResult> {
  // Ưu tiên MIME suy ra từ extension (browser có thể gửi type rỗng / octet-stream / sai)
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const declaredType = EXTENSION_MIME[ext] ?? file.type;
  // Read first 16 bytes for magic bytes check
  const headerBuffer = Buffer.from(await file.slice(0, 16).arrayBuffer());
  return validateFileMagicBytes(headerBuffer, declaredType, allowedTypes);
}