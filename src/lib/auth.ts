import NextAuth from 'next-auth';
import { maskAttemptedUsername } from './login-log';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { normalizeIp, lookupIpInfo } from '@/lib/ip-utils';
import {
  checkLoginLockout,
  recordFailedLogin,
  clearFailedLogins,
  getRateLimitIdentifier,
} from '@/lib/rate-limit';
import { isSessionExpired } from '@/lib/session-config';

const USER_ACTIVE_TTL = 30; // giây — cache isActive 30s, phù hợp với SLA deactivate

async function checkUserActive(userId: string): Promise<boolean> {
  const cacheKey = `user:active:${userId}`;
  // S2: fail-closed — DB là nguồn tin cậy. Redis chỉ là cache, lỗi cache vẫn query DB.
  // Nếu DB cũng lỗi → return false (kết thúc phiên) thay vì cho phép user bị deactivate
  // tiếp tục dùng app khi infra glitch.

  // Try cache trước (best-effort, lỗi thì skip)
  try {
    const cached = await getRedis().get(cacheKey);
    if (cached !== null) return cached === 'true';
  } catch {
    // Cache lỗi → vẫn query DB
  }

  // Query DB (nguồn tin cậy)
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
    const active = user?.isActive ?? false;
    // Best-effort write cache (lỗi thì bỏ qua)
    try { await getRedis().setex(cacheKey, USER_ACTIVE_TTL, active ? 'true' : 'false'); } catch { /* ignore */ }
    return active;
  } catch (err) {
    // DB lỗi → fail-closed: an toàn hơn cho phép user deactivated tiếp tục dùng
    console.error('[checkUserActive] DB error → fail-closed:', err);
    return false;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) return null;

        // Get identifier for lockout tracking (IP-based)
        const identifier = getRateLimitIdentifier(request);

        // Check if this IP is locked out due to too many failed attempts
        const lockout = await checkLoginLockout(identifier);
        if (lockout?.locked) {
          console.warn(`[auth] Login blocked - IP ${identifier} locked out for ${lockout.remainingSeconds}s`);
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
          include: { role: true },
        });

        // Lookup IP geo cho mọi LOGIN_FAILED — phát hiện brute-force ngoài/nội bộ
        const rawIp = request.headers.get('x-forwarded-for')
          || request.headers.get('x-real-ip')
          || identifier;
        const failedIp = normalizeIp(rawIp);
        const failedUserAgent = request.headers.get('user-agent') || 'unknown';

        if (!user || !user.isActive) {
          await recordFailedLogin(identifier);
          // Log DB với userId=null nếu username không tồn tại (sau migration nullable)
          try {
            const ipInfo = await lookupIpInfo(failedIp);
            await prisma.userActivityLog.create({
              data: {
                userId: user?.id ?? null,
                action: 'LOGIN_FAILED',
                ipAddress: failedIp,
                ipType: ipInfo.ipType,
                ispName: ipInfo.ispName,
                city: ipInfo.city,
                country: ipInfo.country,
                userAgent: failedUserAgent,
                metadata: {
                  reason: !user ? 'USER_NOT_FOUND' : 'USER_INACTIVE',
                  // Không tồn tại → che (có thể là mật khẩu gõ nhầm ô); tồn tại nhưng bị khoá → username thật
                  attemptedUsername: user ? user.username : maskAttemptedUsername(credentials.username),
                },
              },
            });
          } catch (e) {
            console.error('[auth] Failed to log LOGIN_FAILED (unknown user):', e);
          }
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) {
          const result = await recordFailedLogin(identifier);
          try {
            const ipInfo = await lookupIpInfo(failedIp);
            await prisma.userActivityLog.create({
              data: {
                userId: user.id,
                action: 'LOGIN_FAILED',
                ipAddress: failedIp,
                ipType: ipInfo.ipType,
                ispName: ipInfo.ispName,
                city: ipInfo.city,
                country: ipInfo.country,
                userAgent: failedUserAgent,
                metadata: {
                  reason: 'WRONG_PASSWORD',
                  attemptedUsername: user.username,
                  locked: result.locked,
                  attemptsRemaining: result.attemptsRemaining,
                },
              },
            });
          } catch (e) {
            console.error('[auth] Failed to log LOGIN_FAILED (wrong password):', e);
          }
          if (result.locked) {
            console.warn(`[auth] IP ${identifier} LOCKED OUT after failed attempts`);
          }
          return null;
        }

        // Successful login - clear any failed attempt counter
        await clearFailedLogins(identifier);

        // Log login activity (dedup: skip if same user+ip+ua logged in last 60s)
        try {
          const raw =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
          const ip = normalizeIp(raw);
          const userAgent = request.headers.get('user-agent') || 'unknown';
          const ipInfo = await lookupIpInfo(ip);
          const now = new Date();

          const sixtySecAgo = new Date(now.getTime() - 60_000);
          const recentLog = await prisma.userActivityLog.findFirst({
            where: {
              userId: user.id,
              action: 'LOGIN',
              ipAddress: ip,
              createdAt: { gte: sixtySecAgo },
            },
          });

          if (!recentLog) {
            await prisma.userActivityLog.create({
              data: {
                userId: user.id, action: 'LOGIN',
                ipAddress: ip, ipType: ipInfo.ipType,
                ispName: ipInfo.ispName, city: ipInfo.city,
                country: ipInfo.country, userAgent,
                metadata: { timestamp: now.toISOString() },
              },
            });
          }
        } catch (err) {
          console.error('[auth] Failed to log login:', err);
        }

        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: { id: user.role.id, name: user.role.name },
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
        token.displayName = (user as { displayName?: string }).displayName;
        token.role = (user as { role?: unknown }).role;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
        // Store issue time for dynamic session expiry check
        token.iat = Math.floor(Date.now() / 1000);
      }
      
      // Check dynamic session expiry from SecurityConfig
      if (token.iat && typeof token.iat === 'number') {
        try {
          const expired = await isSessionExpired(token.iat);
          if (expired) return { expired: true };
        } catch {
          return { expired: true };
        }
      }

      // Check isActive với Redis cache 30s (ngắt phiên khi user bị deactivate)
      if (typeof token.id === 'string') {
        const active = await checkUserActive(token.id);
        if (!active) return { expired: true };
      }

      return token;
    },
    async session({ session, token }) {
      // If token is marked as expired, return null session
      if ((token as { expired?: boolean }).expired) {
        return { ...session, user: undefined };
      }
      
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.displayName = token.displayName as string;
      session.user.role = token.role as { id: string; name: string };
      session.user.mustChangePassword = token.mustChangePassword as boolean | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Max age is a fallback - actual expiry is checked dynamically via SecurityConfig
    maxAge: parseInt(process.env.SESSION_MAX_AGE_HOURS || '72', 10) * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
});
