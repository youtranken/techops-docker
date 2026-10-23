/**
 * E2E — A1.3 song ngữ: đổi ngôn ngữ ở menu người dùng (cookie NEXT_LOCALE, không đổi URL).
 * Mặc định vi → chọn English: nhãn menu/nút đổi sang EN, <html lang="en">, reload vẫn giữ EN → đổi lại Tiếng Việt.
 * Không ghi dữ liệu nghiệp vụ; chỉ dùng user [E2E] tạo ở globalSetup.
 */
import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import { E2E_USERS } from './helpers/db';

const userMenu = (page: Page) => page.getByRole('button', { name: new RegExp(E2E_USERS.emp.displayName.replace(/[[\]]/g, '\\$&')) });

async function openMenu(page: Page) {
  await userMenu(page).click();
  return page.getByRole('menu');
}

test('đổi ngôn ngữ VI → EN → (reload giữ EN) → VI', async ({ page }) => {
  await login(page, E2E_USERS.emp.username);
  await page.goto('/tasks');

  // Mặc định: tiếng Việt
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  let menu = await openMenu(page);
  // A1-4: nút Sáng/Tối chuyển từ topbar vào menu người dùng
  await expect(menu.getByRole('menuitemradio', { name: 'Tối' })).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'Sáng' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Đăng xuất' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Hồ sơ' })).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'Tiếng Việt' })).toHaveAttribute('aria-checked', 'true');

  // Chọn English
  await menu.getByRole('menuitemradio', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(/\/tasks$/); // không đổi URL
  menu = await openMenu(page);
  await expect(menu.getByRole('menuitemradio', { name: 'Dark' })).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'Light' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Profile' })).toBeVisible();
  await expect(menu.getByText('Language')).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');

  const cookie = (await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE');
  expect(cookie?.value).toBe('en');

  // Reload vẫn giữ EN (server đọc cookie)
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  menu = await openMenu(page);
  await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();

  // Đổi lại Tiếng Việt
  await menu.getByRole('menuitemradio', { name: 'Tiếng Việt' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  menu = await openMenu(page);
  await expect(menu.getByRole('menuitem', { name: 'Đăng xuất' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('vi');
});
