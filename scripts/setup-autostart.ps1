
# ==============================================================================
# TechOps — Auto-start Docker containers on Windows boot
# Chạy script này 1 lần với quyền Administrator
# ==============================================================================

# Dynamic path — chạy script từ folder dự án thực tế
$scriptDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$composeDir  = $scriptDir
$taskName    = "TechOps-Docker-AutoStart"
$logFile     = Join-Path $composeDir "autostart.log"
$scriptPath  = Join-Path $composeDir "autostart-docker.ps1"

# Xóa task cũ nếu có
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Da xoa task cu: $taskName"
}

# Verify autostart-docker.ps1 ton tai
if (-not (Test-Path $scriptPath)) {
    Write-Host "LOI: Khong tim thay $scriptPath" -ForegroundColor Red
    exit 1
}

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
