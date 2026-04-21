# Dynamic path — script chạy từ folder cài đặt thực tế (không hard-code drive letter)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $scriptDir "autostart.log"
$compose = $scriptDir

Add-Content $log "
[$(Get-Date)] Windows khoi dong, dang cho Docker..."

# Cho Docker Engine khoi dong (toi da 120 giay)
$timeout = 120
$elapsed = 0
while ($elapsed -lt $timeout) {
    $status = docker info 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 5
    $elapsed += 5
}

if ($LASTEXITCODE -ne 0) {
    Add-Content $log "[$(Get-Date)] LOI: Docker chua san sang sau $timeout giay"
    exit 1
}

Add-Content $log "[$(Get-Date)] Docker san sang. Dang chay compose up..."
Set-Location $compose
docker compose up -d 2>&1 | Add-Content $log
Add-Content $log "[$(Get-Date)] Hoan tat."
