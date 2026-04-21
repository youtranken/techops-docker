import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptSecret, decryptSecret } from '../crypto';

// Helper để set SMTP_ENCRYPT_KEY trong process.env
const VALID_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

describe('encryptSecret', () => {
  beforeEach(() => {
    vi.stubEnv('SMTP_ENCRYPT_KEY', VALID_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('trả về chuỗi "iv:tag:ciphertext" khi có key', () => {
    const result = encryptSecret('mysecret');
    const parts = result.split(':');
    expect(parts).toHaveLength(3);
    // iv = 12 bytes → 24 hex chars
    expect(parts[0]).toHaveLength(24);
  });

  it('mỗi lần mã hóa cho kết quả khác nhau (random IV)', () => {
    const a = encryptSecret('samepassword');
    const b = encryptSecret('samepassword');
    expect(a).not.toBe(b);
  });

  it('trả về "plain:<text>" khi SMTP_ENCRYPT_KEY không có', () => {
    vi.stubEnv('SMTP_ENCRYPT_KEY', '');
    const result = encryptSecret('mypassword');
    expect(result).toBe('plain:mypassword');
  });

  it('trả về "plain:<text>" khi key sai độ dài', () => {
    vi.stubEnv('SMTP_ENCRYPT_KEY', 'tooshort');
    const result = encryptSecret('mypassword');
    expect(result).toBe('plain:mypassword');
  });
});

describe('decryptSecret', () => {
  beforeEach(() => {
    vi.stubEnv('SMTP_ENCRYPT_KEY', VALID_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('encrypt rồi decrypt lại ra đúng plaintext', () => {
    const original = 'my-smtp-password-123!';
    const encrypted = encryptSecret(original);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(original);
  });

  it('giải mã chuỗi "plain:<text>" trả về text gốc', () => {
    const result = decryptSecret('plain:mypassword');
    expect(result).toBe('mypassword');
  });

  it('backward compat: chuỗi không có format → trả về nguyên', () => {
    // Chuỗi cũ chưa được mã hóa (không đủ 3 phần)
    const old = 'plaintextpassword';
    const result = decryptSecret(old);
    expect(result).toBe(old);
  });

  it('chuỗi chỉ có 2 phần (không phải format) → trả về nguyên', () => {
    const result = decryptSecret('part1:part2');
    expect(result).toBe('part1:part2');
  });

  it('khi không có key, chuỗi mã hóa được trả về nguyên (fail-safe)', () => {
    const encrypted = encryptSecret('secret');
    vi.stubEnv('SMTP_ENCRYPT_KEY', '');
    const result = decryptSecret(encrypted);
    // Không có key → fallback trả nguyên chuỗi (3 phần)
    expect(result).toBe(encrypted);
  });

  it('chuỗi bị hỏng → trả về chuỗi gốc (không crash)', () => {
    // Tạo chuỗi dạng 3 phần nhưng dữ liệu sai
    const corrupted = 'aabbccddee112233:aabbccddee112233aabbccdd:deadbeef';
    expect(() => decryptSecret(corrupted)).not.toThrow();
  });

  it('mã hóa chuỗi rỗng không lỗi', () => {
    const enc = encryptSecret('');
    const dec = decryptSecret(enc);
    expect(dec).toBe('');
  });

  it('mã hóa / giải mã chuỗi unicode', () => {
    const original = 'Mật khẩu tiếng Việt 123!';
    const enc = encryptSecret(original);
    const dec = decryptSecret(enc);
    expect(dec).toBe(original);
  });
});
