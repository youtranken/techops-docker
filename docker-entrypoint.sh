#!/bin/sh
set -e

echo "================================================"
echo "  TechOps — Production Startup"
echo "================================================"

# ── Bước 1: Đồng bộ Prisma schema → DB ─────────────────────────
echo ""
echo "→ [1/3] Syncing database schema (prisma db push)..."
npx prisma db push --accept-data-loss
echo "✅ Schema synced"

# ── Bước 2: Seed dữ liệu mặc định nếu chưa có ─────────────────
echo ""
echo "→ [2/3] Checking initial data (seed)..."

# Kiểm tra bảng User đã có dữ liệu chưa — nếu chưa thì seed
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "\$USER_COUNT" = "0" ]; then
  echo "   → Không có user, đang seed dữ liệu mặc định..."
  npx ts-node \
    --compiler-options '{\"module\":\"CommonJS\",\"types\":[\"node\"]}' \
    --skip-ignore \
    prisma/seed.ts
  echo "✅ Seed hoàn tất — Login: admin / admin123"
else
  echo "✅ Đã có $USER_COUNT user, bỏ qua seed"
fi

# ── Bước 3: Khởi động Next.js Production Server ────────────────
echo ""
echo "→ [3/3] Starting Next.js production server..."
echo "================================================"
exec node server.js
