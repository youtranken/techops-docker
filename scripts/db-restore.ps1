# ============================================================================
#  TechOps DB Restore Script (Windows PowerShell)
#  Chay tren may DEV Windows: drop DB cu, restore tu file .dump cua PROD,
#  apply migration moi (statusBeforeCancel) neu prod chua co.
#
#  Usage:
#    .\scripts\db-restore.ps1 -DumpFile "C:\path\to\techops_xxx.dump"
#    .\scripts\db-restore.ps1 -DumpFile "techops_xxx.dump"  (tim trong .\backups\)
#
#  Neu PowerShell chan execution policy:
#    powershell -ExecutionPolicy Bypass -File .\scripts\db-restore.ps1 -DumpFile "..."
#
#  CANH BAO: lenh nay SE XOA toan bo data DEV hien tai!
# ============================================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$DumpFile,
    [string]$Container = "techops-db",
    [string]$DbUser    = "techops",
    [string]$DbName    = "techops_db"
)

$MIGRATION_NAME = "20260420131900_remove_soft_delete_add_status_before_cancel"

# Resolve file path: full path hoac trong .\backups\
if (Test-Path $DumpFile) {
    $resolvedFile = (Get-Item $DumpFile).FullName
} elseif (Test-Path ".\backups\$DumpFile") {
    $resolvedFile = (Get-Item ".\backups\$DumpFile").FullName
} else {
    Write-Host "[ERROR] Khong tim thay file: $DumpFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "File trong .\backups\:"
    if (Test-Path ".\backups") {
        Get-ChildItem ".\backups\*.dump" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $($_.Name)" }
    }
    exit 1
}

# Verify container running
$running = docker ps --filter "name=^$Container$" --format "{{.Names}}" 2>$null
if ($running -ne $Container) {
    Write-Host "[ERROR] Container '$Container' khong chay." -ForegroundColor Red
    Write-Host "        Chay: docker compose up -d db redis"
    exit 1
}

$fileName = Split-Path $resolvedFile -Leaf
$tmpInside = "/tmp/$fileName"

Write-Host "================================================================"
Write-Host "  TechOps DB Restore (DEV environment)" -ForegroundColor Cyan
Write-Host "================================================================"
Write-Host "  File      : $resolvedFile"
Write-Host "  Container : $Container"
Write-Host "  Database  : $DbName"
Write-Host "----------------------------------------------------------------"
Write-Host ""
Write-Host "[CANH BAO] Toan bo data DEV trong DB '$DbName' SE BI XOA." -ForegroundColor Yellow
Write-Host ""

# Hoi backup truoc
$backupFirst = Read-Host "Backup DEV truoc khi restore? [Y/n]"
if ([string]::IsNullOrEmpty($backupFirst) -or $backupFirst -eq "Y" -or $backupFirst -eq "y") {
    Write-Host "-> Backup DEV truoc..."
    & "$PSScriptRoot\db-backup.ps1"
    Write-Host ""
}

$confirm = Read-Host "Tiep tuc restore? Bam 'y' de xac nhan [y/N]"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Huy bo." -ForegroundColor Yellow
    exit 0
}

# Stop app
Write-Host ""
Write-Host "-> [1/6] Stop app container..."
docker compose stop app 2>&1 | Out-Null

# Drop + recreate DB
Write-Host "-> [2/6] Drop + recreate database '$DbName'..."
docker exec $Container psql -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS `"$DbName`";" 2>&1 | Out-Null
docker exec $Container psql -U $DbUser -d postgres -c "CREATE DATABASE `"$DbName`";" 2>&1 | Out-Null
Write-Host "   [OK] Database recreated"

# Copy dump file vao container (tranh PowerShell pipe binary)
Write-Host "-> [3/6] Copy dump file vao container..."
docker cp $resolvedFile "${Container}:${tmpInside}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] docker cp that bai" -ForegroundColor Red
    exit 1
}

# Restore tu file
Write-Host "-> [4/6] Restoring data..."
docker exec $Container pg_restore `
    -U $DbUser `
    -d $DbName `
    --no-owner `
    --no-acl `
    $tmpInside 2>&1 | Select-Object -Last 10

# Cleanup file tam trong container
docker exec $Container rm -f $tmpInside | Out-Null

# Auto-detect: neu prod con schema cu (co isDeleted) thi apply migration
Write-Host "-> [5/6] Apply migration moi (neu can)..."
$hasIsDeleted = docker exec $Container psql -U $DbUser -d $DbName -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='Task' AND column_name='isDeleted';" 2>$null

if ($hasIsDeleted -eq "1") {
    Write-Host "   -> Detected legacy schema (co isDeleted) -> apply migration..."
    $sql = @"
DROP INDEX IF EXISTS "Task_isDeleted_status_idx";
ALTER TABLE "Task"
  DROP COLUMN IF EXISTS "deletedAt",
  DROP COLUMN IF EXISTS "isDeleted",
  ADD COLUMN IF NOT EXISTS "statusBeforeCancel" "TaskStatus";
ALTER TABLE "UserProfile" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Bangkok';
"@
    docker exec $Container psql -U $DbUser -d $DbName -c $sql 2>&1 | Out-Null

    # Mark migration applied
    docker compose run --rm --entrypoint sh app -c "npx prisma migrate resolve --applied $MIGRATION_NAME" 2>&1 | Select-Object -Last 3
    Write-Host "   [OK] Migration applied + marked"
} else {
    Write-Host "   [OK] Schema da moi (khong co isDeleted) - skip"
}

# Sync cac cot/bang moi chua co trong DB prod (digestCategories, ...)
Write-Host "-> [6/7] Sync schema (prisma db push)..."
docker compose run --rm --entrypoint sh app -c "npx prisma db push --skip-generate --accept-data-loss" 2>&1 | Select-Object -Last 5
Write-Host "   [OK] Schema synced voi code"

# Restore uploads (avatars + task/report attachments) tu zip cung folder
Write-Host "-> [7/7] Restore uploads (avatars + attachments)..."
$dumpDir = Split-Path $resolvedFile -Parent
$dumpName = [IO.Path]::GetFileNameWithoutExtension($resolvedFile)  # techops_YYYYMMDD_HHMMSS
$uploadsZip = Join-Path $dumpDir "${dumpName}_uploads.zip"
$projectRoot = Split-Path -Parent $PSScriptRoot
$uploadsTarget = Join-Path $projectRoot "uploads"

if (Test-Path $uploadsZip) {
    if (Test-Path $uploadsTarget) {
        Write-Host "   -> Xoa noi dung uploads cu o '$uploadsTarget'..."
        Get-ChildItem -Path $uploadsTarget -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        New-Item -ItemType Directory -Path $uploadsTarget -Force | Out-Null
    }
    Expand-Archive -Path $uploadsZip -DestinationPath $uploadsTarget -Force
    $extractedCount = (Get-ChildItem -Path $uploadsTarget -Recurse -File).Count
    Write-Host "   [OK] Extract $extractedCount files vao uploads/"
} else {
    Write-Host "   [SKIP] Khong tim thay '$uploadsZip'"
    Write-Host "         (Avatar va file dinh kem cua user prod se khong load duoc)"
}

# Restart app
Write-Host ""
Write-Host "-> Start app container..."
docker compose up -d app 2>&1 | Select-Object -Last 3
Start-Sleep -Seconds 8
docker compose logs app 2>&1 | Select-Object -Last 5

Write-Host ""
Write-Host "================================================================"
Write-Host "  [OK] Restore hoan tat" -ForegroundColor Green
Write-Host "================================================================"
Write-Host "  Test app: http://localhost:3000"
Write-Host ""
Write-Host "  Luu y task CANCELLED restore tu prod:"
Write-Host "  - Prod chua co 'statusBeforeCancel' -> task CANCELLED cu"
Write-Host "    khong restore duoc (UI bao CANNOT_RESTORE). La expected."
Write-Host "  - Neu muon enable restore cho task cu, mo psql:"
Write-Host "      docker exec -it $Container psql -U $DbUser -d $DbName"
Write-Host "    Sau do paste lenh SQL sau (ket thuc bang dau cham phay):"
Write-Host '      UPDATE "Task" SET "statusBeforeCancel" = ''WAITING_ACKNOWLEDGE'' WHERE status = ''CANCELLED'' AND "statusBeforeCancel" IS NULL;'
Write-Host "================================================================"
