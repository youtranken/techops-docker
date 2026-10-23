/**
 * E2E — V2 A2-4a: Bảng Kanban (chuyển Danh sách ↔ Bảng, kéo thả có kiểm soát, mobile, bộ lọc dùng chung).
 * Nghiệp vụ giữ V1: thả đúng cột kế tiếp mà người xem có quyền → mở hộp thoại A2-2 (không gọi API ngay);
 * đóng hộp → thẻ về chỗ cũ, DB không đổi. Dữ liệu tiền tố [E2E] (tạo qua API V1), dọn ở globalTeardown.
 */
import { test, expect, type Page, type Cookie, type Locator } from '@playwright/test';
import { login } from './helpers/auth';
import { E2E_USERS, psql } from './helpers/db';
import { refs, createTask, call } from './helpers/seed';

const RUN = `B${Date.now().toString(36)}`;
const T = {
  approval: `[E2E] KB Chờ duyệt ${RUN}`,
  waiting: `[E2E] KB Chờ nhận ${RUN}`,
  progress: `[E2E] KB Đang làm ${RUN}`,
  review: `[E2E] KB Chờ nghiệm thu ${RUN}`,
};
let ids: Record<keyof typeof T, string>;

const sessions: Record<'boss' | 'emp', Cookie[]> = { boss: [], emp: [] };
async function as(page: Page, who: 'boss' | 'emp') {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}
const status = (id: string) => psql(`SELECT status FROM "Task" WHERE id='${id}'`);
const col = (page: Page, s: string) => page.locator(`[data-col="${s}"]`);
const card = (page: Page, s: string, title: string) => col(page, s).locator('[data-card-id]', { hasText: title });

async function openBoard(page: Page, query = '') {
  await page.goto(`/tasks?mode=board&search=${encodeURIComponent(RUN)}${query}`);
  await expect(page.locator('[data-board]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-board-skeleton]')).toHaveCount(0, { timeout: 60_000 });
}

/** Kéo bằng chuột thật (pointer events): nhấn ở thẻ → di qua ngưỡng → tới giữa cột đích → thả. */
async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + 24);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + 30, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + 120, { steps: 10 });
  await page.waitForTimeout(80);
}

test.describe.serial('V2 — bảng Kanban', () => {
  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(240_000);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    await login(page, E2E_USERS.boss.username);
    sessions.boss = await page.context().cookies();
    const r = await refs(page);
    const waiting = await createTask(page, { title: T.waiting, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId] }, r);
    const progress = await createTask(page, { title: T.progress, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
    const review = await createTask(page, { title: T.review, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
    await login(page, E2E_USERS.emp.username);
    sessions.emp = await page.context().cookies();
    const approval = await createTask(page, { title: T.approval, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
    for (const id of [progress, review]) await call(page, `/api/tasks/${id}/acknowledge`);
    await call(page, `/api/tasks/${review}/complete`, 'POST', { reportContent: '[E2E] Đã xử lý xong.', files: [] });
    ids = { approval, waiting, progress, review };
    await page.close();
  });

  test('(a) chuyển Danh sách ↔ Bảng: URL mode + nhớ lựa chọn (cookie)', async ({ page }) => {
    await as(page, 'boss');
    await page.goto(`/tasks?search=${RUN}`);
    await expect(page.locator('.v2-tasks')).toBeVisible({ timeout: 60_000 });
    const sw = page.getByRole('group', { name: 'Chế độ xem' });
    await sw.getByRole('button', { name: 'Bảng' }).click();
    await expect(page).toHaveURL(/mode=board/);
    await expect(page).toHaveURL(new RegExp(`search=${RUN}`)); // tìm kiếm giữ nguyên
    await expect(card(page, 'PENDING_APPROVAL', T.approval)).toBeVisible();
    await expect(card(page, 'WAITING_ACKNOWLEDGE', T.waiting)).toBeVisible();
    await expect(card(page, 'IN_PROGRESS', T.progress)).toBeVisible();
    await expect(card(page, 'PENDING_REVIEW', T.review)).toBeVisible();
    await expect(page.getByTestId('list-total')).toHaveText('4 công việc');
    expect((await page.context().cookies()).find((c) => c.name === 'techops_tasks_view')?.value).toBe('board');

    // mở lại /tasks không có mode → nhớ Bảng
    await page.goto(`/tasks?search=${RUN}`);
    await expect(page.locator('[data-board]')).toBeVisible();
    await expect(sw.getByRole('button', { name: 'Bảng' })).toHaveAttribute('aria-pressed', 'true');

    // bấm thẻ → ngăn chi tiết
    await card(page, 'IN_PROGRESS', T.progress).locator('[data-title]').click();
    await expect(page.getByRole('dialog').filter({ hasText: T.progress })).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press('Escape');

    await sw.getByRole('button', { name: 'Danh sách' }).click();
    await expect(page).toHaveURL(/mode=list/);
    await expect(page.locator('.v2-tasks')).toBeVisible();
    await page.goto(`/tasks?search=${RUN}`);
    await expect(page.locator('.v2-tasks')).toBeVisible();
    await expect(page.locator('[data-board]')).toHaveCount(0);
  });

  test('(b) Boss kéo Chờ duyệt → Chờ nhận việc: mở hộp Duyệt; Đóng → về chỗ cũ, DB không đổi; Duyệt → DB đổi', async ({ page }) => {
    await as(page, 'boss');
    await openBoard(page);
    const src = card(page, 'PENDING_APPROVAL', T.approval);
    await expect(src).toHaveAttribute('data-draggable', 'true');

    await drag(page, src, col(page, 'WAITING_ACKNOWLEDGE'));
    // đang kéo: cột đích tô sáng, cột khác mờ
    await expect(col(page, 'WAITING_ACKNOWLEDGE')).toHaveAttribute('data-drop', 'ok');
    await expect(col(page, 'IN_PROGRESS')).toHaveAttribute('data-drop', 'no');
    await expect(col(page, 'PENDING_APPROVAL')).toHaveAttribute('data-drop', 'no');
    await page.mouse.up();

    const dlg = page.getByRole('dialog', { name: 'Duyệt công việc này?' });
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText(T.approval);
    await expect(col(page, 'WAITING_ACKNOWLEDGE').locator('[data-pending-card]')).toContainText(T.approval);
    expect(status(ids.approval)).toBe('PENDING_APPROVAL'); // chưa gọi API

    await dlg.getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(page.locator('[data-pending-card]')).toHaveCount(0);
    await expect(card(page, 'PENDING_APPROVAL', T.approval)).toBeVisible();
    expect(status(ids.approval)).toBe('PENDING_APPROVAL');

    // lần 2: xác nhận
    await drag(page, card(page, 'PENDING_APPROVAL', T.approval), col(page, 'WAITING_ACKNOWLEDGE'));
    await page.mouse.up();
    await expect(dlg).toBeVisible();
    await dlg.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(card(page, 'WAITING_ACKNOWLEDGE', T.approval)).toBeVisible();
    await expect(card(page, 'PENDING_APPROVAL', T.approval)).toHaveCount(0);
    expect(status(ids.approval)).toBe('WAITING_ACKNOWLEDGE');
  });

  test('(c) kéo không hợp lệ: lùi / sai vai trò / Esc → không mở hộp, thẻ về chỗ cũ', async ({ page }) => {
    await as(page, 'boss');
    await openBoard(page);
    // lùi: Chờ nghiệm thu → Đang làm (Boss có quyền Nghiệm thu nhưng chỉ tiến 1 bước)
    await drag(page, card(page, 'PENDING_REVIEW', T.review), col(page, 'IN_PROGRESS'));
    await expect(col(page, 'IN_PROGRESS')).toHaveAttribute('data-drop', 'no');
    await page.mouse.up();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card(page, 'PENDING_REVIEW', T.review)).toBeVisible();
    await expect(page.locator('[data-board] [data-drop]')).toHaveCount(0);

    // Esc giữa chừng
    await drag(page, card(page, 'PENDING_REVIEW', T.review), col(page, 'COMPLETED'));
    await expect(col(page, 'COMPLETED')).toHaveAttribute('data-drop', 'ok');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card(page, 'PENDING_REVIEW', T.review)).toBeVisible();
    expect(status(ids.review)).toBe('PENDING_REVIEW');

    // sai vai trò: Boss không phải người làm → thẻ Chờ nhận việc không kéo được
    const w = card(page, 'WAITING_ACKNOWLEDGE', T.waiting);
    await expect(w).not.toHaveAttribute('data-draggable', 'true');
    await drag(page, w, col(page, 'IN_PROGRESS'));
    await expect(page.locator('[data-board] [data-drop]')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByRole('dialog').filter({ hasText: 'Nhận công việc này?' })).toHaveCount(0);
    await expect(card(page, 'WAITING_ACKNOWLEDGE', T.waiting)).toBeVisible();
    await page.keyboard.press('Escape'); // đóng ngăn chi tiết nếu cú bấm đã mở
    expect(status(ids.waiting)).toBe('WAITING_ACKNOWLEDGE');
  });

  test('(d) nhân viên kéo Chờ nhận việc → Đang làm: mở hộp Nhận việc → xác nhận', async ({ page }) => {
    await as(page, 'emp');
    await openBoard(page);
    // nhân viên không duyệt được việc mình tạo — Chờ duyệt không kéo (việc đã duyệt ở (b) giờ ở Chờ nhận việc)
    await drag(page, card(page, 'WAITING_ACKNOWLEDGE', T.waiting), col(page, 'IN_PROGRESS'));
    await expect(col(page, 'IN_PROGRESS')).toHaveAttribute('data-drop', 'ok');
    await page.mouse.up();
    const dlg = page.getByRole('dialog', { name: 'Nhận công việc này?' });
    await expect(dlg).toBeVisible();
    await dlg.getByRole('button', { name: 'Nhận việc', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(card(page, 'IN_PROGRESS', T.waiting)).toBeVisible();
    expect(status(ids.waiting)).toBe('IN_PROGRESS');
    // Nhân viên không nghiệm thu: thẻ Chờ nghiệm thu không kéo được
    await expect(card(page, 'PENDING_REVIEW', T.review)).not.toHaveAttribute('data-draggable', 'true');
  });

  test('(e) bộ lọc / tìm kiếm dùng chung với Danh sách', async ({ page }) => {
    await as(page, 'boss');
    await openBoard(page);
    await page.getByRole('button', { name: /^Lọc/ }).click();
    const panel = page.getByRole('region', { name: 'Bộ lọc' });
    await panel.getByLabel('Trạng thái').selectOption('PENDING_REVIEW');
    await expect(page).toHaveURL(/status=PENDING_REVIEW/);
    await expect(page).toHaveURL(/mode=board/);
    await expect(card(page, 'PENDING_REVIEW', T.review)).toBeVisible();
    await expect(col(page, 'IN_PROGRESS')).toContainText('Không thuộc bộ lọc trạng thái');
    await expect(page.getByTestId('filter-chips')).toContainText('Trạng thái:Chờ nghiệm thu');
    await page.keyboard.press('Escape');

    await page.getByRole('group', { name: 'Chế độ xem' }).getByRole('button', { name: 'Danh sách' }).click();
    await expect(page).toHaveURL(/status=PENDING_REVIEW/);
    await expect(page.locator('.v2-tasks .v2-tr:not([data-skeleton-row])')).toHaveCount(1);
    await expect(page.locator('.v2-tasks')).toContainText(T.review);
  });

  test('(f) mobile 390: không kéo được, cột cuộn trong vùng bảng, trang không cuộn ngang', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await as(page, 'boss');
    await openBoard(page);
    const src = card(page, 'PENDING_REVIEW', T.review);
    await src.scrollIntoViewIfNeeded();
    await expect(src).not.toHaveAttribute('data-draggable', 'true');
    // không cuộn ngang trang
    const sw = await page.evaluate(() => document.scrollingElement!.scrollWidth);
    expect(sw).toBeLessThanOrEqual(390);
    // vùng bảng tự cuộn ngang
    const region = page.getByRole('region', { name: 'Bảng công việc theo trạng thái' });
    expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // thử kéo bằng chuột → không có cột đích, không hộp thoại
    const a = (await src.boundingBox())!;
    await page.mouse.move(a.x + 40, a.y + 20);
    await page.mouse.down();
    await page.mouse.move(a.x + 140, a.y + 40, { steps: 6 });
    await expect(page.locator('[data-board] [data-drop]')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByRole('dialog', { name: 'Nghiệm thu công việc này?' })).toHaveCount(0);
    // chuột nhấn-thả trên thẻ ở mobile = bấm → mở ngăn chi tiết (không phải kéo); đóng lại
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // nút trên thẻ thay cho kéo
    await src.getByRole('button', { name: /Nghiệm thu — chuyển sang Đã xong/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Nghiệm thu công việc này?' });
    await expect(dlg).toBeVisible();
    await dlg.getByRole('button', { name: 'Đóng', exact: true }).click();
    expect(status(ids.review)).toBe('PENDING_REVIEW');
  });
});
