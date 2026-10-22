# update-techops.ps1 — Cập nhật TechOps trên Prod từ GitHub, CÓ SAO LƯU trước khi làm.
#   Kiểm repo sạch → xem trước commit/migration mới → backup DB + commit + .env → git pull --ff-only
#   → build + recreate app (container tự chạy prisma migrate deploy) → chờ /api/health = 200.
# Chạy (PowerShell, trong thư mục dự án):  powershell -ExecutionPolicy Bypass -File .\scripts\update-techops.ps1
# Tham số:  -Yes  (không hỏi xác nhận)   -BackupRoot E:\techops-backups   -Keep 10
param(
  [switch]$Yes,
  [string]$BackupRoot = 'E:\techops-backups',
  [int]$Keep = 10,
  [string]$HealthUrl = 'http://localhost:3000/api/health'
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "!! $msg" -ForegroundColor Red; exit 1 }
# Không đặt tên hàm là 'Git': PowerShell không phân biệt hoa/thường nên mọi lệnh `git` sẽ gọi lại
# chính hàm này -> đệ quy vô hạn (call depth overflow). Gọi thẳng git.exe.
function Invoke-GitChecked { & git.exe @args; if ($LASTEXITCODE -ne 0) { Fail "git $($args -join ' ') thất bại" } }

Step '[1/6] Kiểm repo sạch'
# Chỉ xét file đã theo dõi: uploads/, logs/ … là dữ liệu chạy thật (untracked) — git pull không đụng tới
$dirty = git status --porcelain --untracked-files=no
if ($dirty) { Write-Host $dirty; Fail "Có thay đổi chưa commit trong $Root — dừng (không sửa tay trên Prod). Xem: git status" }

Step '[2/6] Lấy thông tin từ GitHub'
Invoke-GitChecked fetch --quiet origin
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$old = (git rev-parse HEAD).Trim()
$new = (git rev-parse "origin/$branch").Trim()
if ($old -eq $new) { Write-Host "Đã ở bản mới nhất ($($old.Substring(0,7))). Không có gì để cập nhật."; exit 0 }
Write-Host "Commit sẽ cập nhật ($branch):"
git log --oneline "$old..$new"
$migrations = git diff --name-only --diff-filter=A "$old..$new" -- prisma/migrations
if ($migrations) {
  Write-Host "`nMIGRATION MỚI (sẽ tự chạy khi app khởi động):" -ForegroundColor Yellow
  $migrations | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
}
if (-not $Yes) {
  $ans = Read-Host "`nTiếp tục cập nhật? (y/N)"
  if ($ans -ne 'y') { Write-Host 'Huỷ.'; exit 0 }
}

Step '[3/6] Sao lưu DB + commit hiện tại + .env'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dir = Join-Path $BackupRoot $stamp
New-Item -ItemType Directory -Force -Path $dir | Out-Null
# pg_dump trong container rồi docker cp ra (tránh PowerShell làm hỏng dữ liệu nhị phân khi redirect)
docker exec techops-db sh -c 'pg_dump -U $POSTGRES_USER -d $POSTGRES_DB -Fc -f /tmp/techops-backup.dump'
if ($LASTEXITCODE -ne 0) { Fail 'pg_dump thất bại — KHÔNG cập nhật.' }
docker cp techops-db:/tmp/techops-backup.dump (Join-Path $dir 'db.dump')
if ($LASTEXITCODE -ne 0) { Fail 'Không chép được file dump — KHÔNG cập nhật.' }
docker exec techops-db rm -f /tmp/techops-backup.dump | Out-Null
$old | Set-Content -Encoding ascii (Join-Path $dir 'commit.txt')
if (Test-Path .env) { Copy-Item .env (Join-Path $dir '.env') }
$size = [math]::Round((Get-Item (Join-Path $dir 'db.dump')).Length / 1MB, 1)
Write-Host "    Backup: $dir (db.dump $size MB, commit $($old.Substring(0,7)))"
# Giữ $Keep bản gần nhất
Get-ChildItem $BackupRoot -Directory | Sort-Object Name -Descending | Select-Object -Skip $Keep |
  ForEach-Object { Remove-Item -Recurse -Force $_.FullName; Write-Host "    Xoá backup cũ: $($_.Name)" }

Step '[4/6] git pull --ff-only'
Invoke-GitChecked pull --ff-only --quiet origin $branch

Step '[5/6] Build + recreate app'
docker compose up -d --build app
if ($LASTEXITCODE -ne 0) {
  Fail "Build/khởi động lỗi. Quay lại: powershell -ExecutionPolicy Bypass -File .\scripts\rollback-techops.ps1 -BackupDir $dir"
}

Step '[6/6] Chờ /api/health'
$ok = $false
for ($i = 1; $i -le 40; $i++) {
  try { $code = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 $HealthUrl).StatusCode } catch { $code = 'x' }
  if ($code -eq 200) { $ok = $true; Write-Host '    health OK (200)'; break }
  Write-Host "    ...chờ (HTTP $code) $i/40"; Start-Sleep -Seconds 3
}
# Gộp stderr trong cmd: PowerShell 5.1 + ErrorActionPreference=Stop coi mọi dòng stderr của lệnh ngoài
# (vd 'npm notice') là lỗi và dừng script trước khi in XONG, dù deploy đã thành công.
cmd /c "docker logs techops-app 2>&1" | Select-String -Pattern 'migrat|Applying|error' | Select-Object -First 15
if (-not $ok) {
  Fail "Chưa đạt 200. Xem log: docker logs -f techops-app`n   Quay lại: powershell -ExecutionPolicy Bypass -File .\scripts\rollback-techops.ps1 -BackupDir $dir"
}
Write-Host "`nXONG: $($old.Substring(0,7)) -> $($new.Substring(0,7)). Backup: $dir" -ForegroundColor Green
