import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config — NO Node.js-only imports (no ioredis, no prisma, no bcrypt).
 * Used exclusively in middleware.ts which runs on Edge Runtime.
 * Full auth logic (rate limiting, DB queries) stays in auth.ts (Node.js runtime only).
 */
export const authConfig = {
  providers: [],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: parseInt(process.env.SESSION_MAX_AGE_HOURS || '72', 10) * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
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
} satisfies NextAuthConfig;
