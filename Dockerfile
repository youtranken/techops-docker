# ────────────────────────────────────────────────────────────────────────────────
# PRODUCTION DOCKERFILE - Optimized multi-stage build with BuildKit cache
# ────────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Production Dependencies ────────────────────────────────────────
FROM node:20-alpine AS deps
RUN --mount=type=cache,target=/var/cache/apk \
    apk add libc6-compat openssl
WORKDIR /app

# Bắt buộc: tắt download Chromium của puppeteer (~150MB) — không cần ở production
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ─── Stage 2: Build (full deps including devDeps for build tools) ─────────────
FROM node:20-alpine AS builder
RUN --mount=type=cache,target=/var/cache/apk \
    apk add libc6-compat openssl
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    PUPPETEER_SKIP_DOWNLOAD=true npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ─── Stage 3: Production Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN --mount=type=cache,target=/var/cache/apk \
    apk add libc6-compat openssl postgresql-client wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create uploads dir with correct ownership BEFORE switching to nextjs user
RUN mkdir -p /app/uploads/avatars && chown -R nextjs:nodejs /app/uploads

# Copy built Next.js app (standalone output)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy production dependencies (base first)
COPY --from=deps /app/node_modules ./node_modules

# Override Prisma client — MUST be after deps copy to avoid being overwritten
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Install tsx globally for seed execution
RUN --mount=type=cache,target=/root/.npm \
    npm install -g tsx

# Copy entrypoint and fix Windows CRLF line endings
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# D6: Healthcheck dùng wget (Alpine-friendly) — endpoint /api/health đã có
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health > /dev/null 2>&1 || exit 1

CMD ["/usr/local/bin/docker-entrypoint.sh"]
