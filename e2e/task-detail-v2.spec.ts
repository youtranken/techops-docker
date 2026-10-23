/**
 * E2E — V2 A2-1: chi tiết công việc (trang + ngăn xem nhanh dùng chung).
 * Hành vi/quyền giữ nguyên V1: nút hiện theo useTaskPermissions, bấm nút mở đúng hộp thoại V1.
 * Dữ liệu tiền tố [E2E] (tạo qua API V1 ở helpers/seed.ts), dọn ở globalTeardown.
 */
import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import { E2E_USERS } from './helpers/db';
import { seedDetailTasks } from './helpers/seed';

const RUN = Date.now().toString(36);
let ids: Awaited<ReturnType<typeof seedDetailTasks>>;

const actions = (page: Page) => page.getByRole('group', { name: 'Hành động' });

test.describe.serial('V2 — chi tiết công việc', () => {
  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(180_000);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    ids = await seedDetailTasks(page, RUN);
    await page.close();
  });

  test('(a) danh sách → ngăn xem nhanh → ‹ › → Mở trang đầy đủ', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);
    await page.goto('/tasks');
    await page.getByText(`[E2E] Đang làm ${RUN}`).first().click();
    const dr = page.getByTestId('task-drawer');
    await expect(dr).toBeVisible();
    const title = dr.getByRole('heading', { level: 2 }).first();
    await expect(title).toHaveText(`[E2E] Đang làm ${RUN}`, { timeout: 60_000 });
    await expect(dr.getByTestId('journey')).toBeVisible();
    await expect(dr.getByTestId('drawer-pos')).toHaveText(/^\d+ \/ \d+$/);
    const pos = await dr.getByTestId('drawer-pos').textContent();

    // ‹ › — chuyển sang việc bên cạnh rồi quay lại
    const prev = dr.getByRole('button', { name: 'Việc trước' });
    const next = dr.getByRole('button', { name: 'Việc sau' });
    const forward = await next.isEnabled();
    await (forward ? next : prev).click();
    await expect(title).not.toHaveText(`[E2E] Đang làm ${RUN}`);
    await expect(dr.getByTestId('drawer-pos')).not.toHaveText(pos!);
    await (forward ? prev : next).click();
    await expect(title).toHaveText(`[E2E] Đang làm ${RUN}`);
    await expect(dr.getByTestId('drawer-pos')).toHaveText(pos!);

    await dr.getByRole('link', { name: 'Mở trang đầy đủ' }).click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${ids.progress}$`));
    await expect(page.getByRole('heading', { level: 1, name: `[E2E] Đang làm ${RUN}` })).toBeVisible();
    await expect(dr).toBeHidden();
  });

  test('(b) Boss: nút đúng theo trạng thái (quyền V1) và mở đúng hộp thoại V1', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);

    // Chờ duyệt (nhân viên tạo, Phê duyệt) → Duyệt + Từ chối
    await page.goto(`/tasks/${ids.approval}`);
    await expect(page.getByTestId('turn')).toHaveText(/Đến lượt bạn duyệt/, { timeout: 60_000 });
    await expect(actions(page).getByRole('button')).toHaveText(['Từ chối', 'Duyệt']);
    await actions(page).getByRole('button', { name: 'Duyệt' }).click();
    await expect(page.getByRole('dialog', { name: 'Duyệt công việc' })).toBeVisible();
    await page.keyboard.press('Escape');
    await actions(page).getByRole('button', { name: 'Từ chối' }).click();
    await expect(page.getByRole('dialog', { name: 'Từ chối công việc' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Chờ nghiệm thu → Yêu cầu làm lại + Nghiệm thu; xem báo cáo
    await page.goto(`/tasks/${ids.review}`);
    await expect(actions(page).getByRole('button')).toHaveText(['Yêu cầu làm lại', 'Nghiệm thu'], { timeout: 60_000 });
    await actions(page).getByRole('button', { name: 'Yêu cầu làm lại' }).click();
    await expect(page.getByRole('dialog', { name: 'Yêu cầu làm lại' })).toBeVisible();
    await page.keyboard.press('Escape');
    await actions(page).getByRole('button', { name: 'Nghiệm thu' }).click();
    await expect(page.getByRole('dialog', { name: 'Duyệt KQ hoàn thành' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('results').getByRole('button', { name: 'Xem báo cáo' }).click();
    await expect(page.getByRole('dialog')).toContainText('Đã kiểm tra lại.');
    await page.keyboard.press('Escape');

    // Đang làm (Boss là người tạo, người làm đã nhận) → V1: không có nút chính, không có "Hủy"
    await page.goto(`/tasks/${ids.progress}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
    await expect(actions(page)).toHaveCount(0);
    await expect(page.getByTestId('turn')).toHaveCount(0);
    await expect(page.getByTestId('holder')).toContainText('[E2E] Nhân viên');
    // tab Gia hạn: Boss có quyền duyệt → "Xem xét" mở ApproveExtensionModal V1
    await page.getByRole('tab', { name: /Gia hạn/ }).click();
    await page.getByRole('button', { name: 'Xem xét' }).click();
    await expect(page.getByRole('dialog')).toContainText('Cần thêm thời gian chờ linh kiện');
    await page.keyboard.press('Escape');
  });

  test('(b2) Nhân viên: Chờ nhận việc → Nhận việc / Từ chối mở hộp thoại V1', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await page.goto(`/tasks/${ids.waiting}`);
    await expect(actions(page).getByRole('button')).toHaveText(['Từ chối', 'Nhận việc'], { timeout: 60_000 });
    await actions(page).getByRole('button', { name: 'Nhận việc' }).click();
    await expect(page.getByRole('dialog', { name: 'Tiếp nhận công việc' })).toBeVisible();
    await page.keyboard.press('Escape');
    await actions(page).getByRole('button', { name: 'Từ chối' }).click();
    await expect(page.getByRole('dialog', { name: 'Từ chối nhận công việc' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('(c) bình luận: gửi → hiện trong ô riêng', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await page.goto(`/tasks/${ids.progress}`);
    const list = page.getByTestId('comment-list');
    await expect(list.locator('[data-comment]')).toHaveCount(2, { timeout: 60_000 });
    const text = `[E2E] Bình luận mới ${RUN}`;
    await page.getByPlaceholder('Viết bình luận…').fill(text);
    await page.getByRole('button', { name: 'Gửi' }).click();
    await expect(list.locator('[data-comment]')).toHaveCount(3);
    const last = list.locator('[data-comment]').last();
    await expect(last).toContainText(text);
    await expect(last).toContainText(E2E_USERS.emp.displayName);
    await expect(page.getByPlaceholder('Viết bình luận…')).toHaveValue('');
  });

  test('(d) mobile 390: không cuộn ngang, nút hành động thành thanh dính đáy 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, E2E_USERS.emp.username);
    await page.goto(`/tasks/${ids.waiting}`);
    const bar = actions(page);
    await expect(bar).toBeVisible({ timeout: 60_000 });
    const box = await bar.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { pos: getComputedStyle(el).position, bottom: r.bottom, width: r.width, btnH: (el.querySelector('button') as HTMLElement).getBoundingClientRect().height };
    });
    expect(box.pos).toBe('fixed');
    expect(Math.round(box.bottom)).toBe(844);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.btnH)).toBe(44);
    const noHScroll = await page.evaluate(() => {
      const main = document.getElementById('content')!;
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth && main.scrollWidth <= main.clientWidth;
    });
    expect(noHScroll).toBe(true);
  });
});
