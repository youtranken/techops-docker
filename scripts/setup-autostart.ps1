
# ==============================================================================
# TechOps — Auto-start Docker containers on Windows boot
# Chạy script này 1 lần với quyền Administrator
# ==============================================================================

$composeDir  = "E:\techops-docker"
$taskName    = "TechOps-Docker-AutoStart"
$logFile     = "E:\techops-docker\autostart.log"

# Xóa task cũ nếu có
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Da xoa task cu: $taskName"
}

# Script thực thi — chờ Docker sẵn sàng rồi mới compose up
$scriptContent = @"
`$log = "$logFile"
`$compose = "$composeDir"

Add-Content `$log "`n[`$(Get-Date)] Windows khoi dong, dang cho Docker..."

# Cho Docker Engine khoi dong (toi da 120 giay)
`$timeout = 120
`$elapsed = 0
while (`$elapsed -lt `$timeout) {
    `$status = docker info 2>`$null
    if (`$LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 5
    `$elapsed += 5
}

if (`$LASTEXITCODE -ne 0) {
    Add-Content `$log "[`$(Get-Date)] LOI: Docker chua san sang sau `$timeout giay"
    exit 1
}

Add-Content `$log "[`$(Get-Date)] Docker san sang. Dang chay compose up..."
Set-Location `$compose
docker compose up -d 2>&1 | Add-Content `$log
Add-Content `$log "[`$(Get-Date)] Hoan tat."
"@

$scriptPath = "E:\techops-docker\autostart-docker.ps1"
Set-Content -Path $scriptPath -Value $scriptContent -Encoding UTF8
Write-Host "Da tao script: $scriptPath"

# Action: chạy PowerShell script
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

# Trigger: khi hệ thống boot (không cần login)
$trigger = New-ScheduledTaskTrigger -AtStartup

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 2) `
    -StartWhenAvailable

# Đăng ký task chạy với SYSTEM (không cần login)
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -User "SYSTEM" `
    -Force

Write-Host ""
Write-Host "=== HOAN TAT ===" -ForegroundColor Green
Write-Host "Task: $taskName"
Write-Host "Script: $scriptPath"
Write-Host "Log: $logFile"
Write-Host ""
Write-Host "Kiem tra task:" -ForegroundColor Yellow
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
