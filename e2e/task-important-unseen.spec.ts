/**
 * E2E — V2: ★ Task quan trọng + "Hoàn thành – chưa xem" + popup báo cáo + "Xem toàn bộ" nội dung
 *
 * Luồng: Boss tạo task ★ (UI) → Nhân viên tiếp nhận + hoàn thành → Boss thấy "chưa xem" → mở chi tiết
 * (đã xem, xem popup báo cáo) → bỏ ★ → "Đánh dấu đã xem tất cả".
 * Dữ liệu tiền tố [E2E], dọn ở globalTeardown.
 */
import { test, expect, type Page } from '@playwright/test';
import { login, api } from './helpers/auth';
import { E2E_USERS } from './helpers/db';

const RUN = Date.now().toString(36);
const TITLE = `[E2E] Task quan trọng ${RUN}`;
const TITLE_2 = `[E2E] Task phụ ${RUN}`;
const LONG_LINES = Array.from({ length: 30 }, (_, i) => `Dòng nội dung số ${i + 1} — kiểm tra Xem toàn bộ`);
const REPORT = [
  'Báo cáo hoàn thành E2E.',
  ...Array.from({ length: 25 }, (_, i) => `Chi tiết bước ${i + 1}: đã xử lý xong.`),
  'DÒNG CUỐI BÁO CÁO',
].join('\n');

let taskId = '';

type ListRes = { data: { id: string; title: string; isImportant: boolean; isUnseen: boolean }[] };

async function findTask(page: Page, title: string, query = '') {
  const { json } = await api<ListRes>(page, `/api/tasks?search=${encodeURIComponent(title)}${query}`);
  return json.data.find((t) => t.title === title);
}

async function counters(page: Page) {
  return (await api<{ important: number; unseen: number }>(page, '/api/tasks/counters')).json;
}

/** Nhân viên tiếp nhận + hoàn thành task qua API (luồng hoàn thành không thuộc phạm vi thay đổi này) */
async function empComplete(page: Page, id: string) {
  expect((await api(page, `/api/tasks/${id}/acknowledge`, 'POST')).status).toBe(200);
  const done = await api(page, `/api/tasks/${id}/complete`, 'POST', { reportContent: REPORT, files: [] });
  expect(done.status, JSON.stringify(done.json)).toBe(200);
}

test.describe.serial('V2 — ★ Quan trọng & Hoàn thành chưa xem', () => {
  test('Boss tạo task có ★ qua giao diện → xuất hiện ở mục Quan trọng', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Tạo công việc' }).first().click();
    const sheet = page.getByRole('dialog');

    // V2 A2-4b: biểu mẫu Tạo trong ngăn trượt mới
    await sheet.locator('#tf-title').fill(TITLE);
    const editor = sheet.locator('[contenteditable]');
    await editor.click();
    for (const line of LONG_LINES) { await page.keyboard.type(line); await page.keyboard.press('Enter'); }

    // ★ chỉ Boss/Admin thấy
    const star = sheet.locator('#tf-star');
    await expect(star).not.toBeChecked();
    await star.check();
    await expect(star).toBeChecked();

    // Người thực hiện: bỏ Boss (mặc định), chọn nhân viên E2E
    await sheet.locator('label', { hasText: '(bạn)' }).locator('input').uncheck();
    await sheet.locator('label', { hasText: E2E_USERS.emp.displayName }).locator('input').check();

    // Loại công việc + Ưu tiên: form chọn sẵn mặc định
    const end = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await sheet.locator('#tf-due').fill(end);

    await sheet.getByTestId('tf-submit').click();
    await expect(sheet).toBeHidden({ timeout: 20_000 });

    const t = await findTask(page, TITLE);
    expect(t, 'task vừa tạo').toBeTruthy();
    expect(t!.isImportant).toBe(true);
    taskId = t!.id;

    // Sidebar + trang Quan trọng
    await page.getByRole('link', { name: /Quan trọng/ }).click();
    await expect(page).toHaveURL(/view=important/);
    // V2 A2-3: mục con hiện là tab "Quan trọng" của trang Công việc
    await expect(page.getByRole('tab', { name: /^Quan trọng/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(TITLE)).toBeVisible();
    expect((await counters(page)).important).toBeGreaterThanOrEqual(1);
  });

  test('Nhân viên: không thấy ★, không có menu, không đánh ★ được; hoàn thành task', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await page.goto('/tasks');
    await expect(page.getByText(TITLE)).toBeVisible();

    await expect(page.getByRole('link', { name: /Quan trọng/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Mới xong/ })).toHaveCount(0);
    await expect(page.locator('button[title*="quan trọng"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Tạo công việc' }).first().click();
    await expect(page.getByRole('dialog').getByText('Đánh dấu quan trọng')).toHaveCount(0);
    await page.keyboard.press('Escape');

    expect((await api(page, `/api/tasks/${taskId}/important`, 'PATCH', { isImportant: false })).status).toBe(403);
    expect((await findTask(page, TITLE))!.isImportant).toBe(false); // API giấu ★ với nhân viên

    await empComplete(page, taskId);

    // Nhân viên: task hoàn thành ẩn khỏi "Chưa hoàn thành" như cũ
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Công việc', exact: true })).toBeVisible();
    await expect(page.getByText(TITLE)).toHaveCount(0);
  });

  test('Boss: task hoàn thành hiện "chưa xem" → mở chi tiết = đã xem; popup báo cáo; Xem toàn bộ; bỏ ★', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);
    const before = await counters(page);
    expect(before.unseen).toBeGreaterThanOrEqual(1);

    // Danh sách mặc định: vẫn hiện, ở đầu, có badge
    await page.goto('/tasks');
    // V2 A2-3: dòng đầu bảng, có chấm "chưa xem"
    const firstRow = page.locator('.v2-tasks .v2-tr').first();
    await expect(firstRow).toContainText(TITLE);
    await expect(firstRow.locator('[data-unseen]')).toBeVisible();
    await expect(firstRow).toContainText('Chưa xem');

    // Mục "Hoàn thành – chưa xem": trạng thái khoá ở Hoàn thành
    await page.getByRole('link', { name: /Mới xong/ }).click();
    await expect(page.getByRole('tab', { name: /^Mới xong/ })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: /^Lọc/ }).click();
    await expect(page.getByLabel('Trạng thái', { exact: true })).toBeDisabled();
    await expect(page.getByLabel('Trạng thái', { exact: true })).toHaveValue('COMPLETED');
    await expect(page.getByText(TITLE)).toBeVisible();

    // Mở trang chi tiết
    await page.goto(`/tasks/${taskId}`);
    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();

    // Mục 4: nội dung dài → có "Xem toàn bộ" / "Thu gọn"
    await page.getByRole('button', { name: 'Xem toàn bộ' }).click();
    await expect(page.getByText(LONG_LINES[LONG_LINES.length - 1])).toBeVisible();
    await expect(page.getByText('Thu gọn', { exact: true })).toBeVisible();

    // Mục 3: popup báo cáo đầy đủ
    // V2 A2-1: khối "Kết quả của người làm" — mỗi người 1 dòng, nút "Xem báo cáo" (thay accordion cột phải V1)
    await page.getByTestId('results').locator(`[data-assignee="${E2E_USERS.emp.username}"]`)
      .getByRole('button', { name: 'Xem báo cáo' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('DÒNG CUỐI BÁO CÁO');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Đã xem → counter giảm, biến khỏi mục chưa xem
    await expect.poll(async () => (await counters(page)).unseen).toBe(before.unseen - 1);
    await page.goto('/tasks?view=unseen');
    await expect(page.getByRole('tab', { name: /^Mới xong/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.v2-tasks [data-skeleton-row]')).toHaveCount(0);
    await expect(page.getByText(TITLE)).toHaveCount(0);

    // Bỏ ★ trên trang chi tiết
    await page.goto(`/tasks/${taskId}`);
    const star = page.getByRole('button', { name: 'Bỏ đánh dấu quan trọng', exact: true });
    await star.click();
    await expect(page.getByRole('button', { name: 'Đánh dấu quan trọng', exact: true })).toBeVisible();
    expect((await findTask(page, TITLE))!.isImportant).toBe(false);
  });

  test('Boss: "Đánh dấu đã xem tất cả"', async ({ page }) => {
    // Chuẩn bị: Boss giao task phụ qua API, nhân viên hoàn thành
    await login(page, E2E_USERS.boss.username);
    const prios = (await api<{ id: string }[] | { data: { id: string }[] }>(page, '/api/settings/priorities')).json;
    const types = (await api<{ id: string }[] | { data: { id: string }[] }>(page, '/api/settings/task-types')).json;
    const first = (x: unknown) => (Array.isArray(x) ? x[0] : (x as { data: { id: string }[] }).data[0]).id;
    const { json: emp } = await api<{ data: { id: string; username: string }[] } | { id: string; username: string }[]>(page, '/api/tasks/assignable-users');
    const empList = Array.isArray(emp) ? emp : emp.data;
    const empId = empList.find((u) => u.username === E2E_USERS.emp.username)!.id;
    const created = await api<{ id: string }>(page, '/api/tasks', 'POST', {
      title: TITLE_2, content: 'Nội dung phụ', priorityId: first(prios), typeId: first(types),
      scheduleStart: new Date().toISOString().slice(0, 10),
      scheduleEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      workflowMode: 'IMMEDIATE', assigneeIds: [empId], isForceMode: false,
    });
    expect(created.status, JSON.stringify(created.json)).toBe(201);

    await login(page, E2E_USERS.emp.username);
    await empComplete(page, created.json.id);

    await login(page, E2E_USERS.boss.username);
    await page.goto('/tasks?view=unseen');
    await expect(page.getByText(TITLE_2)).toBeVisible();
    // Ổn định (từng chập chờn): chờ đúng response POST seen-all rồi poll số đếm, không đọc ngay 1 lần
    const seenAll = page.waitForResponse((r) => r.url().endsWith('/api/tasks/seen-all') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Đánh dấu đã xem tất cả' }).click();
    expect((await seenAll).status()).toBe(200);
    await expect(page.getByText(TITLE_2)).toHaveCount(0);
    await expect.poll(async () => (await counters(page)).unseen).toBe(0);
  });
});
