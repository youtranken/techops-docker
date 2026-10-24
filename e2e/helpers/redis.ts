import { execFileSync } from 'child_process';
import bcrypt from 'bcryptjs';
import { psql, E2E_PASSWORD } from './db';

/**
 * Lệnh Redis trên Docker local (`docker exec techops-redis redis-cli …`) — dùng cho E2E đăng nhập / mật khẩu:
 *  - dọn khoá giới hạn đăng nhập của RIÊNG IP giả E2E (`lockout:<ip>`, `failed_login:<ip>`),
 *  - tạo token đặt lại mật khẩu `pwd_reset:<token>` (như API send-reset-link V1 ghi).
 * Không đụng khoá của IP/người dùng khác.
 */
const CONTAINER = process.env.E2E_REDIS_CONTAINER ?? 'techops-redis';

export function redis(...args: string[]): string {
  return execFileSync('docker', ['exec', '-i', CONTAINER, 'redis-cli', ...args], { encoding: 'utf8' }).trim();
}

/** IP giả cho các lần đăng nhập E2E cố ý sai (V1 khoá theo IP: getRateLimitIdentifier đọc x-real-ip trước). Dải nội bộ → không tra cứu IP ra ngoài. */
export const E2E_AUTH_IP = '10.254.38.8';
export const E2E_AUTH_HEADERS = { 'x-real-ip': E2E_AUTH_IP, 'x-forwarded-for': E2E_AUTH_IP };

/** Xoá khoá khoá-đăng-nhập + giới hạn đặt lại mật khẩu (10 lần/15 phút) của RIÊNG IP giả E2E. */
export function clearLoginLock(ip = E2E_AUTH_IP) {
  redis('DEL', `lockout:${ip}`, `failed_login:${ip}`, `ratelimit:reset-password:${ip}`);
}

/** Tạo (hoặc làm mới) user [E2E] riêng cho luồng đăng nhập / mật khẩu. Tên phải nằm trong E2E_EXTRA_USERNAMES. */
export async function upsertAuthUser(username: string, opts: { mustChangePassword?: boolean; email?: string | null } = {}) {
  const hash = await bcrypt.hash(E2E_PASSWORD, 10);
  const id = ('ce2e' + username.replace(/[^a-z0-9]/gi, '') + '0'.repeat(25)).slice(0, 25).toLowerCase();
  const email = opts.email ? `'${opts.email}'` : 'NULL';
  psql(`DELETE FROM "UserActivityLog" WHERE "userId"='${id}';
    DELETE FROM "User" WHERE username='${username}';
    INSERT INTO "User"(id, username, password, "displayName", email, "roleId", "isActive", "mustChangePassword", "passwordChangedAt", "emailVerifiedAt", "createdAt", "updatedAt")
    SELECT '${id}', '${username}', '${hash}', '[E2E] ${username}', ${email}, r.id, true, ${opts.mustChangePassword ? 'true' : 'false'},
           now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
    FROM "Role" r WHERE r.name='EMPLOYEE';`);
  return id;
}
