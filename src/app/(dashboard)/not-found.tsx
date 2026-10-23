import { NotFoundScreen } from '@/shared/ui/ErrorScreen';

/** 404 trong khung app (sidebar + topbar vẫn còn). Route lạ đi vào đây qua [...missing]/page.tsx. */
export default function DashboardNotFound() {
  return <NotFoundScreen />;
}
