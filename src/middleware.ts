import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse, NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

// CSP: chặn load script/resource từ domain ngoài → ngăn popup quảng cáo, cờ bạc, xxx
// 'unsafe-inline' cần cho Next.js hydration nhưng vẫn chặn external src
// S1: 'unsafe-eval' chỉ cho dev (Next.js HMR), prod bỏ để tăng cường XSS protection
const IS_DEV = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = {
  'Strict-Transport-Security': process.env.NODE_ENV === 'production' ? 'max-age=31536000; includeSubDomains' : '',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CSP,
} as const;

function withSecurityHeaders(res: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => { if (v) res.headers.set(k, v); });
  return res;
}

function csrfCheck(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  // Chỉ kiểm tra API mutation — bỏ qua auth, webhook helpdesk (có thể gọi từ external)
  const skipPrefixes = ['/api/auth', '/api/integrations/helpdesk'];
  if (!pathname.startsWith('/api/') || skipPrefixes.some((p) => pathname.startsWith(p))) return null;

  const method = req.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;

  const origin = req.headers.get('origin');
  if (!origin) return null; // Non-browser call (curl, Postman) — allow

  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!rawHost) return null;

  try {
    const effectiveHost = rawHost.split(',')[0].trim();
    if (new URL(origin).host !== effectiveHost) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Invalid origin' } },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Invalid origin' } },
      { status: 403 },
    );
  }
  return null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;

  // CSRF check — áp dụng trước auth để chặn sớm
  const csrfError = csrfCheck(req);
  if (csrfError) return withSecurityHeaders(csrfError);

  // Paths không cần đăng nhập — kể cả reset-password (dùng one-time token, không cần session)
  // /api/health: Docker HEALTHCHECK polling, không cần auth
  const publicPaths = ['/login', '/api/auth', '/api/health', '/_next', '/favicon.ico', '/reset-password'];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Nếu user cần đổi password lần đầu → buộc đến trang change-password
  // Cho phép gọi API đổi password, trang change-password, và reset-password (link từ email)
  const mustChange = req.auth?.user?.mustChangePassword;
  const allowedWhileMustChange = [
    '/change-password',
    '/api/settings/profile/change-password',
    '/api/auth/reset-password',
  ];
  if (mustChange && !allowedWhileMustChange.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  return withSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp|.*\\.ico).*)'],
};
