import { notFound } from 'next/navigation';
import { UiDemo } from './UiDemo';

/** Trang demo bộ component V2 — CHỈ cho dev. Production trả 404. */
export const dynamic = 'force-dynamic';

export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiDemo />;
}
