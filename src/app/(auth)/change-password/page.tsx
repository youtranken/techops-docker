'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

interface PolicyCheck {
  label: string;
  met: boolean;
}

function getPolicyChecks(policy: PasswordPolicy, password: string): PolicyCheck[] {
  const checks: PolicyCheck[] = [
    { label: `Ít nhất ${policy.minLength} ký tự`, met: password.length >= policy.minLength },
  ];
  if (policy.requireUppercase) checks.push({ label: 'Có ít nhất 1 chữ hoa (A-Z)', met: /[A-Z]/.test(password) });
  if (policy.requireLowercase) checks.push({ label: 'Có ít nhất 1 chữ thường (a-z)', met: /[a-z]/.test(password) });
  if (policy.requireNumber) checks.push({ label: 'Có ít nhất 1 chữ số (0-9)', met: /[0-9]/.test(password) });
  if (policy.requireSpecialChar) checks.push({ label: 'Có ít nhất 1 ký tự đặc biệt (!@#...)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) });
  return checks;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);

  useEffect(() => {
    fetch('/api/auth/password-policy')
      .then((r) => r.json())
      .then((d) => { if (d.policy) setPolicy(d.policy); })
      .catch(() => {/* use default */});
  }, []);

  const policyChecks = getPolicyChecks(policy, form.newPassword);
  const allPolicyMet = form.newPassword.length > 0 && policyChecks.every((c) => c.met);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!allPolicyMet) {
      const failed = policyChecks.filter((c) => !c.met).map((c) => c.label);
      setError(failed.join(', '));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settings/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Đổi mật khẩu thất bại');
        return;
      }
      // Reload session và redirect về dashboard
      router.push('/');
      router.refresh();
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Đổi mật khẩu lần đầu</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Vì lý do bảo mật, bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập mật khẩu hiện tại"
              />
              <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowCurrent((v) => !v)}>
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập mật khẩu mới"
              />
              <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowNew((v) => !v)}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Password policy checklist */}
            {form.newPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
                {policyChecks.map((check) => (
                  <li key={check.label} className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-green-600' : 'text-gray-400'}`}>
                    {check.met
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      : <Circle className="w-3.5 h-3.5 shrink-0" />}
                    {check.label}
                  </li>
                ))}
              </ul>
            )}
            {form.newPassword.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Yêu cầu: tối thiểu {policy.minLength} ký tự
                {policy.requireUppercase && ', có chữ hoa'}
                {policy.requireLowercase && ', có chữ thường'}
                {policy.requireNumber && ', có chữ số'}
                {policy.requireSpecialChar && ', có ký tự đặc biệt'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
          >
            {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
