import { cleanupE2E } from './helpers/db';

export default async function globalTeardown() {
  // E2E_KEEP=1: giữ dữ liệu [E2E] để xem tay sau khi chạy (nhớ dọn bằng cách chạy lại test không có biến này)
  if (process.env.E2E_KEEP === '1') return;
  cleanupE2E();
}
