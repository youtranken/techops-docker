import { securityConfigService } from '@/modules/settings/services/security-config.service';
import type { PasswordPolicyConfig } from '@/modules/settings/types';

// Cache security config for 60 seconds
let cachedPolicy: { config: PasswordPolicyConfig; expiry: number } | null = null;

async function getPasswordPolicy(): Promise<PasswordPolicyConfig> {
  const now = Date.now();
  if (cachedPolicy && now < cachedPolicy.expiry) {
    return cachedPolicy.config;
  }

  try {
    const config = await securityConfigService.get();
    cachedPolicy = { config: config.passwordPolicy, expiry: now + 60_000 };
    return config.passwordPolicy;
  } catch (err) {
    console.error('[PasswordPolicy] Failed to get config:', err);
    // Return defaults if DB fails
    return {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: false,
      expiryDays: 0,
      historyCount: 0,
    };
  }
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a password against the current security policy.
 * Returns validation result with specific error messages.
 */
export async function validatePassword(password: string): Promise<PasswordValidationResult> {
  const policy = await getPasswordPolicy();
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Mật khẩu phải có ít nhất ${policy.minLength} ký tự`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
  }

  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 số');
  }

  if (policy.requireSpecialChar && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the current password policy (for displaying requirements to users).
 */
export async function getCurrentPasswordPolicy(): Promise<PasswordPolicyConfig> {
  return getPasswordPolicy();
}