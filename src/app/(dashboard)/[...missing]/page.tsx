import { notFound } from 'next/navigation';

/**
 * Bắt mọi đường dẫn không khớp trong khung app → hiện 404 của (dashboard) (có sidebar/topbar)
 * thay cho trang 404 trơn ở gốc. Route cụ thể luôn được ưu tiên hơn catch-all.
 */
export default function MissingPage() {
  notFound();
}
