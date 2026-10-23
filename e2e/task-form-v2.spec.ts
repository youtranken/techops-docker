/**
 * E2E — V2 A2-4b: Tạo / Sửa công việc trong ngăn trượt + trang đầy đủ + nháp lưu trên trình duyệt.
 * Nghiệp vụ giữ V1: cùng endpoint (POST /api/tasks, PATCH /api/tasks/:id, /api/upload), trạng thái ban đầu theo
 * resolveInitialStatus; nháp CHỈ ở localStorage (không tạo bản ghi DRAFT trong DB).
 * Dữ liệu tiền tố [E2E], dọn ở globalTeardown + afterAll (tệp tải lên).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page, type Cookie } from '@playwright/test';
import { login } from './helpers/auth';
import { E2E_USERS, psql } from './helpers/db';
import { refs, createTask } from './helpers/seed';

const RUN = `TF${Date.now().toString(36)}`;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const due = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const created: string[] = [];
let editId = '';

const sessions: Record<'boss' | 'emp', Cookie[]> = { boss: [], emp: [] };
async function as(page: Page, who: 'boss' | 'emp') {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}
const q = (sql: string) => psql(sql);
const taskBy = (title: string) => q(`SELECT id || '|' || status || '|' || "workflowMode" FROM "Task" WHERE title = '${title.replace(/'/g, "''")}'`);

async function openList(page: Page, query = '') {
  await page.goto(`/tasks?search=${encodeURIComponent(RUN)}${query}`);
  await page.waitForLoadState('networkidle');
}
async function openCreate(page: Page) {
  await page.getByTestId('tl-new').click();
  const dr = page.getByTestId('task-form-drawer');
  await expect(dr.locator('#tf-title')).toBeVisible({ timeout: 30_000 });
  // danh sách người làm đã tải
  await expect(dr.getByTestId('tf-people').getByRole('checkbox').first()).toBeVisible({ timeout: 30_000 });
  return dr;
}
async function typeDesc(page: Page, text: string) {
  await page.locator('#tf-desc').click();
  await page.keyboard.type(text);
}
const person = (scope: ReturnType<Page['getByTestId']>, name: RegExp) => scope.getByTestId('tf-people').getByRole('checkbox', { name });

test.describe.serial('V2 — biểu mẫu Tạo / Sửa công việc', () => {
  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(180_000);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    await login(page, E2E_USERS.boss.username);
    sessions.boss = await page.context().cookies();
    const r = await refs(page);
    editId = await createTask(page, { title: `[E2E] TF Việc để sửa ${RUN}`, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId], days: 4 }, r);
    await login(page, E2E_USERS.emp.username);
    sessions.emp = await page.context().cookies();
    await page.close();
  });
  test.afterAll(() => {
    for (const id of [...created, editId]) if (id) fs.rmSync(path.resolve('uploads', id), { recursive: true, force: true });
  });

  test('(1) Boss tạo việc Trực tiếp từ ngăn trượt (giao nhân viên, đính kèm) → DB + danh sách', async ({ page }) => {
    const title = `[E2E] TF Trực tiếp ${RUN}`;
    await as(page, 'boss');
    await openList(page);
    const dr = await openCreate(page);
    await dr.locator('#tf-title').fill(title);
    await typeDesc(page, 'Thay switch PoE tầng 4');
    // V1: chọn sẵn chính mình → bỏ, chọn nhân viên
    await expect(person(dr, /\[E2E\] Boss/)).toBeChecked();
    await person(dr, /\[E2E\] Boss/).uncheck();
    await person(dr, /\[E2E\] Nhân viên/).check();
    await dr.locator('#tf-due').fill(due(5));
    await expect(dr.getByTestId('tf-sum')).toContainText('Sẽ giao ngay cho [E2E] Nhân viên');
    await expect(dr.getByTestId('tf-sum')).toContainText('Chờ nhận việc');
    await dr.getByTestId('att-input').setInputFiles({ name: 'e2e-so-do.pdf', mimeType: 'application/pdf', buffer: PDF });
    await expect(dr.getByText('e2e-so-do.pdf')).toBeVisible();
    await dr.getByTestId('tf-submit').click();
    await expect(dr).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText(/Đã tạo \d{2}-\d{4}/)).toBeVisible();

    const [id, status, mode] = taskBy(title).split('|');
    created.push(id);
    expect(status).toBe('WAITING_ACKNOWLEDGE');
    expect(mode).toBe('IMMEDIATE');
    expect(q(`SELECT string_agg(u.username || ':' || a.status, ',') FROM "TaskAssignee" a JOIN "User" u ON u.id=a."userId" WHERE a."taskId"='${id}'`))
      .toBe(`${E2E_USERS.emp.username}:PENDING`);
    expect(q(`SELECT "fileName" FROM "TaskAttachment" WHERE "taskId"='${id}'`)).toBe('e2e-so-do.pdf');
    expect(q(`SELECT content FROM "Task" WHERE id='${id}'`)).toContain('Thay switch PoE tầng 4');
    // việc hiện trong danh sách
    await expect(page.locator('.v2-tasks .v2-tr', { hasText: title })).toBeVisible({ timeout: 30_000 });
  });

  test('(2) Nhân viên tạo việc Phê duyệt → Chờ duyệt (như V1)', async ({ page }) => {
    const title = `[E2E] TF Phê duyệt ${RUN}`;
    await as(page, 'emp');
    await openList(page);
    const dr = await openCreate(page);
    // nhân viên không có khối ★ / Bắt buộc
    await expect(dr.locator('#tf-star')).toHaveCount(0);
    await expect(dr.locator('#tf-force')).toHaveCount(0);
    await dr.locator('#tf-title').fill(title);
    await typeDesc(page, 'Xin mua UPS cho tủ rack');
    await dr.getByTestId('tf-mode').getByRole('radio', { name: /Phê duyệt/ }).check();
    await dr.locator('#tf-due').fill(due(9));
    await expect(dr.getByTestId('tf-sum')).toContainText('Chờ duyệt');
    await dr.getByTestId('tf-submit').click();
    await expect(dr).toBeHidden({ timeout: 30_000 });
    const [id, status, mode] = taskBy(title).split('|');
    created.push(id);
    expect(status).toBe('PENDING_APPROVAL');
    expect(mode).toBe('NEED_APPROVAL');
    expect(q(`SELECT a.status FROM "TaskAssignee" a WHERE a."taskId"='${id}'`)).toBe('PENDING');
  });

  test('(3) Lỗi kiểm tra: thiếu tiêu đề/mô tả/hạn, tiêu đề quá 150 ký tự → không tạo', async ({ page }) => {
    await as(page, 'boss');
    await openList(page);
    const dr = await openCreate(page);
    await dr.getByTestId('tf-submit').click();
    await expect(dr.getByTestId('tf-error-sum')).toContainText('Còn 3 mục cần sửa');
    await expect(dr.getByText('Nhập tiêu đề.')).toBeVisible();
    await expect(dr.getByText('Nhập mô tả công việc.')).toBeVisible();
    await expect(dr.getByText('Chọn hạn hoàn thành.')).toBeVisible();
    await expect(dr.locator('#tf-title')).toBeFocused();
    await expect(dr.locator('#tf-title')).toHaveAttribute('aria-invalid', 'true');

    const long = `[E2E] TF quá dài ${RUN} ` + 'x'.repeat(150);
    await dr.locator('#tf-title').fill(long);
    await typeDesc(page, 'Mô tả');
    await dr.locator('#tf-due').fill(due(3));
    await expect(dr.getByText(`Tiêu đề tối đa 150 ký tự (${long.length}/150).`)).toBeVisible();
    await dr.getByTestId('tf-submit').click();
    await expect(dr.getByTestId('tf-error-sum')).toContainText('Còn 1 mục');
    expect(q(`SELECT count(*) FROM "Task" WHERE title LIKE '[E2E] TF quá dài ${RUN}%'`)).toBe('0');
    // sửa cho đúng → lỗi tự biến mất
    await dr.locator('#tf-title').fill(`[E2E] TF ngắn ${RUN}`);
    await expect(dr.getByTestId('tf-error-sum')).toBeHidden();
  });

  test('(4) Gõ dở → bấm ra ngoài → Lưu nháp → tab Nháp → mở lại đúng dữ liệu → Tạo → nháp bị xoá', async ({ page }) => {
    const title = `[E2E] TF Từ nháp ${RUN}`;
    await as(page, 'boss');
    await openList(page);
    const dr = await openCreate(page);
    await dr.locator('#tf-title').fill(title);
    await typeDesc(page, 'Nội dung nháp');
    await dr.getByTestId('tf-mode').getByRole('radio', { name: /Phê duyệt/ }).check();
    // bấm ra ngoài (nền mờ bên trái ngăn)
    await page.mouse.click(60, 450);
    const ask = page.getByTestId('tf-ask');
    await expect(ask).toContainText('Lưu thành bản nháp?');
    await ask.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(dr).toBeHidden();
    await expect(page.getByText('Đã lưu nháp trên máy này.')).toBeVisible();
    // không tạo gì trong DB
    expect(q(`SELECT count(*) FROM "Task" WHERE title = '${title}'`)).toBe('0');

    await page.getByTestId('tab-drafts').click();
    await expect(page).toHaveURL(/view=drafts/);
    const list = page.getByTestId('draft-list');
    await expect(list).toContainText('Chỉ lưu trên trình duyệt này');
    const draftRow = list.locator('li', { hasText: title });
    await expect(draftRow).toBeVisible();
    await draftRow.getByRole('button').first().click();

    const dr2 = page.getByTestId('task-form-drawer');
    await expect(dr2.locator('#tf-title')).toHaveValue(title);
    await expect(dr2.locator('#tf-desc')).toContainText('Nội dung nháp');
    await expect(dr2.getByTestId('tf-mode').getByRole('radio', { name: /Phê duyệt/ })).toBeChecked();
    await expect(dr2.getByTestId('tf-draft-note')).toBeVisible();
    await dr2.locator('#tf-due').fill(due(6));
    await dr2.getByTestId('tf-submit').click();
    await expect(dr2).toBeHidden({ timeout: 30_000 });
    const [id, status] = taskBy(title).split('|');
    created.push(id);
    expect(status).toBe('WAITING_ACKNOWLEDGE'); // Boss tạo Phê duyệt → bỏ qua Chờ duyệt (V1)
    await expect(list.getByText('Chưa có bản nháp')).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('techops.taskDrafts')).map((k) => localStorage.getItem(k)))).toEqual([]);
  });

  test('(5) Esc → [Bỏ] thì không lưu nháp; ⋯ nháp → Mở trang đầy đủ', async ({ page }) => {
    await as(page, 'boss');
    await openList(page);
    let dr = await openCreate(page);
    await dr.locator('#tf-title').fill(`[E2E] TF Bỏ ${RUN}`);
    await page.keyboard.press('Escape');
    await page.getByTestId('tf-ask').getByRole('button', { name: 'Bỏ', exact: true }).click();
    await expect(dr).toBeHidden();
    await page.getByTestId('tab-drafts').click();
    await expect(page.getByTestId('draft-list').getByText('Chưa có bản nháp')).toBeVisible();

    // [Tiếp tục sửa] giữ nguyên ngăn; form trống thì đóng ngay không hỏi
    await page.getByTestId('tl-new').click();
    dr = page.getByTestId('task-form-drawer');
    await expect(dr.locator('#tf-title')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dr).toBeHidden();
    await expect(page.getByTestId('tf-ask')).toHaveCount(0);

    // nháp → trang đầy đủ ?draft=
    dr = await openCreate(page);
    await dr.locator('#tf-title').fill(`[E2E] TF Trang ${RUN}`);
    await dr.getByTestId('tf-save-draft').click();
    await expect(dr).toBeHidden();
    const row = page.getByTestId('draft-list').locator('li', { hasText: `[E2E] TF Trang ${RUN}` });
    await row.getByRole('button', { name: /Thao tác cho nháp/ }).click();
    await page.getByRole('menuitem', { name: 'Mở trang đầy đủ' }).click();
    await expect(page).toHaveURL(/\/tasks\/new\?draft=/, { timeout: 60_000 }); // next dev: lần đầu biên dịch trang ~10 s
    await expect(page.getByTestId('task-form-page').locator('#tf-title')).toHaveValue(`[E2E] TF Trang ${RUN}`);
    await page.getByRole('button', { name: 'Xóa nháp' }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa nháp' }).click();
    await expect(page).toHaveURL(/view=drafts/);
    await expect(page.getByTestId('draft-list').getByText('Chưa có bản nháp')).toBeVisible();

    // ngăn → "Mở dạng trang đầy đủ" giữ dữ liệu đang nhập; rời trang khi có thay đổi → hỏi
    await openList(page);
    dr = await openCreate(page);
    await dr.locator('#tf-title').fill(`[E2E] TF Chuyển trang ${RUN}`);
    await dr.getByTestId('tf-full').click();
    await expect(page).toHaveURL(/\/tasks\/new\?from=panel/, { timeout: 60_000 });
    const pg = page.getByTestId('task-form-page');
    await expect(pg.locator('#tf-title')).toHaveValue(`[E2E] TF Chuyển trang ${RUN}`);
    await pg.getByRole('link', { name: 'Đóng' }).click();
    const leave = page.getByRole('alertdialog');
    await expect(leave).toContainText('Rời trang mà không lưu?');
    await leave.getByRole('button', { name: 'Rời trang' }).click();
    await expect(page).toHaveURL(/\/tasks(\?|$)/);
  });

  test('(6) Sửa việc từ trang chi tiết → DB đổi đúng; đóng khi có thay đổi chỉ hỏi Bỏ/Tiếp tục', async ({ page }) => {
    await as(page, 'boss');
    await page.goto(`/tasks/${editId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Sửa', exact: true }).first().click();
    const dr = page.getByTestId('task-form-drawer');
    await expect(dr.locator('#tf-title')).toHaveValue(`[E2E] TF Việc để sửa ${RUN}`);
    await dr.locator('#tf-title').fill(`[E2E] TF Đã sửa ${RUN}`);
    await page.keyboard.press('Escape');
    const ask = page.getByTestId('tf-ask');
    await expect(ask).toContainText('Đóng mà không lưu?');
    await expect(ask.getByRole('button', { name: 'Lưu nháp' })).toHaveCount(0);
    await ask.getByRole('button', { name: 'Tiếp tục sửa' }).click();
    await expect(dr.locator('#tf-title')).toHaveValue(`[E2E] TF Đã sửa ${RUN}`);
    await dr.locator('#tf-due').fill(due(12));
    await dr.getByTestId('tf-submit').click();
    await expect(dr).toBeHidden({ timeout: 30_000 });
    expect(q(`SELECT title || '|' || to_char("scheduleEnd", 'YYYY-MM-DD') FROM "Task" WHERE id='${editId}'`)).toBe(`[E2E] TF Đã sửa ${RUN}|${due(12)}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`[E2E] TF Đã sửa ${RUN}`);
  });

  test('(7) Mobile 390: ngăn tạo + trang tạo không cuộn ngang, nút ≥44px', async ({ page }) => {
    await as(page, 'emp');
    await page.setViewportSize({ width: 390, height: 844 });
    await openList(page);
    const dr = await openCreate(page);
    const box = await dr.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(389);
    expect((await dr.getByTestId('tf-submit').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const noH = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await noH()).toBe(true);
    await page.goto('/tasks/new');
    await expect(page.getByTestId('task-form-page').locator('#tf-title')).toBeVisible({ timeout: 60_000 });
    expect(await noH()).toBe(true);
    expect(await page.evaluate(() => {
      const m = document.getElementById('content');
      return m ? m.scrollWidth <= m.clientWidth : true;
    })).toBe(true);
    expect((await page.getByTestId('tf-submit').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
