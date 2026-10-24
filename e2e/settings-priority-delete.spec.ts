/**
 * E2E — V2 A1-2: xoá mức ưu tiên qua hộp xác nhận mới (thay window.confirm).
 * Hành vi giữ như V1: hỏi → chỉ khi đồng ý mới xoá. "Đóng" / Esc → không xoá.
 * Dữ liệu tiền tố [E2E]; dọn ở cuối test và ở globalTeardown.
 */
import { test, expect } from '@playwright/test';
import { login, api } from './helpers/auth';
import { E2E_USERS } from './helpers/db';

const RUN = Date.now().toString(36);
const NAME = `[E2E] Ưu tiên ${RUN}`;

type Priority = { id: string; name: string };

test('Xoá mức ưu tiên: Đóng/Esc giữ nguyên, Xóa mới xoá', async ({ page }) => {
  await login(page, E2E_USERS.boss.username);

  const created = await api<Priority>(page, '/api/settings/priorities', 'POST', { name: NAME, color: '#0E8FB0', level: 1, isDefault: false });
  expect(created.status, JSON.stringify(created.json)).toBeLessThan(300);

  try {
    let deleteCalls = 0;
    page.on('request', (r) => { if (r.method() === 'DELETE' && r.url().includes('/api/settings/priorities/')) deleteCalls++; });
    // window.confirm cũ không được bật nữa
    page.on('dialog', (d) => { throw new Error(`window dialog bất ngờ: ${d.message()}`); });

    await page.goto('/settings/priorities');
    const row = page.getByTestId('pri-table').getByRole('row').filter({ hasText: NAME });
    await expect(row).toBeVisible();
    const del = page.getByRole('button', { name: `Xoá “${NAME}”` });

    // 1) Đóng → không xoá
    await del.click();
    const dlg = page.getByRole('alertdialog');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText(`Xoá “${NAME}”?`);
    await dlg.getByRole('button', { name: 'Đóng' }).click();
    await expect(dlg).toBeHidden();
    await expect(row).toBeVisible();

    // 2) Esc → không xoá, focus trả về nút xoá
    await del.click();
    await expect(dlg).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(del).toBeFocused();
    expect(deleteCalls).toBe(0);

    // 3) Xóa → gọi DELETE, dòng biến mất
    await del.click();
    await dlg.getByRole('button', { name: 'Xoá', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(row).toHaveCount(0);
    expect(deleteCalls).toBe(1);

    const list = await api<Priority[]>(page, '/api/settings/priorities');
    expect(list.json.some((p) => p.name === NAME)).toBe(false);
  } finally {
    // dọn nếu test dừng giữa chừng
    const list = await api<Priority[]>(page, '/api/settings/priorities');
    const left = list.json?.find((p) => p.name === NAME);
    if (left) await api(page, `/api/settings/priorities/${left.id}`, 'DELETE');
  }
});
