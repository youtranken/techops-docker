'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, CheckCircle2, Circle } from 'lucide-react';

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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);
  // null = đang check, true = valid, false = invalid/expired
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Link không hợp lệ hoặc đã hết hạn');
      setTokenValid(false);
      return;
    }
    // Validate token server-side khi mount → expired thì hiện error ngay (không cho điền form)
    fetch(`/api/auth/reset-password/check?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError('Link đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu gửi lại link mới.');
        }
      })
      .catch(() => {
        setTokenValid(false);
        setError('Không thể kiểm tra link. Vui lòng thử lại sau.');
      });
  }, [token]);

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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Đặt lại mật khẩu thất bại');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Đặt lại mật khẩu thành công!</h1>
        <p className="text-sm text-gray-500">Đang chuyển về trang đăng nhập...</p>
      </div>
    );
  }

  // Đang check token
  if (tokenValid === null) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-gray-500">Đang kiểm tra link...</p>
      </div>
    );
  }

  // Token invalid/expired → ẩn form, chỉ hiện error + nút quay về login
  if (tokenValid === false) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <Lock className="w-6 h-6 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Link không khả dụng</h1>
        <p className="text-sm text-gray-600">{error || 'Link đã hết hạn hoặc không hợp lệ'}</p>
        <button
          onClick={() => router.push('/login')}
          className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition"
        >
          Về trang đăng nhập
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
        <p className="text-sm text-gray-500 mt-1 text-center">Nhập mật khẩu mới cho tài khoản của bạn</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={!token}
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
            disabled={!token}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
        >
          {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <Suspense fallback={<div className="text-center text-sm text-gray-500">Đang tải...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
