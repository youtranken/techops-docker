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

# ── Bước 0b: Bổ sung intermediate cert cho Helpdesk API ───────
# Server Helpdesk (it.pmh.com.vn) không gửi kèm intermediate cert → Node fetch lỗi
# UNABLE_TO_VERIFY_LEAF_SIGNATURE. Tự tải intermediate theo AIA của cert server mỗi lần
# khởi động (tự theo kịp khi bên đó gia hạn/đổi cert). Lỗi → giữ cert dự phòng trong ./certs.
fetch_helpdesk_ca() {
  case "$HELPDESK_API_URL" in https://*) ;; *) return 1 ;; esac
  HD_HOSTPORT=$(echo "$HELPDESK_API_URL" | sed -E 's#^https://([^/?]+).*#\1#')
  HD_HOST=${HD_HOSTPORT%%:*}
  case "$HD_HOSTPORT" in *:*) ;; *) HD_HOSTPORT="$HD_HOSTPORT:443" ;; esac

  HD_AIA=$(echo | timeout 10 openssl s_client -connect "$HD_HOSTPORT" -servername "$HD_HOST" 2>/dev/null \
    | openssl x509 -noout -ext authorityInfoAccess 2>/dev/null \
    | sed -n 's/.*CA Issuers - URI:\(http[^ ]*\).*/\1/p' | head -1)
  [ -n "$HD_AIA" ] || return 1

  wget -qO /tmp/helpdesk-issuer.crt -T 10 "$HD_AIA" || return 1
  openssl x509 -inform DER -in /tmp/helpdesk-issuer.crt -out /tmp/helpdesk-issuer.pem 2>/dev/null \
    || openssl x509 -in /tmp/helpdesk-issuer.crt -out /tmp/helpdesk-issuer.pem 2>/dev/null \
    || return 1
}

if [ -n "$HELPDESK_API_URL" ]; then
  echo ""
  echo "→ [0b] Fetching Helpdesk intermediate cert..."
  if fetch_helpdesk_ca; then
    cat /tmp/helpdesk-issuer.pem > /tmp/extra-ca.pem
    [ -f "$NODE_EXTRA_CA_CERTS" ] && cat "$NODE_EXTRA_CA_CERTS" >> /tmp/extra-ca.pem
    export NODE_EXTRA_CA_CERTS=/tmp/extra-ca.pem
    echo "✅ Intermediate cert: $(openssl x509 -in /tmp/helpdesk-issuer.pem -noout -subject -enddate | tr '\n' ' ')"
  else
    echo "⚠️  Không tải được intermediate cert — dùng cert dự phòng: ${NODE_EXTRA_CA_CERTS:-(không có)}"
  fi
fi

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
