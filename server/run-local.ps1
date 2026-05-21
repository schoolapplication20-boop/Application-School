Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]*)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}

# Kill any existing process on port 8080
$existing = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
    Stop-Process -Id $existing.OwningProcess -Force
    Write-Host "Killed existing process on port 8080 (PID $($existing.OwningProcess))"
    Start-Sleep -Seconds 1
}

mvn org.springframework.boot:spring-boot-maven-plugin:3.2.0:run
