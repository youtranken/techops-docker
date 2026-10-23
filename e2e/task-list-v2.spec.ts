/**
 * E2E — V2 A2-3: danh sách công việc (bảng, bộ lọc + chip, phân trang, menu ⋯, ★, xem nhanh, mobile, hydration).
 * Nghiệp vụ giữ V1: menu ⋯ chỉ có hành động useTaskPermissions cho phép, mở đúng hộp thoại A2-2; tham số URL/API như V1.
 * Dữ liệu tiền tố [E2E] (tạo qua API V1), dọn ở globalTeardown.
 */
import { test, expect, type Page, type Cookie } from '@playwright/test';
import { login, api } from './helpers/auth';
import { E2E_USERS } from './helpers/db';
import { refs, createTask, call } from './helpers/seed';

const RUN = `L${Date.now().toString(36)}`;
const T = {
  approval: `[E2E] DS Chờ duyệt ${RUN}`,
  waiting: `[E2E] DS Chờ nhận ${RUN}`,
  progress: `[E2E] DS Đang làm ${RUN}`,
  review: `[E2E] DS Chờ nghiệm thu ${RUN}`,
};
const FILLERS = 7; // tổng 11 việc → 2 trang khi 10/trang
let ids: Record<keyof typeof T, string>;
let prio2 = { id: '', name: '' };

const row = (page: Page, title: string) => page.locator('.v2-tasks .v2-tr', { hasText: title });
const rows = (page: Page) => page.locator('.v2-tasks .v2-tr:not([data-skeleton-row])');
const BASE_ITEMS = ['Xem nhanh', 'Mở trang đầy đủ', 'Sao chép mã'];

/** Phiên đăng nhập lưu từ beforeAll — tránh đăng nhập lại mỗi test (giới hạn đăng nhập/phút của V1 làm chập chờn). */
const sessions: Record<'boss' | 'emp', Cookie[]> = { boss: [], emp: [] };
async function as(page: Page, who: 'boss' | 'emp') {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}

async function openList(page: Page, query = '') {
  await page.goto(`/tasks?search=${encodeURIComponent(RUN)}${query}`);
  await expect(page.locator('.v2-tasks [data-skeleton-row]')).toHaveCount(0, { timeout: 60_000 });
}

async function menuItems(page: Page, title: string) {
  await row(page, title).getByRole('button', { name: /Thao tác nhanh/ }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu.getByRole('menuitem').allTextContents();
}

test.describe.serial('V2 — danh sách công việc', () => {
  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(240_000);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    await login(page, E2E_USERS.boss.username);
    sessions.boss = await page.context().cookies();
    const r = await refs(page);
    const prios = (await api<{ id: string; name: string }[] | { data: { id: string; name: string }[] }>(page, '/api/settings/priorities')).json;
    const plist = Array.isArray(prios) ? prios : prios.data;
    prio2 = plist[1] ?? plist[0];
    const waiting = await createTask(page, { title: T.waiting, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId] }, r);
    const progress = await createTask(page, { title: T.progress, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId], days: 2 }, { ...r, priorityId: prio2.id });
    const review = await createTask(page, { title: T.review, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
    for (let i = 1; i <= FILLERS; i++) {
      await createTask(page, { title: `[E2E] DS Việc phụ ${i} ${RUN}`, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId], days: 10 + i }, r);
    }
    await login(page, E2E_USERS.emp.username);
    sessions.emp = await page.context().cookies();
    const approval = await createTask(page, { title: T.approval, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
    for (const id of [progress, review]) await call(page, `/api/tasks/${id}/acknowledge`);
    await call(page, `/api/tasks/${review}/complete`, 'POST', { reportContent: '[E2E] Đã xử lý xong toàn bộ.', files: [] });
    ids = { approval, waiting, progress, review };
    await page.close();
  });

  test('(a) lọc theo trạng thái + ưu tiên → chip → Xóa bộ lọc; URL và payload API như V1', async ({ page }) => {
    await as(page, 'boss');
    await openList(page);
    await expect(rows(page)).toHaveCount(11);

    await page.getByRole('button', { name: /^Lọc/ }).click();
    const panel = page.getByRole('region', { name: 'Bộ lọc' });
    await expect(panel).toBeVisible();

    const req = page.waitForRequest((r) => r.url().includes('/api/tasks?') && r.url().includes('status=IN_PROGRESS'));
    await panel.getByLabel('Trạng thái').selectOption('IN_PROGRESS');
    await expect(page).toHaveURL(/status=IN_PROGRESS/);
    const url = new URL((await req).url());
    expect(url.searchParams.get('hideCompleted')).toBe('false');
    expect(url.searchParams.get('search')).toBe(RUN);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText(T.progress);

    await panel.getByLabel('Ưu tiên').selectOption(prio2.id);
    await expect(page).toHaveURL(new RegExp(`priorityId=${prio2.id}`));
    const chips = page.getByTestId('filter-chips');
    await expect(chips).toContainText('Trạng thái:Đang làm');
    await expect(chips).toContainText(`Ưu tiên:${prio2.name}`);
    await expect(page.getByRole('button', { name: 'Lọc · 2' })).toBeVisible();

    // bỏ 1 chip
    await chips.getByRole('button', { name: 'Bỏ lọc Trạng thái' }).click();
    await expect(page).not.toHaveURL(/status=/);
    // Xóa bộ lọc (dòng chip)
    await chips.getByRole('button', { name: 'Xóa bộ lọc' }).click();
    await expect(page).not.toHaveURL(/priorityId=/);
    await expect(page).toHaveURL(new RegExp(`search=${RUN}`)); // tìm kiếm giữ nguyên
    await expect(chips).toHaveCount(0);
    await expect(rows(page)).toHaveCount(11);

    // Esc đóng bảng lọc, focus về nút Lọc
    await panel.getByLabel('Nguồn').focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: /^Lọc/ })).toBeFocused();
  });

  test('(b) tab: Đã hủy / Đã xong ánh xạ vào status V1; phân trang + cỡ trang', async ({ page }) => {
    await as(page, 'boss');
    await openList(page, '&limit=10');
    await expect(rows(page)).toHaveCount(10);
    const pager = page.getByRole('navigation', { name: 'Phân trang' });
    await expect(pager).toContainText('1–10 / 11');
    await pager.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page)).toHaveCount(1);
    await expect(pager).toContainText('11–11 / 11');
    await pager.getByRole('button', { name: 'Trang trước' }).click();
    await expect(page).not.toHaveURL(/page=/);
    await pager.getByRole('combobox').selectOption('20');
    await expect(page).not.toHaveURL(/limit=/); // 20 = mặc định V1 → bỏ khỏi URL
    await expect(rows(page)).toHaveCount(11);

    await page.getByRole('tab', { name: /^Đã hủy/ }).click();
    await expect(page).toHaveURL(/status=CANCELLED/);
    await expect(page.getByText('Không có việc nào khớp bộ lọc')).toBeVisible(); // có tìm kiếm
    await page.getByRole('tab', { name: /^Đang mở/ }).click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(rows(page)).toHaveCount(11);
  });

  test('(c) menu ⋯ theo vai trò + trạng thái (quyền V1) và mở đúng hộp thoại', async ({ page }) => {
    // Boss
    await as(page, 'boss');
    await openList(page);
    expect(await menuItems(page, T.approval)).toEqual([...BASE_ITEMS, 'Duyệt', 'Từ chối', 'Sửa', 'Đánh dấu quan trọng']);
    await page.getByRole('menuitem', { name: 'Duyệt' }).click();
    await expect(page.getByRole('dialog', { name: 'Duyệt công việc này?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    expect(await menuItems(page, T.review)).toEqual([...BASE_ITEMS, 'Nghiệm thu', 'Yêu cầu làm lại', 'Đánh dấu quan trọng']);
    await page.getByRole('menuitem', { name: 'Yêu cầu làm lại' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // V1: Boss ở Đang làm (Phê duyệt, mọi người đã nhận) — ma trận bỏ Hủy (post-condition)
    expect(await menuItems(page, T.progress)).toEqual([...BASE_ITEMS, 'Sửa', 'Đánh dấu quan trọng']);
    await page.keyboard.press('Escape');
    expect(await menuItems(page, T.waiting)).toEqual([...BASE_ITEMS, 'Sửa', 'Đánh dấu quan trọng', 'Hủy công việc']);
    await page.getByRole('menuitem', { name: 'Hủy công việc' }).click();
    await expect(page.getByRole('dialog').getByRole('textbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // Nhân viên
    await as(page, 'emp');
    await openList(page);
    expect(await menuItems(page, T.waiting)).toEqual([...BASE_ITEMS, 'Nhận việc', 'Từ chối nhận']);
    await page.getByRole('menuitem', { name: 'Từ chối nhận' }).click();
    await expect(page.getByRole('dialog', { name: 'Từ chối nhận việc?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    expect(await menuItems(page, T.progress)).toEqual([...BASE_ITEMS, 'Báo cáo xong', 'Xin gia hạn', 'Chuyển giao']);
    await page.getByRole('menuitem', { name: 'Báo cáo xong' }).click();
    await expect(page.getByRole('dialog', { name: 'Báo cáo xong việc' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    expect(await menuItems(page, T.review)).toEqual([...BASE_ITEMS, 'Bổ sung báo cáo']);
    await page.keyboard.press('Escape');
    expect(await menuItems(page, T.approval)).toEqual([...BASE_ITEMS, 'Sửa', 'Hủy công việc']);
    await page.keyboard.press('Escape');

    // Nhân viên không có ★ (V1)
    await expect(page.locator('.v2-tasks button[aria-pressed]')).toHaveCount(0);
  });

  test('(d) ★ quan trọng (Boss): bật qua menu → tab Quan trọng; tắt bằng nút ★ trên dòng', async ({ page }) => {
    await as(page, 'boss');
    await openList(page);
    await menuItems(page, T.progress);
    await page.getByRole('menuitem', { name: 'Đánh dấu quan trọng' }).click();
    await expect(page.getByText(/Đã đánh dấu .* là quan trọng/)).toBeVisible();
    await expect(row(page, T.progress).getByRole('button', { name: 'Bỏ đánh dấu quan trọng' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('tab', { name: /^Quan trọng/ }).click();
    await expect(page).toHaveURL(/view=important/);
    await expect(row(page, T.progress)).toBeVisible();
    await expect(rows(page)).toHaveCount(1);

    await row(page, T.progress).getByRole('button', { name: 'Bỏ đánh dấu quan trọng' }).click();
    await expect(rows(page)).toHaveCount(0);
    const { json } = await api<{ data: { id: string; isImportant: boolean }[] }>(page, `/api/tasks?search=${encodeURIComponent(T.progress)}`);
    expect(json.data.find((x) => x.id === ids.progress)?.isImportant).toBe(false);
  });

  test('(e) xem nhanh: bấm dòng / menu → ngăn chi tiết; Sao chép mã', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await as(page, 'boss');
    await openList(page);
    await row(page, T.review).getByText(T.review).click();
    const dr = page.getByTestId('task-drawer');
    await expect(dr).toBeVisible();
    await expect(dr.getByRole('heading', { level: 2 }).first()).toHaveText(T.review, { timeout: 60_000 });
    await page.keyboard.press('Escape');
    await expect(dr).toBeHidden();

    await menuItems(page, T.waiting);
    await page.getByRole('menuitem', { name: 'Xem nhanh' }).click();
    await expect(dr.getByRole('heading', { level: 2 }).first()).toHaveText(T.waiting, { timeout: 60_000 });
    await page.keyboard.press('Escape');
    await expect(dr).toBeHidden();

    const code = (await row(page, T.waiting).locator('[data-code]').textContent())!.trim();
    await menuItems(page, T.waiting);
    await page.getByRole('menuitem', { name: 'Sao chép mã' }).click();
    await expect(page.getByText(`Đã sao chép mã ${code}`)).toBeVisible();

    await menuItems(page, T.waiting);
    await page.getByRole('menuitem', { name: 'Mở trang đầy đủ' }).click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${ids.waiting}$`), { timeout: 60_000 });
  });

  test('(f) mobile 390: dòng thành thẻ, không cuộn ngang, nút ⋯ ≥ 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await as(page, 'boss');
    await openList(page, '&status=all');
    await expect(row(page, T.progress)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const btn = row(page, T.progress).getByRole('button', { name: /Thao tác nhanh/ });
    const box = (await btn.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    // đầu bảng ẩn, tiêu đề xuống dòng riêng (dòng 3 tầng)
    await expect(page.locator('.v2-tasks .v2-thead')).toBeHidden();
    await page.getByRole('button', { name: /^Lọc/ }).click();
    await expect(page.getByRole('region', { name: 'Bộ lọc' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('(g) không có lỗi hydration (/tasks Boss + nhân viên, /hr/users)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    const hydration = () => errors.filter((e) => /hydrat|did not match|cannot be a descendant|cannot contain a nested/i.test(e));

    await as(page, 'boss');
    await openList(page);
    await page.goto('/tasks?view=unseen');
    await expect(page.locator('.v2-tasks [data-skeleton-row]')).toHaveCount(0, { timeout: 60_000 });
    await page.goto('/hr/users', { timeout: 90_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
    await as(page, 'emp');
    await openList(page);
    expect(hydration()).toEqual([]);
  });
});
