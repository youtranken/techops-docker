// ─── Password Validator ──────────────────────────────────────────────────────
// Validate password theo policy từ SecurityConfig

import { securityConfigService } from '@/modules/settings/services/security-config.service';
import type { PasswordPolicyConfig } from '@/modules/settings/types';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  policy: PasswordPolicyConfig;
}

/**
 * Validate password theo policy hiện tại
 */
export async function validatePassword(password: string): Promise<PasswordValidationResult> {
  const config = await securityConfigService.get();
  const policy = config.passwordPolicy;
  const errors: string[] = [];

  // Kiểm tra độ dài
  if (password.length < policy.minLength) {
    errors.push(`Mật khẩu phải có ít nhất ${policy.minLength} ký tự`);
  }

  // Kiểm tra chữ hoa
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ hoa (A-Z)');
  }

  // Kiểm tra chữ thường
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ thường (a-z)');
  }

  // Kiểm tra số
  if (policy.requireNumber && !/\d/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ số (0-9)');
  }

  // Kiểm tra ký tự đặc biệt
  if (policy.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
  }

  return {
    valid: errors.length === 0,
    errors,
    policy,
  };
}

/**
 * Tạo mô tả policy cho UI
 */
export function describePolicyRequirements(policy: PasswordPolicyConfig): string[] {
  const requirements: string[] = [];

  requirements.push(`Ít nhất ${policy.minLength} ký tự`);

  if (policy.requireUppercase) {
    requirements.push('Chứa chữ hoa (A-Z)');
  }

  if (policy.requireLowercase) {
    requirements.push('Chứa chữ thường (a-z)');
  }

  if (policy.requireNumber) {
    requirements.push('Chứa chữ số (0-9)');
  }

  if (policy.requireSpecialChar) {
    requirements.push('Chứa ký tự đặc biệt (!@#$%...)');
  }

  if (policy.expiryDays > 0) {
    requirements.push(`Hết hạn sau ${policy.expiryDays} ngày`);
  }

  if (policy.historyCount > 0) {
    requirements.push(`Không trùng ${policy.historyCount} mật khẩu gần nhất`);
  }

  return requirements;
}

/**
 * Tính độ mạnh của password (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Độ dài
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Chứa chữ hoa
  if (/[A-Z]/.test(password)) score += 15;

  // Chứa chữ thường
  if (/[a-z]/.test(password)) score += 15;

  // Chứa số
  if (/\d/.test(password)) score += 15;

  // Chứa ký tự đặc biệt
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

  // Bonus cho độ đa dạng
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) score += 5;
  if (uniqueChars >= 12) score += 5;

  return Math.min(100, score);
}

/**
 * Lấy label cho độ mạnh password
 */
export function getStrengthLabel(strength: number): { label: string; color: string } {
  if (strength < 30) return { label: 'Yếu', color: 'text-red-500' };
  if (strength < 50) return { label: 'Trung bình', color: 'text-yellow-500' };
  if (strength < 70) return { label: 'Khá', color: 'text-blue-500' };
  if (strength < 90) return { label: 'Mạnh', color: 'text-green-500' };
  return { label: 'Rất mạnh', color: 'text-emerald-500' };
}
