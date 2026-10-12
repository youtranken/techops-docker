import { expect, type Page } from '@playwright/test';
import { E2E_PASSWORD } from './db';

export async function login(page: Page, username: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

/** Gọi API từ trong trình duyệt (cùng origin + cookie phiên) */
export async function api<T = unknown>(page: Page, url: string, method = 'GET', body?: unknown): Promise<{ status: number; json: T }> {
  return page.evaluate(async ({ url, method, body }) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, { url, method, body }) as Promise<{ status: number; json: T }>;
}
