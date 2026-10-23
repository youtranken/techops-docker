import { NotFoundScreen } from '@/shared/ui/ErrorScreen';

/** 404 ngoài khung app (vd. khi chưa đăng nhập hoặc notFound() ở nhóm (auth)). */
export default function NotFound() {
  return (
    <main className="bg-canvas px-4">
      <NotFoundScreen standalone />
    </main>
  );
}
