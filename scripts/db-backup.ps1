# ============================================================================
#  TechOps Full Backup Script (Windows PowerShell)
#  Chay tren may PROD Windows: dump DB Postgres + zip uploads folder ra Desktop.
#
#  Usage:
#    .\scripts\db-backup.ps1
#    .\scripts\db-backup.ps1 -BackupDir "D:\backups"
#    .\scripts\db-backup.ps1 -Container "mydb" -DbName "mydb"
#
#  Neu PowerShell chan execution policy, chay:
#    powershell -ExecutionPolicy Bypass -File .\scripts\db-backup.ps1
#
#  Output mac dinh tai %USERPROFILE%\Desktop\techops-backups\:
#    - techops_YYYYMMDD_HHMMSS.dump        (database)
#    - techops_YYYYMMDD_HHMMSS_uploads.zip (avatars + task/report attachments)
# ============================================================================
param(
    [string]$Container = "techops-db",
    [string]$DbUser    = "techops",
    [string]$DbName    = "techops_db",
    [string]$BackupDir = ""
)

# Default output: Desktop\techops-backups\
if ([string]::IsNullOrEmpty($BackupDir)) {
    $BackupDir = Join-Path $env:USERPROFILE "Desktop\techops-backups"
}

# Verify container running
$running = docker ps --filter "name=^$Container$" --format "{{.Names}}" 2>$null
if ($running -ne $Container) {
    Write-Host "[ERROR] Container '$Container' khong chay." -ForegroundColor Red
    Write-Host "        Kiem tra: docker ps"
    exit 1
}

# Tao folder backup
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$fileName  = "techops_$timestamp.dump"
$outFile   = Join-Path $BackupDir $fileName
$tmpInside = "/tmp/$fileName"

# Project root + uploads folder (file vat ly: avatars + attachments)
$projectRoot = Split-Path -Parent $PSScriptRoot
$uploadsDir  = Join-Path $projectRoot "uploads"
$uploadsZip  = Join-Path $BackupDir "techops_${timestamp}_uploads.zip"

Write-Host "================================================================"
Write-Host "  TechOps Full Backup (DB + uploads)" -ForegroundColor Cyan
Write-Host "================================================================"
Write-Host "  Container   : $Container"
Write-Host "  Database    : $DbName"
Write-Host "  User        : $DbUser"
Write-Host "  Uploads dir : $uploadsDir"
Write-Host "  Output DB   : $outFile"
Write-Host "  Output ZIP  : $uploadsZip"
Write-Host "----------------------------------------------------------------"

# Dump trong container (tranh PowerShell encoding lam hong binary)
Write-Host "-> [1/4] Dumping database trong container..."
docker exec $Container pg_dump `
    -U $DbUser `
    -d $DbName `
    -F c `
    --no-owner `
    --no-acl `
    -f $tmpInside

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] pg_dump that bai (exit code $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

# Copy file tu container ra host
Write-Host "-> [2/4] Copy DB file ra '$outFile'..."
docker cp "${Container}:${tmpInside}" $outFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] docker cp that bai" -ForegroundColor Red
    exit 1
}

# Cleanup file tam trong container
docker exec $Container rm -f $tmpInside | Out-Null

# Verify DB file
Write-Host "-> [3/4] Verify DB file..."
if (-not (Test-Path $outFile)) {
    Write-Host "[ERROR] File backup khong ton tai sau cp" -ForegroundColor Red
    exit 1
}
$size = (Get-Item $outFile).Length
if ($size -eq 0) {
    Write-Host "[ERROR] File backup trong (0 bytes)" -ForegroundColor Red
    Remove-Item $outFile
    exit 1
}
$sizeMB = [math]::Round($size / 1MB, 2)
$sizeStr = if ($sizeMB -ge 1) { "$sizeMB MB" } else { "$([math]::Round($size / 1KB, 1)) KB" }

# Zip uploads folder (avatars + task/report attachments)
Write-Host "-> [4/4] Zip uploads folder..."
if (Test-Path $uploadsDir) {
    $hasFiles = (Get-ChildItem -Path $uploadsDir -Recurse -File -ErrorAction SilentlyContinue).Count
    if ($hasFiles -gt 0) {
        Compress-Archive -Path "$uploadsDir\*" -DestinationPath $uploadsZip -Force
        $zipSizeMB = [math]::Round((Get-Item $uploadsZip).Length / 1MB, 2)
        Write-Host "   [OK] Uploads zip: $zipSizeMB MB ($hasFiles files)"
    } else {
        Write-Host "   [SKIP] Uploads folder rong - khong tao zip"
    }
} else {
    Write-Host "   [SKIP] Uploads folder khong ton tai - khong tao zip"
}

Write-Host ""
Write-Host "[OK] Backup hoan tat:" -ForegroundColor Green
Write-Host "   - DB     : $outFile ($sizeStr)"
if (Test-Path $uploadsZip) {
    Write-Host "   - Uploads: $uploadsZip"
}
Write-Host ""
Write-Host "================================================================"
Write-Host "  Buoc tiep theo - copy CA 2 file sang may DEV va restore"
Write-Host "================================================================"
Write-Host ""
Write-Host "1. Copy 2 file qua USB / Google Drive / network share:"
Write-Host "   - $fileName"
if (Test-Path $uploadsZip) {
    Write-Host "   - techops_${timestamp}_uploads.zip"
}
Write-Host ""
Write-Host "2. Tren may DEV - de 2 file vao CUNG folder, sau do chay:"
Write-Host "   cd E:\PMH\techops_docker\techops-docker"
Write-Host "   .\scripts\db-restore.ps1 -DumpFile `"path\to\$fileName`""
Write-Host ""
Write-Host "   (Script tu tim file zip uploads cung folder)"
Write-Host "================================================================"
