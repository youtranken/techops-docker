# rollback-techops.ps1 — Quay TechOps về bản trước khi cập nhật, dùng thư mục backup của update-techops.ps1.
#   Mặc định: chỉ quay CODE về commit cũ + build lại (DB giữ nguyên — migration của dự án chỉ thêm mới
#   nên code cũ chạy được với DB mới).  -RestoreDb: khôi phục cả DB từ db.dump (MẤT dữ liệu phát sinh sau backup).
# Chạy:  powershell -ExecutionPolicy Bypass -File .\scripts\rollback-techops.ps1 -BackupDir E:\techops-backups\20261012-153000 [-RestoreDb]
param(
  [Parameter(Mandatory = $true)][string]$BackupDir,
  [switch]$RestoreDb
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Fail($msg) { Write-Host "!! $msg" -ForegroundColor Red; exit 1 }

$commitFile = Join-Path $BackupDir 'commit.txt'
if (-not (Test-Path $commitFile)) { Fail "Không thấy $commitFile" }
$commit = (Get-Content $commitFile -Raw).Trim()

Write-Host "Sẽ quay code về commit $($commit.Substring(0,7))$(if ($RestoreDb) { ' VÀ khôi phục DB từ db.dump' })." -ForegroundColor Yellow
if ($RestoreDb) { Write-Host 'CẢNH BÁO: mọi dữ liệu tạo SAU thời điểm backup sẽ mất.' -ForegroundColor Red }
if ((Read-Host 'Gõ YES để tiếp tục') -ne 'YES') { Write-Host 'Huỷ.'; exit 0 }

git reset --hard $commit
if ($LASTEXITCODE -ne 0) { Fail 'git reset thất bại' }

if ($RestoreDb) {
  $dump = Join-Path $BackupDir 'db.dump'
  if (-not (Test-Path $dump)) { Fail "Không thấy $dump" }
  docker compose stop app
  docker cp $dump techops-db:/tmp/restore.dump
  docker exec techops-db sh -c 'pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists --no-owner /tmp/restore.dump'
  if ($LASTEXITCODE -ne 0) { Write-Host '!! pg_restore báo lỗi — kiểm tra lại DB trước khi chạy app.' -ForegroundColor Red }
  docker exec techops-db rm -f /tmp/restore.dump | Out-Null
}

docker compose up -d --build app
Write-Host "Đã quay về $($commit.Substring(0,7)). Kiểm tra: http://localhost:3000/api/health" -ForegroundColor Green
