'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Link xác nhận không hợp lệ.',
  invalid_or_expired: 'Link đã hết hạn hoặc không còn hiệu lực. Vui lòng liên hệ quản trị viên để gửi lại.',
  email_changed: 'Địa chỉ email đã thay đổi. Link xác nhận này không còn hiệu lực.',
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === '1';
  const errorKey = searchParams.get('error') ?? '';
  const errorMsg = ERROR_MESSAGES[errorKey] ?? 'Có lỗi xảy ra, vui lòng thử lại.';

  if (success) {
    return (
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Email đã được xác nhận!</h1>
        <p className="text-sm text-gray-500">Địa chỉ email của bạn đã được xác nhận thành công.</p>
        <Link
          href="/"
          className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline"
        >
          Quay về trang chủ →
        </Link>
      </div>
    );
  }

  if (errorKey) {
    return (
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Xác nhận thất bại</h1>
        <p className="text-sm text-gray-500">{errorMsg}</p>
        <Link href="/" className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline">
          Quay về trang chủ →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
        <Mail className="w-7 h-7 text-indigo-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Xác nhận Email</h1>
      <p className="text-sm text-gray-500">Đang xử lý yêu cầu xác nhận email của bạn...</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <Suspense fallback={<div className="text-center text-sm text-gray-500">Đang tải...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
