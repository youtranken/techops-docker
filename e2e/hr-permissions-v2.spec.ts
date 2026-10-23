/**
 * E2E — A3-4: Nhân sự + Phân quyền (V2, nghiệp vụ V1).
 *  (a) Admin tạo người dùng [E2E] qua hộp thoại: lỗi dưới ô → tạo được → DB.
 *  (b) Sửa tên; đặt lại mật khẩu (sai chính sách báo lỗi, đúng → DB đổi hash); ngăn chi tiết có Lịch sử.
 *  (c) Khoá (có hỏi xác nhận) → DB isActive=false → lọc "Đã khoá" → Mở khoá; hàng loạt "Bắt buộc đổi mật khẩu"; Xoá.
 *  (d) Boss phân quyền menu cho Nhân viên [E2E]: bật/tắt → thanh lưu đếm → Lưu → DB đúng body V1; Hoàn tác; trang con lọc menu.
 *  (e) Nhân viên: không vào được Phân quyền; ở Nhân sự chỉ thao tác với chính mình; /hr/users/:id/permissions vẫn 404.
 *  (f) 390px không cuộn ngang.
 * Chỉ đụng user [E2E] (e2e_hrnew nằm trong E2E_EXTRA_USERNAMES → globalTeardown dọn; SidebarPermission xoá theo user).
 * Không sửa quyền theo vai trò (V1 không có) hay quyền của user thật.
 */
import { test, expect, type Page, type Cookie } from '@playwright/test';
import { E2E_USERS, E2E_PASSWORD, psql } from './helpers/db';

const NEW_USER = 'e2e_hrnew';
const uid = (u: string) => psql(`SELECT id FROM "User" WHERE username='${u}';`);
const sessions: Record<string, Cookie[]> = {};

async function signIn(page: Page, username: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();
    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 25_000 });
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await page.waitForTimeout(61_000); // V1 giới hạn 5 lần đăng nhập/phút
    }
  }
}
async function as(page: Page, who: string) {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const row = (page: Page, text: string) => page.getByRole('table', { name: 'Nhân sự' }).getByRole('row').filter({ hasText: text });
async function search(page: Page, q: string) {
  await page.getByTestId('pp-search').fill(q);
  await page.waitForTimeout(500);
}
async function menuItem(page: Page, rowText: string, item: RegExp | string) {
  await row(page, rowText).getByRole('button', { name: /^Thao tác với/ }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

test.describe.serial('A3-4 — Nhân sự + Phân quyền', () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(300_000);
    psql(`DELETE FROM "User" WHERE username='${NEW_USER}';`);
    // Nhân viên [E2E]: được menu Nhân sự + Sửa thông tin (để vào /hr/users); bản ghi riêng của user [E2E]
    const emp = uid(E2E_USERS.emp.username);
    psql(`DELETE FROM "SidebarPermission" WHERE "userId"='${emp}';
      INSERT INTO "SidebarPermission"(id,"userId","visibleMenus","featurePermissions","createdAt","updatedAt")
      VALUES ('ce2ehrp${emp.slice(-18)}','${emp}','["hr","logs"]','{"hr":["edit"],"logs":["task_activity"]}', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');`);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    for (const who of ['admin', 'boss', 'emp'] as const) {
      await signIn(page, E2E_USERS[who].username);
      sessions[who] = await page.context().cookies();
    }
    await page.close();
  });

  test('(a) Admin tạo người dùng: lỗi dưới ô → tạo → DB', async ({ page }) => {
    await as(page, 'admin');
    await page.goto('/hr/users');
    await expect(page.getByRole('heading', { level: 1, name: 'Nhân sự' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('navigation', { name: 'Mục nhân sự' }).getByRole('link', { name: 'Người dùng' })).toHaveAttribute('aria-current', 'page');
    await search(page, '[E2E]');
    await expect(row(page, '[E2E] Nhân viên')).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('pp-create-btn').click();
    const dlg = page.getByTestId('pp-create');
    await dlg.getByRole('button', { name: 'Tạo người dùng' }).click();
    await expect(dlg.locator('#pp-c-user')).toHaveAttribute('aria-invalid', 'true');
    await expect(dlg).toContainText('Chọn vai trò');
    await dlg.locator('#pp-c-user').fill('ab');
    await expect(dlg).toContainText('3–50 ký tự');
    await dlg.locator('#pp-c-user').fill(NEW_USER);
    await dlg.locator('#pp-c-name').fill('[E2E] HR mới');
    await dlg.locator('#pp-c-role').selectOption({ label: 'Nhân viên' });
    await dlg.locator('#pp-c-pw').fill(E2E_PASSWORD);
    await dlg.locator('#pp-c-pw2').fill(E2E_PASSWORD + 'x');
    await dlg.getByRole('button', { name: 'Tạo người dùng' }).click();
    await expect(dlg).toContainText('Mật khẩu nhập lại không khớp');
    await dlg.locator('#pp-c-pw2').fill(E2E_PASSWORD);
    await dlg.getByRole('button', { name: 'Tạo người dùng' }).click();
    await expect(page.getByText('Đã tạo tài khoản [E2E] HR mới')).toBeVisible({ timeout: 30_000 });
    expect(psql(`SELECT u."displayName"||'|'||u."isActive"||'|'||r.name||'|'||u."mustChangePassword" FROM "User" u JOIN "Role" r ON r.id=u."roleId" WHERE username='${NEW_USER}';`))
      .toBe('[E2E] HR mới|true|EMPLOYEE|false');
    await expect(row(page, '[E2E] HR mới')).toBeVisible();
  });

  test('(b) Sửa tên, đặt lại mật khẩu, ngăn chi tiết có Lịch sử', async ({ page }) => {
    await as(page, 'admin');
    await page.goto('/hr/users');
    await search(page, NEW_USER);
    await menuItem(page, '[E2E] HR mới', 'Sửa thông tin');
    const ed = page.getByTestId('pp-edit');
    await ed.locator('#pp-e-name').fill('');
    await ed.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(ed.locator('#pp-e-name')).toHaveAttribute('aria-invalid', 'true');
    await ed.locator('#pp-e-name').fill('[E2E] HR mới sửa');
    await ed.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByText('Đã lưu thông tin [E2E] HR mới sửa')).toBeVisible({ timeout: 30_000 });
    expect(psql(`SELECT "displayName" FROM "User" WHERE username='${NEW_USER}';`)).toBe('[E2E] HR mới sửa');

    const hash0 = psql(`SELECT password FROM "User" WHERE username='${NEW_USER}';`);
    await menuItem(page, '[E2E] HR mới sửa', 'Đặt lại mật khẩu');
    const pw = page.getByTestId('pp-pw');
    await pw.locator('#pp-p-pw').fill('abc');
    await pw.locator('#pp-p-pw2').fill('abc');
    await pw.getByRole('button', { name: 'Đặt mật khẩu' }).click();
    await expect(pw).toContainText('Mật khẩu chưa đạt đủ yêu cầu bên trên');
    await pw.locator('#pp-p-pw').fill('Moi!Passw0rd#A34');
    await pw.locator('#pp-p-pw2').fill('Moi!Passw0rd#A34');
    await pw.getByRole('button', { name: 'Đặt mật khẩu' }).click();
    await expect(page.getByText('Đã đặt mật khẩu mới cho [E2E] HR mới sửa')).toBeVisible({ timeout: 30_000 });
    expect(psql(`SELECT password FROM "User" WHERE username='${NEW_USER}';`)).not.toBe(hash0);

    // bấm dòng → ngăn chi tiết; lịch sử của Admin [E2E] có "Tạo tài khoản"
    await search(page, '[E2E] Admin');
    await row(page, '[E2E] Admin').click();
    const dr = page.getByTestId('pp-drawer');
    await expect(dr.getByRole('heading', { name: '[E2E] Admin' })).toBeVisible();
    await expect(dr.getByTestId('pp-history')).toContainText('Tạo tài khoản', { timeout: 30_000 });
    await page.keyboard.press('Escape');
    await expect(dr).toBeHidden();
  });

  test('(c) Khoá → lọc Đã khoá → Mở khoá; hàng loạt bắt buộc đổi mật khẩu; Xoá', async ({ page }) => {
    await as(page, 'admin');
    await page.goto('/hr/users');
    await search(page, NEW_USER);
    await menuItem(page, '[E2E] HR mới sửa', 'Khoá tài khoản');
    const cf = page.getByRole('alertdialog');
    await expect(cf).toContainText('Khoá tài khoản [E2E] HR mới sửa?');
    await cf.getByRole('button', { name: 'Đóng' }).click();
    expect(psql(`SELECT "isActive" FROM "User" WHERE username='${NEW_USER}';`)).toBe('t');
    await menuItem(page, '[E2E] HR mới sửa', 'Khoá tài khoản');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Khoá tài khoản' }).click();
    await expect.poll(() => psql(`SELECT "isActive" FROM "User" WHERE username='${NEW_USER}';`)).toBe('f');

    await page.getByTestId('pp-status').selectOption('inactive');
    await expect(row(page, '[E2E] HR mới sửa')).toContainText('Đã khoá', { timeout: 30_000 });
    await menuItem(page, '[E2E] HR mới sửa', 'Mở khoá');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mở khoá' }).click();
    await expect.poll(() => psql(`SELECT "isActive" FROM "User" WHERE username='${NEW_USER}';`)).toBe('t');
    await page.getByTestId('pp-status').selectOption('all');

    // Hàng loạt: chọn → Bắt buộc đổi mật khẩu
    await row(page, '[E2E] HR mới sửa').getByRole('checkbox').check();
    const bulk = page.getByTestId('pp-bulk');
    await expect(bulk).toContainText('Đã chọn 1 người');
    await bulk.getByRole('button', { name: 'Bắt buộc đổi mật khẩu' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Bắt buộc đổi' }).click();
    await expect.poll(() => psql(`SELECT "mustChangePassword" FROM "User" WHERE username='${NEW_USER}';`)).toBe('t');
    await expect(bulk).toBeHidden();

    // Xoá (chưa có việc nào)
    await menuItem(page, '[E2E] HR mới sửa', 'Xoá người dùng');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá vĩnh viễn' }).click();
    await expect.poll(() => psql(`SELECT count(*) FROM "User" WHERE username='${NEW_USER}';`)).toBe('0');
  });

  test('(d) Boss phân quyền menu cho Nhân viên [E2E] → Lưu → DB đúng body V1', async ({ page }) => {
    const emp = uid(E2E_USERS.emp.username);
    const rec = () => psql(`SELECT "visibleMenus"||' '||"featurePermissions" FROM "SidebarPermission" WHERE "userId"='${emp}';`);
    await as(page, 'boss');
    await page.goto(`/hr/permissions#user=${emp}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Phân quyền' })).toBeVisible({ timeout: 60_000 });
    const head = page.getByTestId('perm-user-head');
    await expect(head).toContainText('[E2E] Nhân viên', { timeout: 30_000 });

    // Tính năng Hồ sơ bị khoá khi menu Cài đặt tắt
    const sw = (k: string) => page.locator(`[data-sw="${k}"]`);
    await expect(sw('settings')).toHaveAttribute('aria-checked', 'false');
    await expect(sw('settings.profile')).toBeDisabled();
    await sw('settings').click();
    await sw('settings.profile').click();
    await sw('logs.task_activity').click(); // tắt
    await expect(page.getByText('3 thay đổi chưa lưu')).toBeVisible();
    // Hoàn tác → không còn thay đổi
    await page.getByRole('button', { name: 'Hoàn tác' }).click();
    await expect(sw('settings')).toHaveAttribute('aria-checked', 'false');
    expect(rec()).toBe('["hr","logs"] {"hr":["edit"],"logs":["task_activity"]}');

    await sw('settings').click();
    await sw('settings.profile').click();
    await sw('logs.task_activity').click();
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByText('Đã lưu 3 thay đổi cho [E2E] Nhân viên')).toBeVisible({ timeout: 30_000 });
    // V1: bật menu → nối vào cuối; tắt tính năng → lọc khỏi danh sách
    expect(rec()).toBe('["hr","logs","settings"] {"hr":["edit"],"logs":[],"settings":["profile"]}');
    await expect(head).toContainText('Khác mặc định');

    // Trang con V1 /hr/permissions/settings: chỉ khối Cài đặt
    await page.goto(`/hr/permissions/settings#user=${emp}`);
    await expect(page.locator('section[data-menu]')).toHaveCount(1, { timeout: 30_000 });
    await expect(page.locator('section[data-menu="settings"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cài đặt' }).first()).toBeVisible();
  });

  test('(e) Nhân viên: không vào Phân quyền; chỉ thao tác với chính mình; trang quyền riêng V1 vẫn 404', async ({ page }) => {
    await as(page, 'emp');
    await page.goto('/hr/permissions');
    await expect(page.getByText('Bạn không có quyền xem phân quyền')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('navigation', { name: 'Mục nhân sự' }).getByRole('link', { name: 'Phân quyền' })).toHaveCount(0);

    await page.goto('/hr/users');
    await search(page, '[E2E]');
    await expect(row(page, '[E2E] Nhân viên')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('table', { name: 'Nhân sự' }).getByRole('checkbox')).toHaveCount(0);
    await expect(row(page, '[E2E] Admin')).toHaveCount(0); // V1: nhân viên không thấy ADMIN/BOSS
    await row(page, '[E2E] Nhân viên').getByRole('button', { name: /^Thao tác với/ }).click();
    await expect(page.getByRole('menuitem')).toHaveText(['Lịch sử hoạt động', 'Sửa thông tin']);
    await page.keyboard.press('Escape');

    await as(page, 'admin');
    const res = await page.goto(`/hr/users/${uid(E2E_USERS.emp.username)}/permissions`);
    expect(res?.status()).toBe(404);
  });

  test('(f) 390px: không cuộn ngang ở Nhân sự và Phân quyền', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await as(page, 'admin');
    await page.goto('/hr/users');
    await expect(page.getByRole('heading', { level: 1, name: 'Nhân sự' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('table', { name: 'Nhân sự' }).getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 });
    expect(await noHScroll(page)).toBe(true);
    await page.goto('/hr/permissions');
    await expect(page.getByTestId('perm-user-head')).toBeVisible({ timeout: 30_000 });
    expect(await noHScroll(page)).toBe(true);
  });
});
