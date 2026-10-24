/**
 * E2E — A3-7: khu Cài đặt V2 (/settings/* trừ Hồ sơ).
 *  (a) Admin: nav con đủ 9 mục; Mức ưu tiên thêm (lỗi kiểm tra dưới ô) → sửa → xoá, body POST/PATCH đúng V1.
 *  (b) Loại công việc: thêm (chọn icon) → sửa xoá mô tả (gửi "") → xoá.
 *  (c) Mẫu hoàn thành: thêm KHÔNG có danh mục (sửa lỗi V1: 400) → ẩn qua menu ⋯ (PUT isActive) → xoá.
 *  (d) Thông báo / Báo cáo định kỳ / Nhắc quá hạn: thanh lưu gom thay đổi, body PATCH đúng V1 — lệnh ghi GIẢ bằng page.route.
 *  (e) SMTP: mật khẩu không hiện, lỗi dưới ô, PUT + gửi thử + sửa mẫu email đều GIẢ; dòng `mailpit-dev` không đổi.
 *  (f) Bảo mật + Chung: giới hạn số theo route V1, Đặt lại hỏi xác nhận — GIẢ, không ghi cấu hình thật.
 *  (g) 390px không cuộn ngang, chọn mục bằng ô chọn; hỏi trước khi rời mục có thay đổi.
 *  (h) Boss: không có mục Hệ thống; (i) Nhân viên được cấp 2 mục: Thông báo chỉ xem, Báo cáo định kỳ → không có quyền.
 * Bản ghi thật chỉ có tiền tố [E2E] (dọn trong test + cleanupE2E). 3 lần đăng nhập (admin, boss, emp).
 */
import { test, expect, type Page, type Cookie, type Route } from '@playwright/test';
import { E2E_USERS, E2E_PASSWORD, psql } from './helpers/db';
import { api } from './helpers/auth';

const RUN = Date.now().toString(36);
const PRI = `[E2E] Mức ${RUN}`;
const TT = `[E2E] Loại ${RUN}`;
const TPL = `[E2E] Mẫu ${RUN}`;
type Who = 'admin' | 'boss' | 'emp';
const sessions: Record<Who, Cookie[]> = { admin: [], boss: [], emp: [] };
const uid = (u: string) => psql(`SELECT id FROM "User" WHERE username='${u}';`);
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const smtpRow = () => psql(`SELECT host||'|'||port||'|'||"user"||'|'||"fromName"||'|'||"fromEmail"||'|'||"isActive"||'|'||md5(password) FROM "SmtpConfig" WHERE id='mailpit-dev';`);
const sysCfg = () => psql(`SELECT key||'='||md5(value::text) FROM "SystemConfig" WHERE key IN ('security_config','general_config') ORDER BY key;`);
const cfgRows = () => psql(`SELECT md5(string_agg(x, ',')) FROM (
  SELECT row_to_json(d)::text x FROM "DigestConfig" d UNION ALL SELECT row_to_json(o)::text FROM "OverdueReminderConfig" o
  UNION ALL SELECT row_to_json(n)::text FROM (SELECT "userId","emailEnabled","emailTypes" FROM "UserNotificationPrefs" ORDER BY "userId") n
  UNION ALL SELECT row_to_json(e)::text FROM (SELECT key,subject,body FROM "EmailTemplate" ORDER BY key) e) q;`);

async function signIn(page: Page, username: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();
    // chờ trang đích tải xong: /api/auth/session của trang mới có thể đặt lại cookie SAU clearCookies của lượt đăng nhập kế tiếp
    try { await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 }); await page.waitForLoadState('networkidle').catch(() => {}); return; } catch (e) {
      if (attempt) throw e;
      await page.waitForTimeout(61_000);
    }
  }
}
async function as(page: Page, who: Who) {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}

/** Chặn MỌI lệnh ghi tới các API cấu hình (không bao giờ đi tới server) — ghi lại body để kiểm tra */
type Hit = { method: string; path: string; body: unknown };
async function fakeConfigWrites(page: Page, hits: Hit[]) {
  const CONFIG = /\/api\/settings\/(notification-prefs|digest-config|overdue-reminder-config|smtp|email-templates|security|general)(\/|$|\?)/;
  await page.route(CONFIG, async (route: Route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.continue();
    const path = new URL(req.url()).pathname;
    const body = req.postDataJSON?.() ?? null;
    hits.push({ method: req.method(), path, body });
    // phản hồi giả giống V1
    if (path.endsWith('/send-test')) return route.fulfill({ json: { message: 'ok' } });
    if (path.endsWith('/smtp/test')) return route.fulfill({ json: { success: true, message: 'Email test đã được gửi thành công' } });
    if (path.endsWith('/smtp')) return route.fulfill({ json: { ...(body as object), id: 'mailpit-dev', password: '••••••••', updatedAt: new Date().toISOString() } });
    if (path.endsWith('/security') && req.method() === 'POST') return route.fulfill({ json: {
      rateLimit: { enabled: true, maxRequests: 100, windowSeconds: 60, loginMaxAttempts: 5, lockoutMinutes: 15 },
      passwordPolicy: { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecialChar: false, expiryDays: 0, historyCount: 0 },
      session: { idleTimeoutMinutes: 30, maxSessionHours: 24, allowMultipleSessions: true } } });
    if (path.endsWith('/digest-config') || path.endsWith('/overdue-reminder-config')) return route.fulfill({ json: { ...(body as object), id: 'singleton', updatedAt: new Date().toISOString(), updatedBy: null } });
    return route.fulfill({ json: body ?? {} });
  });
}

test.describe.serial('A3-7 — Cài đặt V2', () => {
  test.describe.configure({ timeout: 240_000 });
  let before = { smtp: '', sys: '', cfg: '' };

  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(400_000);
    before = { smtp: smtpRow(), sys: sysCfg(), cfg: cfgRows() };
    const emp = uid(E2E_USERS.emp.username);
    psql(`DELETE FROM "SidebarPermission" WHERE "userId"='${emp}';
      INSERT INTO "SidebarPermission"(id,"userId","visibleMenus","featurePermissions","createdAt","updatedAt")
      VALUES ('ce2esetperm${emp.slice(-14)}','${emp}','["settings"]','{"settings":["completion_templates","notifications"]}', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');`);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    for (const who of ['admin', 'boss', 'emp'] as const) {
      await signIn(page, E2E_USERS[who].username);
      sessions[who] = await page.context().cookies();
    }
    await page.close();
  });

  test.afterAll(async () => {
    psql(`DELETE FROM "Priority" WHERE name LIKE '[E2E]%' AND NOT EXISTS (SELECT 1 FROM "Task" t WHERE t."priorityId"="Priority".id);
      DELETE FROM "TaskType" WHERE name LIKE '[E2E]%' AND NOT EXISTS (SELECT 1 FROM "Task" t WHERE t."typeId"="TaskType".id);
      DELETE FROM "ReportTemplate" WHERE title LIKE '[E2E]%';`);
    // cấu hình thật KHÔNG đổi (mọi lệnh ghi cấu hình đều giả)
    expect(smtpRow()).toBe(before.smtp);
    expect(sysCfg()).toBe(before.sys);
    expect(cfgRows()).toBe(before.cfg);
  });

  test('(a) Admin: nav con + Mức ưu tiên thêm/sửa/xoá đúng body V1', async ({ page }) => {
    await as(page, 'admin');
    await page.goto('/settings/priorities');
    const nav = page.getByTestId('set-nav');
    await expect(nav.getByRole('link')).toHaveText(['Mức ưu tiên', 'Loại công việc', 'Mẫu hoàn thành', 'Thông báo', 'Báo cáo định kỳ', 'Nhắc quá hạn', 'Email (SMTP)', 'Mẫu email', 'Bảo mật']);
    await expect(nav.getByRole('link', { name: 'Mức ưu tiên' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible();

    await page.getByTestId('pri-add').click();
    const dlg = page.getByTestId('pri-dialog');
    await dlg.getByRole('button', { name: 'Thêm mức' }).click();
    await expect(dlg.getByText('Không được để trống.')).toBeVisible();
    await expect(dlg.locator('#pri-name')).toBeFocused();
    await dlg.locator('#pri-name').fill(PRI);
    await dlg.locator('#pri-color').fill('red');
    await dlg.locator('#pri-level').fill('11');
    await dlg.getByRole('button', { name: 'Thêm mức' }).click();
    await expect(dlg.getByText('Mã màu dạng #RRGGBB.')).toBeVisible();
    await expect(dlg.getByText('Nhập số từ 1 đến 10.')).toBeVisible();
    await dlg.locator('#pri-color').fill('#0E8FB0');
    await dlg.locator('#pri-level').fill('3');
    const post = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/settings/priorities'));
    await dlg.getByRole('button', { name: 'Thêm mức' }).click();
    expect((await post).postDataJSON()).toEqual({ name: PRI, color: '#0E8FB0', level: 3, isDefault: false });
    const row = page.getByTestId('pri-table').getByRole('row').filter({ hasText: PRI });
    await expect(row).toBeVisible();

    await page.getByRole('button', { name: `Sửa “${PRI}”` }).click();
    await expect(dlg.locator('#pri-name')).toHaveValue(PRI);
    await dlg.locator('#pri-level').fill('2');
    const patch = page.waitForRequest((r) => r.method() === 'PATCH' && r.url().includes('/api/settings/priorities/'));
    await dlg.getByRole('button', { name: 'Lưu', exact: true }).click();
    expect((await patch).postDataJSON()).toEqual({ name: PRI, color: '#0E8FB0', level: 2, isDefault: false });
    await expect(row).toContainText('2');

    await page.getByRole('button', { name: `Xoá “${PRI}”` }).click();
    const conf = page.getByRole('alertdialog');
    await expect(conf).toContainText(`Xoá “${PRI}”?`);
    await conf.getByRole('button', { name: 'Xoá', exact: true }).click();
    await expect(row).toHaveCount(0);
  });

  test('(b) Loại công việc: thêm có icon → xoá mô tả khi sửa → xoá', async ({ page }) => {
    await as(page, 'admin');
    await page.goto('/settings/task-types');
    await page.getByTestId('tt-add').click();
    const dlg = page.getByTestId('tt-dialog');
    await dlg.locator('#tt-name').fill(TT);
    await dlg.getByRole('radio', { name: 'Máy in' }).check();
    await dlg.locator('#tt-description').fill('mô tả tạm');
    const post = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/settings/task-types'));
    await dlg.getByRole('button', { name: 'Thêm loại' }).click();
    expect((await post).postDataJSON()).toEqual({ name: TT, icon: 'Printer', color: '#6B7280', description: 'mô tả tạm' });
    const row = page.getByTestId('tt-table').getByRole('row').filter({ hasText: TT });
    await expect(row).toContainText('mô tả tạm');

    await page.getByRole('button', { name: `Sửa “${TT}”` }).click();
    await dlg.locator('#tt-description').fill('');
    const patch = page.waitForRequest((r) => r.method() === 'PATCH' && r.url().includes('/api/settings/task-types/'));
    await dlg.getByRole('button', { name: 'Lưu', exact: true }).click();
    expect((await patch).postDataJSON()).toEqual({ name: TT, icon: 'Printer', color: '#6B7280', description: '' });
    await expect(row).not.toContainText('mô tả tạm');

    await page.getByRole('button', { name: `Xoá “${TT}”` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá', exact: true }).click();
    await expect(row).toHaveCount(0);
  });

  test('(c) Mẫu hoàn thành: thêm không danh mục → ẩn → xoá', async ({ page }) => {
    await as(page, 'admin');
    await page.goto('/settings/completion-templates');
    await page.getByTestId('tpl-add').click();
    const dlg = page.getByTestId('tpl-dialog');
    await dlg.locator('#tpl-title').fill(TPL);
    await dlg.getByRole('button', { name: 'Thêm mẫu' }).click();
    await expect(dlg.getByText('Không được để trống.')).toBeVisible();
    await dlg.locator('#tpl-content').fill('Đã làm:\nKết quả:');
    const post = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/settings/completion-templates'));
    await dlg.getByRole('button', { name: 'Thêm mẫu' }).click();
    const res = await post;
    expect(res.status()).toBe(201); // V1 gửi category:null → 400
    expect(res.request().postDataJSON()).toEqual({ title: TPL, content: 'Đã làm:\nKết quả:', taskTypeId: null, isActive: true });
    const row = page.getByTestId('tpl-table').getByRole('row').filter({ hasText: TPL });
    await expect(row).toContainText('Đang dùng');

    await row.getByRole('button', { name: `Thao tác khác cho “${TPL}”` }).click();
    const put = page.waitForRequest((r) => r.method() === 'PUT' && r.url().includes('/api/settings/completion-templates/'));
    await page.getByRole('menuitem', { name: 'Tạm ẩn mẫu' }).click();
    expect((await put).postDataJSON()).toEqual({ isActive: false });
    await expect(row).toContainText('Tạm ẩn');

    await row.getByRole('button', { name: `Thao tác khác cho “${TPL}”` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá', exact: true }).click();
    await expect(row).toHaveCount(0);
  });

  test('(d) Thông báo / Báo cáo định kỳ / Nhắc quá hạn — thanh lưu, body V1 (ghi giả)', async ({ page }) => {
    await as(page, 'admin');
    const hits: Hit[] = [];
    await fakeConfigWrites(page, hits);

    // Thông báo
    await page.goto('/settings/notifications');
    await expect(page.getByRole('switch', { name: 'Gửi thông báo qua email' })).toBeVisible();
    const bar = page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' });
    await expect(bar).toHaveCount(0);
    const item = page.getByTestId('nt-list').getByRole('checkbox', { name: /Bình luận mới/ });
    const was = await item.isChecked();
    await item.click();
    await expect(bar).toBeVisible();
    await bar.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(bar).toHaveCount(0);
    const nt = hits.find((h) => h.path.endsWith('/notification-prefs'))!;
    expect(nt.method).toBe('PATCH');
    expect(Object.keys(nt.body as object)).toEqual(['emailEnabled', 'emailTypes']);
    expect(((nt.body as { emailTypes: string[] }).emailTypes).includes('COMMENT_ADDED')).toBe(!was);
    // lọc theo người nhận (Boss/Admin)
    await page.getByRole('group', { name: 'Lọc theo người nhận' }).getByRole('button', { name: 'Quản lý' }).click();
    await expect(page.getByTestId('nt-list').getByRole('checkbox', { name: /Được giao việc/ })).toHaveCount(0);

    // Báo cáo định kỳ
    await page.goto('/settings/digest');
    const master = page.getByRole('switch', { name: 'Bật báo cáo định kỳ' });
    if (!(await master.isChecked())) await master.click();
    await page.getByLabel('Chủ nhật').click();
    await page.getByTestId('dg-time-h').selectOption('7');
    await expect(page.getByTestId('set-sched-sum')).toContainText('07:');
    await page.locator('#dg-emailSubject').fill('');
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByText('Không được để trống.')).toBeVisible();
    expect(hits.some((h) => h.path.endsWith('/digest-config'))).toBe(false);
    await page.locator('#dg-emailSubject').fill('[E2E] Báo cáo {date}');
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect.poll(() => hits.filter((h) => h.path.endsWith('/digest-config')).length).toBe(1);
    const dg = hits.find((h) => h.path.endsWith('/digest-config'))!;
    expect(dg.method).toBe('PATCH');
    expect(Object.keys(dg.body as object)).toEqual(['enabled', 'sendWeekly', 'sendMonthly', 'sendDays', 'sendHour', 'sendMinute', 'recipientIds', 'contentTypes', 'emailSubject', 'emailGreeting']);
    expect(dg.body).toMatchObject({ enabled: true, sendHour: 7, emailSubject: '[E2E] Báo cáo {date}' });
    // gửi thử: kiểm tra email trước khi gửi, lệnh gửi giả
    await page.locator('#dg-test-to').fill('abc');
    await page.getByTestId('dg-test-btn').click();
    await expect(page.getByText('Email chưa đúng định dạng.')).toBeVisible();
    await page.locator('#dg-test-to').fill('e2e@example.invalid');
    await page.getByTestId('dg-test-btn').click();
    await expect.poll(() => hits.some((h) => h.path.endsWith('/send-test'))).toBe(true);
    expect(hits.find((h) => h.path.endsWith('/send-test'))!.body).toEqual({ email: 'e2e@example.invalid' });

    // Nhắc quá hạn: luôn giữ ít nhất 1 mục
    await page.goto('/settings/overdue-reminder');
    const om = page.getByRole('switch', { name: 'Bật nhắc quá hạn' });
    if (!(await om.isChecked())) await om.click();
    const ind = page.getByTestId('ov-ind-list');
    for (const n of ['Quá hạn chưa xong', 'Chưa nhận việc và đã quá hạn', 'Sắp đến hạn trong 24 giờ']) {
      const c = ind.getByRole('checkbox', { name: new RegExp(n) });
      if ((await c.isChecked()) && !(await c.isDisabled())) await c.click();
    }
    const left = ind.locator('input[type=checkbox]:checked');
    await expect(left).toHaveCount(1);
    await expect(left.first()).toBeDisabled();
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect.poll(() => hits.some((h) => h.path.endsWith('/overdue-reminder-config'))).toBe(true);
    const ov = hits.find((h) => h.path.endsWith('/overdue-reminder-config'))!;
    expect(Object.keys(ov.body as object)).toEqual(['enabled', 'sendDays', 'sendHour', 'sendMinute', 'digestCategories', 'individualEmailTypes']);
    expect((ov.body as { individualEmailTypes: string[] }).individualEmailTypes).toHaveLength(1);
  });

  test('(e) SMTP + Mẫu email — mật khẩu không lộ, lỗi dưới ô, mọi lệnh ghi đều giả', async ({ page }) => {
    await as(page, 'admin');
    const hits: Hit[] = [];
    await fakeConfigWrites(page, hits);
    await page.goto('/settings/smtp');
    const pw = page.locator('#sm-password');
    await expect(pw).toHaveAttribute('type', 'password');
    await expect(pw).toHaveValue('');
    await expect(page.getByText('Đang hoạt động')).toBeVisible();

    await page.locator('#sm-host').fill(' ');
    await page.locator('#sm-fromEmail').fill('khong-hop-le');
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('#sm-host-err')).toHaveText('Không được để trống.');
    await expect(page.locator('#sm-fromEmail-err')).toHaveText('Email chưa đúng định dạng.');
    await expect(page.locator('#sm-host')).toBeFocused();
    expect(hits).toHaveLength(0);
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Hoàn tác' }).click();
    const host = await page.locator('#sm-host').inputValue();
    await page.locator('#sm-fromName').fill('TechOps [E2E]');
    // máy dev: fromEmail 'techops-dev@localhost' không qua zod .email() của route V1 → phải sửa mới lưu được (như V1 trả 400)
    await page.locator('#sm-fromEmail').fill('e2e@example.com');
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect.poll(() => hits.length).toBe(1);
    expect(hits[0]).toMatchObject({ method: 'PUT', path: '/api/settings/smtp' });
    expect(hits[0].body).toMatchObject({ host, fromName: 'TechOps [E2E]', fromEmail: 'e2e@example.com', password: '' });
    expect(Object.keys(hits[0].body as object)).toEqual(['host', 'port', 'secure', 'user', 'password', 'fromName', 'fromEmail', 'isActive']);

    // gửi thử (giả)
    const sel = page.locator('#sm-test-to');
    await sel.selectOption({ index: 1 });
    await page.getByTestId('sm-test-btn').click();
    await expect(page.getByTestId('sm-test-res')).toContainText('Kết nối thành công');
    expect(hits.some((h) => h.path === '/api/settings/smtp/test')).toBe(true);

    // tab Mẫu email (nav con mở thẳng ?tab=templates)
    await page.getByTestId('set-nav').getByRole('link', { name: 'Mẫu email' }).click();
    await expect(page).toHaveURL(/tab=templates/);
    await page.getByTestId('em-table').locator('[role="row"][tabindex="0"]').first().click();
    const dlg = page.getByTestId('em-dialog');
    await expect(dlg).toBeVisible();
    await page.locator('#em-subject').fill('');
    await dlg.getByRole('button', { name: 'Lưu mẫu' }).click();
    await expect(dlg.getByText('Không được để trống.')).toBeVisible();
    await page.locator('#em-subject').fill('[E2E] tiêu đề ');
    await dlg.getByRole('button', { name: '{{taskTitle}}' }).click();
    await expect(page.locator('#em-subject')).toHaveValue('[E2E] tiêu đề {{taskTitle}}');
    await dlg.getByRole('button', { name: 'Xem trước' }).click();
    await expect(dlg.locator('iframe[sandbox=""]')).toBeVisible();
    await dlg.getByRole('button', { name: 'Lưu mẫu' }).click();
    await expect.poll(() => hits.some((h) => h.path === '/api/settings/email-templates')).toBe(true);
    const em = hits.find((h) => h.path === '/api/settings/email-templates')!;
    expect(Object.keys(em.body as object)).toEqual(['key', 'subject', 'body', 'isActive']);
    expect(em.body).toMatchObject({ subject: '[E2E] tiêu đề {{taskTitle}}' });
  });

  test('(f) Bảo mật + Chung — giới hạn theo route V1, đặt lại hỏi trước (ghi giả)', async ({ page }) => {
    await as(page, 'admin');
    const hits: Hit[] = [];
    await fakeConfigWrites(page, hits);
    await page.goto('/settings/security');
    const login = page.locator('#sec-rateLimit-loginMaxAttempts');
    await expect(login).toBeVisible();
    await login.fill('0');
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('#sec-rateLimit-loginMaxAttempts-err')).toHaveText('Nhập số từ 1 đến 100.');
    expect(hits).toHaveLength(0);
    await login.fill('2'); // V1 ô cũ min 3, nhưng route nhận 1–100
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect.poll(() => hits.length).toBe(1);
    expect(hits[0]).toMatchObject({ method: 'PUT', path: '/api/settings/security' });
    expect(hits[0].body).toMatchObject({ rateLimit: { loginMaxAttempts: 2 } });
    expect(Object.keys((hits[0].body as { rateLimit: object }).rateLimit)).toContain('windowSeconds');

    await page.getByTestId('sec-reset').click();
    const conf = page.getByRole('alertdialog');
    await conf.getByRole('button', { name: 'Đóng' }).click();
    expect(hits).toHaveLength(1);
    await page.getByTestId('sec-reset').click();
    await conf.getByRole('button', { name: 'Đặt lại mặc định' }).click();
    await expect.poll(() => hits.length).toBe(2);
    expect(hits[1]).toEqual({ method: 'POST', path: '/api/settings/security', body: { action: 'reset' } });

    await page.goto('/settings/general');
    await page.locator('#gen-timezone').selectOption('UTC');
    await page.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' }).getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect.poll(() => hits.length).toBe(3);
    expect(hits[2]).toEqual({ method: 'PUT', path: '/api/settings/general', body: { timezone: 'UTC' } });
  });

  test('(g) 390px: không cuộn ngang, chọn mục bằng ô chọn, hỏi khi rời mục có thay đổi', async ({ page }) => {
    await as(page, 'admin');
    const hits: Hit[] = [];
    await fakeConfigWrites(page, hits);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of ['/settings/priorities', '/settings/digest', '/settings/smtp', '/settings/security']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      expect(await noHScroll(page), url).toBe(true);
    }
    await expect(page.getByTestId('set-nav')).toBeHidden();
    await page.locator('#set-nav-sel').selectOption('overdue');
    await expect(page).toHaveURL(/\/settings\/overdue-reminder/);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/settings/notifications');
    await page.getByTestId('nt-list').locator('input[type=checkbox]').nth(1).click();
    await page.getByTestId('set-nav').getByRole('link', { name: 'Mức ưu tiên' }).click();
    const conf = page.getByRole('alertdialog');
    await expect(conf).toContainText('Bỏ thay đổi chưa lưu?');
    await conf.getByRole('button', { name: 'Đóng' }).click();
    await expect(page).toHaveURL(/\/settings\/notifications/);
    await page.getByTestId('set-nav').getByRole('link', { name: 'Mức ưu tiên' }).click();
    await conf.getByRole('button', { name: 'Bỏ thay đổi' }).click();
    await expect(page).toHaveURL(/\/settings\/priorities/);
    expect(hits).toHaveLength(0);
  });

  test('(h) Boss: không có mục Hệ thống, không có công tắc tổng email', async ({ page }) => {
    await as(page, 'boss');
    await page.goto('/settings/notifications');
    await expect(page.getByTestId('set-nav').getByRole('link')).toHaveText(['Mức ưu tiên', 'Loại công việc', 'Mẫu hoàn thành', 'Thông báo', 'Báo cáo định kỳ', 'Nhắc quá hạn']);
    await expect(page.getByTestId('nt-form')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Gửi thông báo qua email' })).toHaveCount(0);
    await expect(page.getByTestId('nt-list').locator('input[type=checkbox]:not([disabled])').first()).toBeVisible();
  });

  test('(i) Nhân viên được cấp 2 mục: Thông báo chỉ xem; Báo cáo định kỳ không có quyền; tiếng Anh', async ({ page }) => {
    await as(page, 'emp');
    await page.goto('/settings/notifications');
    await expect(page.getByTestId('set-nav').getByRole('link')).toHaveText([/^Mẫu hoàn thành$/, /^Thông báo\s*Chỉ xem$/]);
    await expect(page.locator('#set-panel-title')).toContainText('Chỉ xem');
    const boxes = page.getByTestId('nt-list').locator('input[type=checkbox]');
    await expect(boxes.first()).toBeVisible();
    for (let i = 0; i < (await boxes.count()); i++) await expect(boxes.nth(i)).toBeDisabled();
    await expect(page.getByRole('switch')).toHaveCount(0);

    await page.goto('/settings/digest'); // V1: trang mở (chỉ cần menu Cài đặt) nhưng API 403
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();

    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: page.url() }]);
    await page.goto('/settings/completion-templates');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByTestId('tpl-add')).toHaveText('Add template');
    const r = await api(page, '/api/settings/notification-prefs', 'PATCH', { emailEnabled: true });
    expect(r.status).toBe(403); // V1: nhân viên không sửa được
  });
});
