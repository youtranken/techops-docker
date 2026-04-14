import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validatePassword, 
  calculatePasswordStrength, 
  getStrengthLabel,
  describePolicyRequirements 
} from '../password-validator';

// Mock securityConfigService
vi.mock('@/modules/settings/services/security-config.service', () => ({
  securityConfigService: {
    get: vi.fn().mockResolvedValue({
      rateLimit: { enabled: true, maxRequests: 100, windowSeconds: 60, loginMaxAttempts: 5, lockoutMinutes: 15 },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: true,
        expiryDays: 0,
        historyCount: 0,
      },
      session: { idleTimeoutMinutes: 30, maxSessionHours: 24, allowMultipleSessions: true },
    }),
  },
}));

describe('validatePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject password shorter than minLength', async () => {
    const result = await validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mật khẩu phải có ít nhất 8 ký tự');
  });

  it('should reject password without uppercase', async () => {
    const result = await validatePassword('lowercase1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('chữ hoa'))).toBe(true);
  });

  it('should reject password without lowercase', async () => {
    const result = await validatePassword('UPPERCASE1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('chữ thường'))).toBe(true);
  });

  it('should reject password without number', async () => {
    const result = await validatePassword('NoNumbers!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('chữ số'))).toBe(true);
  });

  it('should reject password without special char', async () => {
    const result = await validatePassword('NoSpecial1');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ký tự đặc biệt'))).toBe(true);
  });

  it('should accept valid password meeting all requirements', async () => {
    const result = await validatePassword('ValidPass1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return policy in result', async () => {
    const result = await validatePassword('test');
    expect(result.policy).toBeDefined();
    expect(result.policy.minLength).toBe(8);
  });
});

describe('calculatePasswordStrength', () => {
  it('should return low score for weak password', () => {
    const score = calculatePasswordStrength('123');
    expect(score).toBeLessThan(30);
  });

  it('should return medium score for moderate password', () => {
    const score = calculatePasswordStrength('Password1');
    expect(score).toBeGreaterThanOrEqual(30);
    expect(score).toBeLessThanOrEqual(70); // Fixed: 70 is medium-high boundary
  });

  it('should return high score for strong password', () => {
    const score = calculatePasswordStrength('MyStr0ng!Pass#2024');
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('should give bonus for length', () => {
    const short = calculatePasswordStrength('Aa1!');
    const long = calculatePasswordStrength('Aa1!Aa1!Aa1!Aa1!');
    expect(long).toBeGreaterThan(short);
  });

  it('should give bonus for character diversity', () => {
    const repeated = calculatePasswordStrength('aaaaaaaa');
    const diverse = calculatePasswordStrength('abcdefgh');
    expect(diverse).toBeGreaterThan(repeated);
  });

  it('should cap at 100', () => {
    const score = calculatePasswordStrength('MyVeryStr0ng!Pass#2024WithExtraLength!!!');
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('getStrengthLabel', () => {
  it('should return "Yếu" for low strength', () => {
    const result = getStrengthLabel(20);
    expect(result.label).toBe('Yếu');
    expect(result.color).toContain('red');
  });

  it('should return "Trung bình" for medium strength', () => {
    const result = getStrengthLabel(40);
    expect(result.label).toBe('Trung bình');
    expect(result.color).toContain('yellow');
  });

  it('should return "Khá" for good strength', () => {
    const result = getStrengthLabel(60);
    expect(result.label).toBe('Khá');
    expect(result.color).toContain('blue');
  });

  it('should return "Mạnh" for high strength', () => {
    const result = getStrengthLabel(80);
    expect(result.label).toBe('Mạnh');
    expect(result.color).toContain('green');
  });

  it('should return "Rất mạnh" for very high strength', () => {
    const result = getStrengthLabel(95);
    expect(result.label).toBe('Rất mạnh');
    expect(result.color).toContain('emerald');
  });
});

describe('describePolicyRequirements', () => {
  it('should include minLength requirement', () => {
    const policy = { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecialChar: false, expiryDays: 0, historyCount: 0 };
    const requirements = describePolicyRequirements(policy);
    expect(requirements.some(r => r.includes('8 ký tự'))).toBe(true);
  });

  it('should include uppercase requirement when enabled', () => {
    const policy = { minLength: 8, requireUppercase: true, requireLowercase: false, requireNumber: false, requireSpecialChar: false, expiryDays: 0, historyCount: 0 };
    const requirements = describePolicyRequirements(policy);
    expect(requirements.some(r => r.includes('A-Z'))).toBe(true);
  });

  it('should include expiry when set', () => {
    const policy = { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecialChar: false, expiryDays: 90, historyCount: 0 };
    const requirements = describePolicyRequirements(policy);
    expect(requirements.some(r => r.includes('90 ngày'))).toBe(true);
  });

  it('should include history count when set', () => {
    const policy = { minLength: 8, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecialChar: false, expiryDays: 0, historyCount: 5 };
    const requirements = describePolicyRequirements(policy);
    expect(requirements.some(r => r.includes('5 mật khẩu'))).toBe(true);
  });
});
