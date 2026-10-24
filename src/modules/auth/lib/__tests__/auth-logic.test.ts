import { describe, it, expect } from 'vitest';
import {
  safeCallbackUrl, loginPayload, validateLogin, loginOutcome,
  resetPayload, validateResetForm, resetLinkState, resetServerError, verifyState, clearOnType,
} from '../auth-logic';
import { DEFAULT_POLICY } from '@/modules/settings/lib/password-rules';

describe('safeCallbackUrl — chỉ cho đường dẫn nội bộ (chặn open-redirect)', () => {
  it('giữ đường dẫn nội bộ như V1 (middleware gửi pathname)', () => {
    expect(safeCallbackUrl('/tasks')).toBe('/tasks');
    expect(safeCallbackUrl('/tasks/abc?tab=1#x')).toBe('/tasks/abc?tab=1#x');
    expect(safeCallbackUrl('/')).toBe('/');
  });
  it('trống / thiếu → "/" như V1 (`callbackUrl || "/"`)', () => {
    expect(safeCallbackUrl(undefined)).toBe('/');
    expect(safeCallbackUrl(null)).toBe('/');
    expect(safeCallbackUrl('')).toBe('/');
  });
  it('URL ngoài, protocol-relative, javascript:, gạch ngược → "/"', () => {
    for (const bad of [
      'https://evil.example/x', 'http://evil.example', '//evil.example/x', '/\\evil.example', '\\\\evil.example',
      'javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'tasks', ' /tasks', '/\tevil', '/\n/evil.example',
    ]) expect(safeCallbackUrl(bad), bad).toBe('/');
  });
  it('mảng (searchParams lặp) → lấy phần tử đầu rồi kiểm', () => {
    expect(safeCallbackUrl(['/hr/users', '//x'])).toBe('/hr/users');
    expect(safeCallbackUrl(['//x', '/a'])).toBe('/');
  });
});

describe('đăng nhập — payload + lỗi giữ V1', () => {
  it('payload signIn("credentials") giống hệt V1: giá trị ô gốc, redirect:false', () => {
    expect(loginPayload({ username: ' leminh ', password: 'P@ss 1' })).toEqual({ username: ' leminh ', password: 'P@ss 1', redirect: false });
  });
  it('ô trống → lỗi dưới ô (V1 dùng required của trình duyệt)', () => {
    expect(validateLogin({ username: '', password: '' })).toEqual({ username: 'au.user.req', password: 'au.pass.req' });
    expect(validateLogin({ username: '   ', password: 'x' })).toEqual({ username: 'au.user.req' });
    expect(validateLogin({ username: 'a', password: 'x' })).toEqual({});
  });
  it('MỌI lỗi signIn (sai mật khẩu, không có user, bị khoá, vô hiệu hoá…) → MỘT câu chung (chống dò tài khoản)', () => {
    for (const error of ['CredentialsSignin', 'Configuration', 'AccessDenied', 'anything']) {
      expect(loginOutcome({ error, ok: false, status: 401, url: null })).toEqual({ kind: 'error', key: 'au.err.wrong' });
    }
  });
  it('không lỗi → chuyển trang; ném lỗi (mạng) → câu lỗi chung của V1', () => {
    expect(loginOutcome({ error: undefined, ok: true, status: 200, url: 'x' })).toEqual({ kind: 'ok' });
    expect(loginOutcome(undefined)).toEqual({ kind: 'ok' }); // V1: chỉ kiểm result?.error
    expect(loginOutcome('throw')).toEqual({ kind: 'error', key: 'aux.err.generic' });
  });
});

describe('đặt lại mật khẩu — giữ V1', () => {
  it('payload POST /api/auth/reset-password = { token, newPassword }', () => {
    expect(resetPayload('tok', { next: 'Abcdefg1', confirm: 'Abcdefg1' })).toEqual({ token: 'tok', newPassword: 'Abcdefg1' });
  });
  it('trạng thái link: thiếu token / check false / lỗi mạng / hợp lệ', () => {
    expect(resetLinkState('', undefined)).toBe('bad');
    expect(resetLinkState('t', { valid: false })).toBe('expired');
    expect(resetLinkState('t', {})).toBe('expired');
    expect(resetLinkState('t', 'net')).toBe('net');
    expect(resetLinkState('t', { valid: true })).toBe('form');
    expect(resetLinkState('t', undefined)).toBe('checking');
  });
  it('kiểm form: trống, chưa đạt chính sách, không khớp', () => {
    expect(validateResetForm({ next: '', confirm: '' }, DEFAULT_POLICY)).toEqual({ next: 'au.new.req', confirm: 'au.new2.req' });
    expect(validateResetForm({ next: 'abc', confirm: 'abc' }, DEFAULT_POLICY)).toEqual({ next: 'au.err.policy' });
    expect(validateResetForm({ next: 'Abcdefg1', confirm: 'Abcdefg2' }, DEFAULT_POLICY)).toEqual({ confirm: 'au.err.match' });
    expect(validateResetForm({ next: 'Abcdefg1', confirm: 'Abcdefg1' }, DEFAULT_POLICY)).toEqual({});
    expect(validateResetForm({ next: 'abcdefgh1', confirm: 'abcdefgh1' }, { ...DEFAULT_POLICY, requireUppercase: false })).toEqual({});
  });
  it('lỗi server: WEAK_PASSWORD → ô mật khẩu mới; TOKEN_INVALID → màn link hết hạn; khác → ghi chú', () => {
    expect(resetServerError('WEAK_PASSWORD')).toEqual({ field: 'next' });
    expect(resetServerError('TOKEN_INVALID')).toEqual({ link: 'expired' });
    expect(resetServerError('USER_INACTIVE')).toEqual({ note: true });
    expect(resetServerError(undefined)).toEqual({ note: true });
  });
});

describe('xác minh email — 4 kết quả V1 + đang xử lý', () => {
  const p = (q: string) => new URLSearchParams(q);
  it('ánh xạ query V1', () => {
    expect(verifyState(p('success=1'))).toBe('ok');
    expect(verifyState(p('error=missing_token'))).toBe('missing');
    expect(verifyState(p('error=invalid_or_expired'))).toBe('expired');
    expect(verifyState(p('error=email_changed'))).toBe('changed');
    expect(verifyState(p('error=khac'))).toBe('unknown');
    expect(verifyState(p(''))).toBe('busy');
    expect(verifyState(p('success=0'))).toBe('busy');
  });
});

describe('clearOnType — gõ lại thì gỡ lỗi đúng ô', () => {
  it('gỡ lỗi "bắt buộc" của ô đang gõ, giữ lỗi ô khác', () => {
    expect(clearOnType({ current: 'au.cur.req', next: 'au.new.req' }, 'current', { current: 'a', next: '', confirm: '' }, DEFAULT_POLICY))
      .toEqual({ next: 'au.new.req' });
  });
  it('lỗi chính sách chỉ gỡ khi đạt đủ', () => {
    expect(clearOnType({ next: 'au.err.policy' }, 'next', { next: 'Abc', confirm: '' }, DEFAULT_POLICY)).toEqual({ next: 'au.err.policy' });
    expect(clearOnType({ next: 'au.err.policy' }, 'next', { next: 'Abcdefg1', confirm: '' }, DEFAULT_POLICY)).toEqual({});
  });
  it('"không khớp" chỉ gỡ khi đã khớp (gõ ở ô nào cũng vậy)', () => {
    expect(clearOnType({ confirm: 'au.err.match' }, 'confirm', { next: 'Abcdefg1', confirm: 'Abc' }, DEFAULT_POLICY)).toEqual({ confirm: 'au.err.match' });
    expect(clearOnType({ confirm: 'au.err.match' }, 'next', { next: 'Abc', confirm: 'Abc' }, DEFAULT_POLICY)).toEqual({});
  });
});
