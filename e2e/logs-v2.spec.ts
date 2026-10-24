/**
 * E2E — A3-6: trang Nhật ký V2 (/logs/task-activity · /logs/user-activity · /logs/task-reference).
 *  (a) Boss: /logs → tab Công việc; ô tìm/lọc hành động gửi đúng tham số V1; nhóm ngày "Hôm nay"; REVIEW_APPROVED = "Nghiệm thu".
 *  (b) Ngăn chi tiết sự kiện: bảng Thay đổi (trường V1 dịch được), "Mở công việc", "Xem nhật ký việc này".
 *  (c) Tab Người dùng: lọc "Tên đăng nhập không tồn tại" (UNKNOWN) + nguồn IP → tham số V1; ngăn chi tiết.
 *  (d) Tab Tra cứu mã: tìm theo mã → ngăn → "Xem nhật ký việc này" sang tab Công việc (điền sẵn tiêu đề).
 *  (e) Nhân viên được cấp menu Nhật ký: 2 tab, thấy log việc của mình; 390px không cuộn ngang; tiếng Anh.
 * Dữ liệu [E2E] (task + log do user E2E tạo) dọn ở globalTeardown (cleanupE2E). Chỉ 2 lần đăng nhập (boss, emp).
 */
import { test, expect, type Page, type Cookie, type Request } from '@playwright/test';
import { E2E_USERS, E2E_PASSWORD, psql } from './helpers/db';
import { api } from './helpers/auth';

const RUN = Date.now().toString(36);
const TITLE = `[E2E] Nhật ký ${RUN}`;
type Who = 'boss' | 'emp';
const sessions: Record<Who, Cookie[]> = { boss: [], emp: [] };
let taskId = '';
let taskCode = '';
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
const rows = (page: Page) => page.getByTestId('lg-table').locator('[role="row"][tabindex="0"]');
const apiReq = (page: Page, path: string, pred: (u: URL) => boolean) =>
  page.waitForRequest((r: Request) => { const u = new URL(r.url()); return u.pathname === path && pred(u); }, { timeout: 30_000 });

test.describe.serial('A3-6 — Nhật ký V2', () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(300_000);
    const emp = uid(E2E_USERS.emp.username);
    const boss = uid(E2E_USERS.boss.username);
    psql(`DELETE FROM "SidebarPermission" WHERE "userId"='${emp}';
      INSERT INTO "SidebarPermission"(id,"userId","visibleMenus","featurePermissions","createdAt","updatedAt")
      VALUES ('ce2elgperm${emp.slice(-15)}','${emp}','["logs"]','{"logs":["task_activity","user_activity"]}', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');`);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    for (const who of ['boss', 'emp'] as const) {
      await signIn(page, E2E_USERS[who].username);
      sessions[who] = await page.context().cookies();
    }
    // việc [E2E] do Boss tạo, giao Nhân viên → log TASK_CREATED thật
    await as(page, 'boss');
    await page.goto('/login');
    const prios = (await api<unknown>(page, '/api/settings/priorities')).json;
    const types = (await api<unknown>(page, '/api/settings/task-types')).json;
    const first = (x: unknown) => (Array.isArray(x) ? x[0] : (x as { data: { id: string }[] }).data[0]).id as string;
    const created = await api<{ id: string }>(page, '/api/tasks', 'POST', {
      title: TITLE, content: 'Nội dung', priorityId: first(prios), typeId: first(types),
      scheduleStart: new Date().toISOString().slice(0, 10), scheduleEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      workflowMode: 'IMMEDIATE', assigneeIds: [emp], isForceMode: false,
    });
    expect(created.status, JSON.stringify(created.json)).toBe(201);
    taskId = created.json.id;
    taskCode = psql(`SELECT "taskCode" FROM "Task" WHERE id='${taskId}';`);
    // 2 log mẫu (định dạng details giống V1): sửa việc + nghiệm thu
    psql(`INSERT INTO "TaskAuditLog"(id,"taskId",action,"performedById","oldStatus","newStatus",details,"createdAt") VALUES
      ('ce2elgupd${RUN}', '${taskId}', 'TASK_UPDATED', '${boss}', 'WAITING_ACKNOWLEDGE', 'WAITING_ACKNOWLEDGE',
       '{"changes":[{"field":"Hạn chót","oldValue":"20/10/2026","newValue":"22/10/2026"},{"field":"Quy trình","oldValue":"Trực tiếp","newValue":"Phê duyệt"}]}',
       (now() AT TIME ZONE 'UTC') + interval '1 second'),
      ('ce2elgrev${RUN}', '${taskId}', 'REVIEW_APPROVED', '${boss}', 'PENDING_REVIEW', 'COMPLETED', NULL,
       (now() AT TIME ZONE 'UTC') + interval '2 second');`);
    await page.close();
  });

  test('(a) tab Công việc: tìm + lọc hành động gửi tham số V1, nhóm ngày, nhãn Nghiệm thu', async ({ page }) => {
    await as(page, 'boss');
    await page.goto('/logs');
    await expect(page).toHaveURL(/\/logs\/task-activity/);
    await expect(page.getByRole('heading', { name: 'Nhật ký' })).toBeVisible();
    for (const k of ['task_activity', 'user_activity', 'task_reference']) await expect(page.getByTestId(`lg-tab-${k}`)).toBeVisible();

    const req = apiReq(page, '/api/logs/tasks', (u) => u.searchParams.get('taskTitle') === TITLE);
    await page.getByTestId('lg-q').fill(TITLE);
    expect(new URL((await req).url()).search).toBe(`?${new URLSearchParams({ taskTitle: TITLE, page: '1', limit: '20' })}`);
    await expect(rows(page)).toHaveCount(3, { timeout: 30_000 });
    await expect(page.getByTestId('lg-meta')).toContainText('3 sự kiện');
    await expect(page.getByTestId('lg-table').locator('.v2-tgroup').first()).toContainText('Hôm nay');
    await expect(page.getByTestId('lg-table')).toContainText('Nghiệm thu');
    await expect(page.getByTestId('lg-table')).not.toContainText('Chờ Review');

    const req2 = apiReq(page, '/api/logs/tasks', (u) => u.searchParams.get('action') === 'REVIEW_APPROVED');
    await page.getByTestId('lg-act').selectOption('REVIEW_APPROVED');
    expect(new URL((await req2).url()).search).toBe(`?${new URLSearchParams({ taskTitle: TITLE, action: 'REVIEW_APPROVED', page: '1', limit: '20' })}`);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Chờ nghiệm thu → Đã xong');

    await page.getByTestId('lg-clear').click();
    await expect(page.getByTestId('lg-q')).toHaveValue('');
    await expect(page.getByTestId('lg-act')).toHaveValue('');
  });

  test('(b) ngăn chi tiết: bảng Thay đổi, Mở công việc, Xem nhật ký việc này', async ({ page }) => {
    await as(page, 'boss');
    await page.goto('/logs/task-activity');
    await page.getByTestId('lg-q').fill(TITLE);
    await expect(rows(page)).toHaveCount(3, { timeout: 30_000 });
    await rows(page).filter({ hasText: 'Sửa công việc' }).click();
    const dr = page.getByTestId('lg-drawer');
    await expect(dr).toBeVisible();
    await expect(dr.getByRole('heading', { name: 'Sự kiện công việc' })).toBeVisible();
    const tbl = dr.getByTestId('lg-dr-changes');
    await expect(tbl).toContainText('Hạn chót');
    await expect(tbl).toContainText('22/10/2026');
    await expect(tbl).toContainText('Trực tiếp');
    await expect(tbl).toContainText('Phê duyệt');
    await expect(dr).toContainText('Giữ nguyên');
    await expect(dr.getByTestId('lg-dr-open')).toHaveAttribute('href', `/tasks/${taskId}`);
    await page.keyboard.press('Escape');
    await expect(dr).toBeHidden();

    await page.getByTestId('lg-clear').click();
    await expect(page.getByTestId('lg-q')).toHaveValue('');
    await rows(page).filter({ hasText: TITLE }).first().click();
    await page.getByTestId('lg-dr-tasklog').click();
    await expect(page.getByTestId('lg-q')).toHaveValue(TITLE);
    await expect(rows(page)).toHaveCount(3);
  });

  test('(c) tab Người dùng: lọc UNKNOWN + nguồn IP theo tham số V1, ngăn chi tiết', async ({ page }) => {
    await as(page, 'boss');
    await page.goto('/logs/user-activity');
    await expect(page.getByTestId('lg-meta')).toContainText('sự kiện', { timeout: 30_000 });
    const req = apiReq(page, '/api/logs/users', (u) => u.searchParams.get('userId') === 'UNKNOWN');
    await page.getByTestId('lg-who').selectOption('UNKNOWN');
    expect(new URL((await req).url()).search).toBe('?userId=UNKNOWN&page=1&limit=20');
    const req2 = apiReq(page, '/api/logs/users', (u) => u.searchParams.get('ipType') === 'external');
    await page.getByTestId('lg-ip').selectOption('external');
    expect(new URL((await req2).url()).search).toBe('?userId=UNKNOWN&ipType=external&page=1&limit=20');
    await page.getByTestId('lg-clear').click();
    // phiên đăng nhập của Boss vừa rồi có trong nhật ký
    await page.getByTestId('lg-who').selectOption({ label: E2E_USERS.boss.displayName });
    await expect(rows(page).first()).toContainText(E2E_USERS.boss.displayName, { timeout: 30_000 });
    await expect(rows(page).first()).toContainText('Đăng nhập');
    await rows(page).first().click();
    const dr = page.getByTestId('lg-drawer');
    await expect(dr.getByRole('heading', { name: 'Sự kiện người dùng' })).toBeVisible();
    await expect(dr).toContainText('Địa chỉ IP');
    await expect(dr).toContainText(E2E_USERS.boss.username);
  });

  test('(d) tab Tra cứu mã: tìm theo mã → ngăn → sang nhật ký việc', async ({ page }) => {
    await as(page, 'boss');
    await page.goto('/logs/task-reference');
    const req = apiReq(page, '/api/logs/task-reference', (u) => u.searchParams.get('search') === taskCode);
    await page.getByTestId('lg-q').fill(taskCode);
    expect(new URL((await req).url()).search).toBe(`?search=${taskCode}&page=1&limit=20`);
    await expect(rows(page)).toHaveCount(1, { timeout: 30_000 });
    await expect(rows(page).first()).toContainText('Khớp chính xác');
    await rows(page).first().click();
    const dr = page.getByTestId('lg-drawer');
    await expect(dr).toContainText(taskId);
    await dr.getByTestId('lg-dr-tasklog').click();
    await expect(page).toHaveURL(/\/logs\/task-activity\?taskTitle=/);
    await expect(page.getByTestId('lg-q')).toHaveValue(TITLE);
    await expect(rows(page)).toHaveCount(3, { timeout: 30_000 });
  });

  test('(e) nhân viên: 2 tab, log việc của mình, 390px, tiếng Anh', async ({ page }) => {
    await as(page, 'emp');
    await page.goto('/logs');
    await expect(page).toHaveURL(/\/logs\/task-activity/);
    await expect(page.getByTestId('lg-tab-task_activity')).toBeVisible();
    await expect(page.getByTestId('lg-tab-task_reference')).toHaveCount(0);
    await page.getByTestId('lg-q').fill(TITLE);
    await expect(rows(page)).toHaveCount(3, { timeout: 30_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(rows(page).first()).toBeVisible();
    expect(await noHScroll(page)).toBe(true);
    await page.goto('/logs/user-activity');
    await expect(page.getByTestId('lg-meta')).toContainText('sự kiện', { timeout: 30_000 });
    expect(await noHScroll(page)).toBe(true);

    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: page.url() }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/logs/task-activity');
    await expect(page.getByRole('heading', { name: 'Activity log' })).toBeVisible();
    await page.getByTestId('lg-q').fill(TITLE);
    await expect(rows(page)).toHaveCount(3, { timeout: 30_000 });
    await expect(page.getByTestId('lg-table')).toContainText('Signed off');
    await expect(page.getByTestId('lg-table')).toContainText('Today');
  });
});
