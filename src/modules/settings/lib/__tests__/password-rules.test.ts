import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  policyChecks, validatePasswordForm, changePasswordPayload, passwordServerError, DEFAULT_POLICY,
} from '../password-rules';
import type { PasswordPolicyConfig } from '../../types';

const cfg = vi.hoisted(() => ({ policy: null as null | Record<string, unknown> }));
vi.mock('@/modules/settings/services/security-config.service', () => ({
  securityConfigService: { get: async () => ({ passwordPolicy: cfg.policy }) },
}));

const P = (o: Partial<PasswordPolicyConfig> = {}): PasswordPolicyConfig => ({ ...DEFAULT_POLICY, ...o });

describe('policyChecks — danh sách yêu cầu hiển thị theo chính sách V1', () => {
  it('mặc định V1: ≥8, hoa, thường, số (không ký tự đặc biệt)', () => {
    expect(DEFAULT_POLICY).toMatchObject({ minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecialChar: false });
    expect(policyChecks(DEFAULT_POLICY, 'abc').map((c) => [c.key, c.ok])).toEqual([
      ['au.pol.len', false], ['au.pol.up', false], ['au.pol.low', true], ['au.pol.num', false],
    ]);
    expect(policyChecks(DEFAULT_POLICY, 'Abcdefg1').every((c) => c.ok)).toBe(true);
    expect(policyChecks(DEFAULT_POLICY, '')[0].values).toEqual({ n: 8 });
  });
  it('bật ký tự đặc biệt', () => {
    const c = policyChecks(P({ requireSpecialChar: true, minLength: 10 }), 'Abcdefgh1!');
    expect(c.map((x) => x.key)).toEqual(['au.pol.len', 'au.pol.up', 'au.pol.low', 'au.pol.num', 'au.pol.sp']);
    expect(c.every((x) => x.ok)).toBe(true);
  });
});

describe('policyChecks khớp validatePassword của server (lib/password-policy.ts)', () => {
  beforeEach(() => { vi.resetModules(); });
  const policies = [DEFAULT_POLICY, P({ requireSpecialChar: true }), P({ minLength: 12, requireUppercase: false }), P({ requireNumber: false, requireLowercase: false })];
  const samples = ['', 'abc', 'abcdefgh', 'ABCDEFGH1', 'Abcdefg1', 'Abcdefg1!', 'Abc def 1', 'Ábcdefg1', 'aaaaaaaaaaaa', 'Aa1[]{};:"', 'Aa1\\|,.<>/?', 'Aa1~`€xxxx'];
  for (const [i, pol] of policies.entries()) {
    it(`chính sách #${i}`, async () => {
      cfg.policy = pol as unknown as Record<string, unknown>;
      const { validatePassword } = await import('@/lib/password-policy');
      for (const s of samples) {
        const server = (await validatePassword(s)).valid;
        expect([s, policyChecks(pol, s).every((c) => c.ok)]).toEqual([s, server]);
      }
    });
  }
});

describe('validatePasswordForm — lỗi dưới từng ô', () => {
  it('trống hết', () => {
    expect(validatePasswordForm({ current: '', next: '', confirm: '' }, DEFAULT_POLICY)).toEqual({
      current: 'au.cur.req', next: 'au.new.req', confirm: 'au.new2.req',
    });
  });
  it('mới chưa đạt chính sách, xác nhận không khớp', () => {
    expect(validatePasswordForm({ current: 'x', next: 'abc', confirm: 'abd' }, DEFAULT_POLICY)).toEqual({
      next: 'au.err.policy', confirm: 'au.err.match',
    });
  });
  it('hợp lệ', () => {
    expect(validatePasswordForm({ current: 'x', next: 'Abcdefg1', confirm: 'Abcdefg1' }, DEFAULT_POLICY)).toEqual({});
  });
});

describe('payload + lỗi server của POST /api/settings/profile/change-password (V1)', () => {
  it('body đúng 2 trường như V1', () => {
    expect(changePasswordPayload({ current: 'Old1pass', next: 'New1pass', confirm: 'New1pass' })).toEqual({ currentPassword: 'Old1pass', newPassword: 'New1pass' });
  });
  it('mã lỗi → ô tương ứng', () => {
    expect(passwordServerError('WRONG_PASSWORD')).toEqual({ field: 'current', key: 'au.err.cur' });
    expect(passwordServerError('SAME_PASSWORD')).toEqual({ field: 'next', key: 'au.err.same' });
    expect(passwordServerError('PASSWORD_POLICY_VIOLATION')).toEqual({ field: 'next', key: null });
    expect(passwordServerError('RATE_LIMITED')).toBeNull();
    expect(passwordServerError(undefined)).toBeNull();
  });
});
