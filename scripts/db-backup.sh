#!/bin/sh
# ============================================================================
#  TechOps DB Backup Script
#  Chạy trên máy PROD: dump toàn bộ DB Postgres trong container ra file .dump
#
#  Usage:
#    sh scripts/db-backup.sh
#    DB_CONTAINER=mydb sh scripts/db-backup.sh                 # override container
#    BACKUP_DIR=/path/to/backups sh scripts/db-backup.sh       # override output dir
#
#  Output: ./backups/techops_YYYYMMDD_HHMMSS.dump
#  Format: custom format (nén ~ 70%), portable giữa máy
# ============================================================================
set -e

CONTAINER="${DB_CONTAINER:-techops-db}"
DB_USER="${POSTGRES_USER:-techops}"
DB_NAME="${POSTGRES_DB:-techops_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# ── Verify container đang chạy ──────────────────────────────────────────────
if ! docker ps --filter "name=^${CONTAINER}$" --format "{{.Names}}" | grep -q "^${CONTAINER}$"; then
  echo "❌ Container '${CONTAINER}' không chạy."
  echo "   Kiểm tra: docker ps"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE="${BACKUP_DIR}/techops_${TIMESTAMP}.dump"
UPLOADS_FILE="${BACKUP_DIR}/techops_${TIMESTAMP}_uploads.tar.gz"

# Project root (cha cua scripts/)
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
UPLOADS_DIR="${PROJECT_ROOT}/uploads"

echo "════════════════════════════════════════════════════════════════"
echo "  TechOps Database Backup"
echo "════════════════════════════════════════════════════════════════"
echo "  Container : ${CONTAINER}"
echo "  Database  : ${DB_NAME}"
echo "  User      : ${DB_USER}"
echo "  Output    : ${OUTFILE}"
echo "────────────────────────────────────────────────────────────────"

# ── Dump (custom format, nén, no owner/acl để portable) ────────────────────
docker exec "$CONTAINER" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  --no-owner \
  --no-acl \
  > "$OUTFILE"

# ── Verify file ─────────────────────────────────────────────────────────────
if [ ! -s "$OUTFILE" ]; then
  echo "❌ File backup trống — pg_dump thất bại"
  rm -f "$OUTFILE"
  exit 1
fi

SIZE=$(du -h "$OUTFILE" | awk '{print $1}')
echo "✅ DB backup: ${OUTFILE} (${SIZE})"

# ── Tar uploads folder (avatars + task/report attachments) ──────────────────
echo ""
echo "→ Backup uploads folder..."
if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
  tar -czf "$UPLOADS_FILE" -C "$PROJECT_ROOT" uploads
  USIZE=$(du -h "$UPLOADS_FILE" | awk '{print $1}')
  UCOUNT=$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l | awk '{print $1}')
  echo "✅ Uploads backup: ${UPLOADS_FILE} (${USIZE}, ${UCOUNT} files)"
else
  echo "⏭️  Uploads folder rỗng/không tồn tại — skip"
  UPLOADS_FILE=""
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Bước tiếp theo — copy CẢ 2 file sang máy DEV và restore"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1. Copy 2 file sang DEV (vd qua scp / rsync / USB):"
echo "   scp ${OUTFILE} user@dev-machine:/path/to/techops-docker/backups/"
if [ -n "$UPLOADS_FILE" ]; then
  echo "   scp ${UPLOADS_FILE} user@dev-machine:/path/to/techops-docker/backups/"
fi
echo ""
echo "2. Trên DEV — để 2 file vào CÙNG folder, sau đó chạy:"
echo "   sh scripts/db-restore.sh ${OUTFILE##*/}"
echo "   (Script tự tìm file uploads .tar.gz cùng folder)"
echo ""
echo "════════════════════════════════════════════════════════════════"
