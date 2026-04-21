#!/bin/sh
set -e

echo "================================================"
echo "  TechOps — Production Startup"
echo "================================================"

# ── Bước 0: Chờ Postgres ready (D5) ───────────────────────────
# Parse DATABASE_URL để lấy host/port/user/db (ưu tiên POSTGRES_* vars nếu có)
DB_HOST="${POSTGRES_HOST:-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-techops}"
DB_NAME="${POSTGRES_DB:-techops_db}"

echo ""
echo "→ [0/3] Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
WAIT_TIMEOUT=60
WAITED=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  if [ "$WAITED" -ge "$WAIT_TIMEOUT" ]; then
    echo "❌ Postgres không sẵn sàng sau ${WAIT_TIMEOUT}s — abort"
    exit 1
  fi
  sleep 2
  WAITED=$((WAITED + 2))
done
echo "✅ Postgres ready (waited ${WAITED}s)"

# ── Bước 1: Apply migrations (D4) ──────────────────────────────
# prisma migrate deploy: chạy migration files đã version (production-safe)
# Khác db push: không tự sync schema, không tự drop column
echo ""
echo "→ [1/3] Applying database migrations (prisma migrate deploy)..."
npx prisma migrate deploy
echo "✅ Migrations applied"

# ── Bước 2: Seed dữ liệu mặc định nếu chưa có ─────────────────
echo ""
echo "→ [2/3] Checking initial data (seed)..."

# Kiểm tra bảng User đã có dữ liệu chưa — nếu chưa thì seed
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "   → Không có user, đang seed dữ liệu mặc định..."
  tsx prisma/seed.ts
  echo "✅ Seed hoàn tất"
else
  echo "✅ Đã có $USER_COUNT user, bỏ qua seed"
fi

# ── Bước 3: Khởi động Next.js Production Server ────────────────
echo ""
echo "→ [3/3] Starting Next.js production server..."
echo "================================================"
exec node server.js
