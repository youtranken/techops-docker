/**
 * AES-256-GCM encryption helpers cho sensitive data (SMTP password, v.v.)
 *
 * Key: SMTP_ENCRYPT_KEY env var, 64 hex chars (= 32 bytes).
 * Format lưu DB: "<iv_hex>:<tag_hex>:<ciphertext_hex>"
 *
 * Nếu SMTP_ENCRYPT_KEY không được cấu hình → trả về plaintext với cảnh báo.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12; // bytes — 96-bit IV recommended for GCM

function getKey(): Buffer | null {
  const raw = process.env.SMTP_ENCRYPT_KEY;
  if (!raw) return null;
  // 64 hex chars = 32 bytes (format cũ)
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) return Buffer.from(raw, 'hex');
  // Base64 32 bytes (format mới — `openssl rand -base64 32`)
  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
  } catch { /* fallthrough */ }
  return null;
}

/**
 * Mã hóa plaintext. Trả về chuỗi "iv:tag:ciphertext" (hex).
 * S3: production BẮT BUỘC SMTP_ENCRYPT_KEY — throw nếu thiếu để không lưu plaintext xuống DB.
 * Dev mode vẫn cho phép plaintext fallback (kèm warn) để dễ làm việc.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SMTP_ENCRYPT_KEY is required in production. Generate one via: openssl rand -base64 32',
      );
    }
    console.warn('[crypto] SMTP_ENCRYPT_KEY not set — storing password as plaintext (DEV ONLY)');
    return `plain:${plaintext}`;
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Giải mã chuỗi từ encryptSecret.
 * Nếu chuỗi có prefix "plain:" → trả về plaintext gốc.
 * Nếu chuỗi không phải format mã hóa → coi là plaintext cũ (backward compat).
 */
export function decryptSecret(stored: string): string {
  if (stored.startsWith('plain:')) return stored.slice(6);

  const key = getKey();
  if (!key) return stored; // fallback: chuỗi cũ plaintext

  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // chuỗi cũ plaintext (legacy compat)

  try {
    const [ivHex, tagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  } catch (err) {
    // P2 fix: throw rõ thay vì silent return chuỗi gốc (encrypted) — nếu không
    // throw, SMTP send sẽ fail bí ẩn vì password sai. Throw giúp admin biết
    // SMTP_ENCRYPT_KEY không match data lưu trong DB.
    console.error('[crypto] Failed to decrypt secret — key mismatch or corrupted data:', err);
    throw new Error('SMTP_DECRYPT_FAILED: Cấu hình SMTP đã được mã hóa với key khác hoặc bị hỏng. Vui lòng cấu hình lại SMTP qua UI.');
  }
}
