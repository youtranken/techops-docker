'use client';

// ─── Priority badge ────────────────────────────────────────────────────────────

const UU_TIEN_COLORS: Record<string, string> = {
  'Khẩn cấp':   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Cao':         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Bình thường': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Thấp':        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export function UuTienBadge({ uuTien }: { uuTien: string }) {
  const cls = UU_TIEN_COLORS[uuTien] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {uuTien}
    </span>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

const TRANG_THAI_COLORS: Record<string, string> = {
  'Completed':   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Pending':     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Rejected':    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Cancelled':   'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export function TrangThaiBadge({ trangThai }: { trangThai: string }) {
  const cls = TRANG_THAI_COLORS[trangThai] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {trangThai}
    </span>
  );
}
