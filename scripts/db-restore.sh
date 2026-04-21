#!/bin/sh
# ============================================================================
#  TechOps DB Restore Script
#  Chạy trên máy DEV: drop DB cũ, restore từ file .dump của PROD,
#  apply migration mới (statusBeforeCancel) nếu prod chưa có.
#
#  Usage:
#    sh scripts/db-restore.sh techops_20260420_131551.dump
#    sh scripts/db-restore.sh /full/path/to/file.dump
#
#  ⚠️  CẢNH BÁO: lệnh này SẼ XÓA toàn bộ data DEV hiện tại!
# ============================================================================
set -e

if [ -z "$1" ]; then
  echo "❌ Thiếu tên file dump."
  echo "   Usage: sh scripts/db-restore.sh <filename.dump>"
  echo ""
  echo "   File trong ./backups/:"
  ls -1 ./backups/*.dump 2>/dev/null || echo "   (chưa có file nào)"
  exit 1
fi

# Resolve file path: nếu chỉ tên file → giả định trong ./backups/
if [ -f "$1" ]; then
  DUMP_FILE="$1"
elif [ -f "./backups/$1" ]; then
  DUMP_FILE="./backups/$1"
else
  echo "❌ Không tìm thấy file: $1"
  exit 1
fi

CONTAINER="${DB_CONTAINER:-techops-db}"
DB_USER="${POSTGRES_USER:-techops}"
DB_NAME="${POSTGRES_DB:-techops_db}"
MIGRATION_NAME="20260420131900_remove_soft_delete_add_status_before_cancel"

echo "════════════════════════════════════════════════════════════════"
echo "  TechOps DB Restore (DEV environment)"
echo "════════════════════════════════════════════════════════════════"
echo "  File      : ${DUMP_FILE}"
echo "  Container : ${CONTAINER}"
echo "  Database  : ${DB_NAME}"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "⚠️  CẢNH BÁO: Toàn bộ data DEV trong DB '${DB_NAME}' SẼ BỊ XÓA."
echo "    Backup DEV trước (Y) hoặc tiếp tục restore (N)?"
printf "    Backup DEV trước? [Y/n] "
read -r BACKUP_FIRST
if [ -z "$BACKUP_FIRST" ] || [ "$BACKUP_FIRST" = "Y" ] || [ "$BACKUP_FIRST" = "y" ]; then
  echo "→ Backup DEV trước khi restore..."
  sh scripts/db-backup.sh
  echo ""
fi

printf "Tiếp tục restore? [y/N] "
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Hủy bỏ."
  exit 0
fi

# ── Stop app để tránh active connection chặn DROP ──────────────────────────
echo ""
echo "→ [1/6] Stop app container..."
docker compose stop app 2>/dev/null || echo "   (app đã stop hoặc không tồn tại)"

# ── Drop + recreate DB ─────────────────────────────────────────────────────
echo ""
echo "→ [2/6] Drop + recreate database..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" >/dev/null
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"${DB_NAME}\";" >/dev/null
echo "   ✅ Database '${DB_NAME}' recreated"

# ── Restore từ dump ─────────────────────────────────────────────────────────
echo ""
echo "→ [3/6] Restoring data from ${DUMP_FILE}..."
cat "$DUMP_FILE" | docker exec -i "$CONTAINER" pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --verbose 2>&1 | tail -10
echo "   ✅ Restore data xong"

# ── Apply migration mới (nếu prod chưa có statusBeforeCancel) ──────────────
echo ""
echo "→ [4/6] Apply migration ${MIGRATION_NAME} (nếu cần)..."

# Check schema state — nếu vẫn có cột isDeleted thì apply migration manual
HAS_ISDELETED=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='Task' AND column_name='isDeleted';" 2>/dev/null || echo "0")

if [ "$HAS_ISDELETED" = "1" ]; then
  echo "   → Detected legacy schema (có isDeleted) → apply migration..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    DROP INDEX IF EXISTS \"Task_isDeleted_status_idx\";
    ALTER TABLE \"Task\"
      DROP COLUMN IF EXISTS \"deletedAt\",
      DROP COLUMN IF EXISTS \"isDeleted\",
      ADD COLUMN IF NOT EXISTS \"statusBeforeCancel\" \"TaskStatus\";
    ALTER TABLE \"UserProfile\" ALTER COLUMN \"timezone\" SET DEFAULT 'Asia/Bangkok';
  " >/dev/null
  # Mark migration applied trong _prisma_migrations
  docker compose run --rm --entrypoint sh app -c \
    "npx prisma migrate resolve --applied ${MIGRATION_NAME}" 2>&1 | tail -3
  echo "   ✅ Migration applied + marked"
else
  echo "   ✅ Schema đã mới (không có isDeleted) — skip"
fi

# ── Sync các cột/bảng mới chưa có trong DB prod (digestCategories, ...) ────
echo ""
echo "→ [5/7] Sync schema (prisma db push)..."
docker compose run --rm --entrypoint sh app -c \
  "npx prisma db push --skip-generate --accept-data-loss" 2>&1 | tail -5
echo "   ✅ Schema synced với code"

# ── Restore uploads (avatars + task/report attachments) từ tar.gz cùng folder
echo ""
echo "→ [6/7] Restore uploads..."
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
DUMP_DIR=$(dirname "$DUMP_FILE")
DUMP_BASE=$(basename "$DUMP_FILE" .dump)
UPLOADS_FILE="${DUMP_DIR}/${DUMP_BASE}_uploads.tar.gz"

if [ -f "$UPLOADS_FILE" ]; then
  echo "   → Xóa nội dung uploads cũ..."
  rm -rf "${PROJECT_ROOT}/uploads"/* 2>/dev/null || true
  mkdir -p "${PROJECT_ROOT}/uploads"
  tar -xzf "$UPLOADS_FILE" -C "$PROJECT_ROOT"
  UCOUNT=$(find "${PROJECT_ROOT}/uploads" -type f 2>/dev/null | wc -l | awk '{print $1}')
  echo "   ✅ Extract ${UCOUNT} files vào uploads/"
else
  echo "   ⏭️  Không tìm thấy '${UPLOADS_FILE}'"
  echo "      (Avatar + file đính kèm của user prod sẽ không load được)"
fi

# ── Restart app ─────────────────────────────────────────────────────────────
echo ""
echo "→ [7/7] Start app container..."
docker compose up -d app 2>&1 | tail -3
sleep 8
docker compose logs app 2>&1 | tail -5

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Restore hoàn tất"
echo "════════════════════════════════════════════════════════════════"
echo "  Test app: http://localhost:3000"
echo ""
echo "  Lưu ý cho task CANCELLED restore từ prod:"
echo "  - prod chưa có 'statusBeforeCancel' → các task CANCELLED cũ"
echo "    không restore được (UI sẽ báo CANNOT_RESTORE). Đây là expected."
echo "  - Nếu muốn enable restore cho task cũ, chạy SQL:"
echo "    UPDATE \"Task\" SET \"statusBeforeCancel\"='WAITING_ACKNOWLEDGE'"
echo "    WHERE status='CANCELLED' AND \"statusBeforeCancel\" IS NULL;"
echo "════════════════════════════════════════════════════════════════"
