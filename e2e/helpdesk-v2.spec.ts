/**
 * E2E — A3-3: trang Helpdesk V2 (+ Nhập dữ liệu).
 *  (a) Boss: danh sách ticket [E2E] (chèn SQL), tìm kiếm, dòng cần chú ý / đã tạo việc, hộp lọc + chip → tham số API như V1.
 *  (b) Ngăn chi tiết → "Tạo công việc" (POST /unassigned/{id} thật trên DB local) → ticket PUSHED + có Task; "Xoá" có xác nhận → DB.
 *  (c) Chọn nhiều → Gán người (route giả: kiểm body từng ticket) → Xoá hàng loạt (thật) → DB.
 *  (d) Nhập dữ liệu / Lấy dữ liệu ngay / Lịch tự động: KHÔNG gọi Helpdesk thật — page.route giả POST /sync, /cron-config;
 *      kiểm body gửi đi giống V1 (JSON: { manualData }, API: không body; cron: 6 trường).
 *  (e) Admin: Đặt lại dữ liệu (route giả request-otp + reset) → DELETE ?otp=…; Boss không thấy mục này.
 *  (f) Nhân viên được cấp menu: chỉ xem (không khu đồng bộ / nhập / ô chọn / nút trong ngăn); 390px không cuộn ngang; tiếng Anh.
 * Dữ liệu [E2E] (ticket hdId E2E-*, Task) dọn ở globalTeardown (cleanupE2E).
 */
import { test, expect, type Page, type Cookie, type Route } from '@playwright/test';
import { E2E_USERS, E2E_PASSWORD, psql } from './helpers/db';

const RUN = `E2E-${Date.now().toString(36)}`;
type Who = 'admin' | 'boss' | 'emp';
const sessions: Record<Who, Cookie[]> = { admin: [], boss: [], emp: [] };
const uid = (u: string) => psql(`SELECT id FROM "User" WHERE username='${u}';`);
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function signIn(page: Page, username: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();
    try { await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 }); return; } catch (e) {
      if (attempt) throw e;
      await page.waitForTimeout(61_000);
    }
  }
}
async function as(page: Page, who: Who) {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}

/** Ticket mẫu: k = hậu tố; thoiGian tương lai để luôn đứng đầu danh sách (sắp theo ngày tạo giảm dần) */
function seed(k: string, title: string, trangThai: string, itSupport: string | null, status = 'UNASSIGNED', uuTien = 'Bình thường') {
  psql(`INSERT INTO "HelpdeskPendingTask"(id,"hdId","tieuDe","dienGiai","uuTien","loaiYeuCau","nhanVien","phongBan","thoiGian",status,"createdAt","updatedAt","trangThai","itSupport","ngayHoanThanh")
    VALUES ('ce2ehd${k}${RUN.slice(4)}', '${RUN}-${k}', '[E2E] ${title} ${RUN}', 'Mô tả ${k}', '${uuTien}', 'Phần mềm', 'Nhân viên ${k}', 'Phòng E2E',
      (now() AT TIME ZONE 'UTC') + interval '400 days', '${status}', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', '${trangThai}', ${itSupport ? `'${itSupport}'` : 'NULL'},
      ${trangThai === 'Hoàn thành' ? "(now() AT TIME ZONE 'UTC') + interval '401 days'" : 'NULL'});`);
}
const pendingStatus = (k: string) => psql(`SELECT status FROM "HelpdeskPendingTask" WHERE "hdId"='${RUN}-${k}';`);
const rowsOf = (page: Page) => page.getByTestId('hd-table').locator('[role="row"][tabindex="0"]');
const row = (page: Page, k: string) => rowsOf(page).filter({ hasText: `${RUN}-${k}` });

async function openList(page: Page) {
  await page.goto('/helpdesk');
  await page.getByTestId('hd-search').fill(RUN);
  await expect(page.getByTestId('hd-total')).toContainText(/\d/, { timeout: 60_000 });
}

test.describe.serial('A3-3 — Helpdesk V2', () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(300_000);
    seed('A', 'Cần chú ý', 'Hoàn thành', null, 'UNASSIGNED', 'Khẩn cấp');
    seed('B', 'Đang chờ', 'Chờ xử lý', 'Le Minh');
    seed('C', 'Đã tạo việc', 'Hoàn thành', 'Le Minh', 'PUSHED');
    seed('D', 'Hàng loạt 1', 'Chờ xử lý', null);
    seed('E', 'Hàng loạt 2', 'Đang xử lý', null);
    const emp = uid(E2E_USERS.emp.username);
    psql(`DELETE FROM "SidebarPermission" WHERE "userId"='${emp}';
      INSERT INTO "SidebarPermission"(id,"userId","visibleMenus","featurePermissions","createdAt","updatedAt")
      VALUES ('ce2ehdperm${emp.slice(-15)}','${emp}','["helpdesk"]','{}', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');`);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    for (const who of ['boss', 'admin', 'emp'] as const) {
      await signIn(page, E2E_USERS[who].username);
      sessions[who] = await page.context().cookies();
    }
    await page.close();
  });

  test('(a) danh sách, tìm kiếm, cờ dòng, hộp lọc + chip', async ({ page }) => {
    await as(page, 'boss');
    const urls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/integrations/helpdesk/unassigned?')) urls.push(r.url()); });
    await openList(page);
    await expect(rowsOf(page)).toHaveCount(5, { timeout: 30_000 });
    await expect(page.getByTestId('hd-total')).toHaveText('Tổng cộng 5 ticket từ hệ thống Helpdesk');
    // V1: tham số search + limit=25
    await expect.poll(() => urls.some((u) => u.includes(`search=${RUN}`) && u.includes('limit=25'))).toBe(true);
    // A cần chú ý (đã hoàn thành, chưa IT Support), C đã tạo việc → không có ô chọn
    await expect(row(page, 'A')).toHaveClass(/hd-attn/);
    await expect(row(page, 'A')).toContainText('Cần chú ý');
    await expect(row(page, 'C').getByTestId('hd-pushed')).toHaveText('Đã tạo công việc');
    await expect(row(page, 'C').locator('input[type=checkbox]')).toHaveCount(0);
    await expect(row(page, 'B').locator('input[type=checkbox]')).toHaveCount(1);
    await expect(row(page, 'B')).toContainText('Chờ xử lý');

    // Hộp lọc: Trạng thái = Hoàn thành → chỉ A, C; chip + Xoá bộ lọc
    await page.getByTestId('hd-filter-btn').click();
    const dlg = page.getByTestId('hd-filter-dlg');
    await dlg.locator('#hdf-trangThai').selectOption('Hoàn thành');
    await dlg.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(rowsOf(page)).toHaveCount(2);
    expect(urls.at(-1)).toContain(`trangThai=${encodeURIComponent('Hoàn thành').replace(/%20/g, '+')}`);
    await expect(page.getByTestId('hd-filter-btn')).toHaveText(/Lọc · 1/);
    await expect(page.getByTestId('hd-chips')).toContainText('Trạng thái Helpdesk:');
    // IT Support = Chưa có (__none__) → A
    await page.getByTestId('hd-filter-btn').click();
    await dlg.locator('#hdf-itSupport').selectOption('__none__');
    await dlg.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(rowsOf(page)).toHaveCount(1);
    expect(urls.at(-1)).toContain('itSupport=__none__');
    await page.getByTestId('hd-chips').getByRole('button', { name: 'Xoá bộ lọc' }).click();
    await expect(rowsOf(page)).toHaveCount(5);
    await expect(page.getByTestId('hd-chips')).toHaveCount(0);
  });

  test('(b) ngăn chi tiết: Tạo công việc (gán người) + Xoá → DB', async ({ page }) => {
    await as(page, 'boss');
    await openList(page);
    await row(page, 'A').click();
    const dr = page.getByTestId('hd-drawer');
    await expect(dr).toContainText(`[E2E] Cần chú ý ${RUN}`);
    await expect(dr).toContainText('chưa có IT Support');
    await expect(dr).toContainText('Ưu tiênKhẩn');
    await dr.getByTestId('hd-dr-create').click();
    const as1 = page.getByTestId('hd-assign-dlg');
    await expect(as1.getByTestId('dlg-task')).toContainText(`${RUN}-A`);
    await as1.getByRole('button', { name: 'Tạo công việc' }).click();
    await expect(as1).toContainText('Chọn người xử lý'); // lỗi khi chưa chọn
    await as1.locator('#hd-as-sel').selectOption({ label: E2E_USERS.emp.displayName });
    await as1.getByRole('button', { name: 'Tạo công việc' }).click();
    await expect.poll(() => pendingStatus('A'), { timeout: 30_000 }).toBe('PUSHED');
    expect(psql(`SELECT count(*) FROM "Task" WHERE "hdId"='${RUN}-A' AND status='COMPLETED';`)).toBe('1');
    await expect(page.getByText(`từ ${RUN}-A`)).toBeVisible();
    await expect(row(page, 'A').getByTestId('hd-pushed')).toBeVisible();

    // Xoá B qua ngăn chi tiết, có hộp xác nhận
    await row(page, 'B').click();
    await dr.getByTestId('hd-dr-del').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá' }).click();
    await expect.poll(() => pendingStatus('B')).toBe('');
    await expect(rowsOf(page)).toHaveCount(4);
    // ticket đã tạo việc: ngăn không có nút
    await row(page, 'C').click();
    await expect(dr).toContainText('Đã tạo công việc từ ticket này.');
    await expect(dr.getByTestId('hd-dr-create')).toHaveCount(0);
  });

  test('(c) chọn nhiều: gán (body V1 từng ticket) + xoá hàng loạt', async ({ page }) => {
    await as(page, 'boss');
    await openList(page);
    await row(page, 'D').locator('input[type=checkbox]').check();
    await row(page, 'E').locator('input[type=checkbox]').check();
    await expect(page.getByTestId('hd-bulk')).toContainText('Đã chọn 2 ticket');
    // Gán: giả server để không tạo việc thật, kiểm body
    const bodies: { url: string; body: string | null }[] = [];
    await page.route('**/api/integrations/helpdesk/unassigned/*', async (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      bodies.push({ url: r.request().url(), body: r.request().postData() });
      await r.fulfill({ status: 201, contentType: 'application/json', body: '{"id":"x"}' });
    });
    await page.getByTestId('hd-bulk-assign').click();
    const dlg = page.getByTestId('hd-assign-dlg');
    await dlg.locator('#hd-as-sel').selectOption({ label: E2E_USERS.emp.displayName });
    await dlg.getByRole('button', { name: 'Gán và tạo 2 công việc' }).click();
    await expect.poll(() => bodies.length).toBe(2);
    const empId = uid(E2E_USERS.emp.username);
    for (const b of bodies) expect(JSON.parse(b.body ?? '{}')).toEqual({ assigneeId: empId });
    await expect(page.getByTestId('hd-bulk')).toHaveCount(0);
    await page.unroute('**/api/integrations/helpdesk/unassigned/*');

    // Xoá hàng loạt (thật)
    await row(page, 'D').locator('input[type=checkbox]').check();
    await row(page, 'E').locator('input[type=checkbox]').check();
    await page.getByTestId('hd-bulk-del').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá 2 ticket' }).click();
    await expect.poll(() => pendingStatus('D')).toBe('');
    expect(pendingStatus('E')).toBe('');
    await expect(rowsOf(page)).toHaveCount(2);
  });

  test('(d) Nhập dữ liệu / Lấy dữ liệu ngay / Lịch tự động — route giả, body như V1', async ({ page }) => {
    await as(page, 'boss');
    const syncCalls: { body: string | null; ct: string | undefined }[] = [];
    let failApi = true;
    await page.route('**/api/integrations/helpdesk/sync', async (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      const body = r.request().postData();
      syncCalls.push({ body, ct: r.request().headers()['content-type'] });
      if (!body && failApi) return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SYNC_FAILED', message: 'Không kết nối được Helpdesk API: ETIMEDOUT' } }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ synced: 1, pending: 2, skipped: 3, fetchedCount: 6, errors: [{ code: 'X', message: 'Thiếu loại công việc', hdId: '260733' }] }) });
    });
    await openList(page);

    // Nguồn API lỗi → thông báo + chi tiết, không body
    await page.getByTestId('hd-import-btn').click();
    const dlg = page.getByTestId('hd-imp-dlg');
    await dlg.getByRole('button', { name: 'Lấy và nhập ngay' }).click();
    await expect(dlg).toContainText('Helpdesk API không phản hồi');
    await expect(dlg.getByTestId('hd-imp-err')).toContainText('ETIMEDOUT');
    expect(syncCalls[0].body).toBeNull();

    // Đổi sang dán JSON: rỗng / JSON lỗi → không gửi
    await dlg.getByRole('button', { name: 'Dán JSON thay thế' }).click();
    await dlg.getByRole('button', { name: 'Nhập dữ liệu' }).click();
    await expect(dlg).toContainText('Dán dữ liệu JSON vào ô trên');
    await dlg.locator('#hd-imp-json').fill('[{ "Code": "1"');
    await dlg.getByRole('button', { name: 'Nhập dữ liệu' }).click();
    await expect(dlg).toContainText('JSON không hợp lệ');
    expect(syncCalls).toHaveLength(1);
    const data = { success: true, data: [{ Code: `${RUN}-X`, 'Tiêu đề': '[E2E] nhập', 'Trạng thái': 'Hoàn thành' }] };
    await dlg.locator('#hd-imp-json').fill(JSON.stringify(data, null, 2));
    await dlg.getByRole('button', { name: 'Nhập dữ liệu' }).click();
    await expect(dlg.getByTestId('hd-imp-sum')).toContainText('Công việc mới');
    await expect(dlg).toContainText('260733 — Thiếu loại công việc');
    expect(JSON.parse(syncCalls[1].body ?? '')).toEqual({ manualData: data });
    expect(syncCalls[1].ct).toContain('application/json');
    await dlg.getByRole('button', { name: 'Đóng', exact: true }).click();

    // Lấy dữ liệu ngay: lỗi → thanh báo lỗi + Thử lại; thành công → toast
    await page.getByTestId('hd-sync-btn').click();
    await expect(page.getByTestId('hd-sync')).toContainText('Đồng bộ không thành công');
    failApi = false;
    await page.getByTestId('hd-sync-btn').click();
    await expect(page.getByText('Lấy xong: 1 công việc mới · 2 chờ gán · 3 bỏ qua · 1 lỗi')).toBeVisible();
    expect(syncCalls.at(-1)?.body).toBeNull();

    // Lịch tự động: body 6 trường (giả server, không đổi cấu hình thật)
    let cronBody: unknown = null;
    await page.route('**/api/integrations/helpdesk/cron-config', async (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      cronBody = JSON.parse(r.request().postData() ?? '{}');
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...(cronBody as object), lastRunAt: null, lastResult: null }) });
    });
    await page.getByTestId('hd-cron-btn').click();
    const cd = page.getByTestId('hd-cron-dlg');
    await cd.getByTestId('hd-cron-e1').check();
    await cd.locator('#hd-cron-t1').fill('06:30');
    await cd.getByTestId('hd-cron-e2').check();
    await cd.locator('#hd-cron-t2').fill('13:15');
    await cd.getByRole('button', { name: 'Lưu lịch' }).click();
    await expect.poll(() => cronBody).toEqual({ enabled: true, hour: 6, minute: 30, enabled2: true, hour2: 13, minute2: 15 });
    await expect(page.getByText('Đã lưu lịch tự động: 06:30, 13:15')).toBeVisible();

    // Boss không có mục Đặt lại dữ liệu
    await page.locator('[data-testid=hd-more] button').click();
    await expect(page.getByRole('menuitem', { name: 'Đẩy tất cả sang công việc' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Đặt lại dữ liệu/ })).toHaveCount(0);
  });

  test('(e) Admin: Đặt lại dữ liệu (OTP) — route giả', async ({ page }) => {
    await as(page, 'admin');
    let otpReq = 0; let delUrl = '';
    await page.route('**/api/integrations/helpdesk/reset/request-otp', (r) => { otpReq++; return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    await page.route((u) => u.pathname.endsWith('/api/integrations/helpdesk/reset'), (r) => { delUrl = r.request().method() + ' ' + r.request().url(); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"tasks":4,"pending":9}' }); });
    await openList(page);
    await page.locator('[data-testid=hd-more] button').click();
    await page.getByRole('menuitem', { name: /Đặt lại dữ liệu/ }).click();
    const d = page.getByTestId('hd-reset-dlg');
    await d.getByRole('button', { name: 'Gửi mã xác nhận' }).click();
    await expect.poll(() => otpReq).toBe(1);
    await d.getByTestId('hd-otp').fill('12a34');
    await expect(d.getByTestId('hd-otp')).toHaveValue('1234');
    await d.getByRole('button', { name: 'Xoá dữ liệu' }).click();
    await expect(d).toContainText('Mã gồm 6 chữ số');
    await d.getByTestId('hd-otp').fill('123456');
    await d.getByRole('button', { name: 'Xoá dữ liệu' }).click();
    await expect.poll(() => delUrl).toMatch(/^DELETE .*\/reset\?otp=123456$/);
    await expect(page.getByText('Đã xoá 4 công việc và 9 ticket')).toBeVisible();
  });

  test('(f) nhân viên chỉ xem; 390px; tiếng Anh', async ({ page }) => {
    await as(page, 'emp');
    await openList(page);
    await expect(rowsOf(page)).toHaveCount(2, { timeout: 30_000 });
    await expect(page.getByTestId('hd-sync')).toHaveCount(0);
    await expect(page.getByTestId('hd-import-btn')).toHaveCount(0);
    await expect(page.getByTestId('hd-table').locator('input[type=checkbox]')).toHaveCount(0);
    await expect(page.getByTestId('hd-export')).toBeVisible();
    await row(page, 'C').click();
    await expect(page.getByTestId('hd-drawer')).toContainText(`[E2E] Đã tạo việc ${RUN}`);
    await expect(page.getByTestId('hd-dr-del')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 390, height: 844 });
    await as(page, 'boss');
    await openList(page);
    await expect(rowsOf(page)).toHaveCount(2, { timeout: 30_000 });
    expect(await noHScroll(page)).toBe(true);

    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: page.url() }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openList(page);
    await expect(page.getByTestId('hd-sync-btn')).toHaveText('Sync now');
    await expect(page.getByTestId('hd-total')).toHaveText('2 tickets from Helpdesk in total');
    await expect(page.getByRole('columnheader', { name: 'Requester' })).toBeVisible();
  });
});
