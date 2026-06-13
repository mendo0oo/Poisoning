$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileDir = Join-Path $root ".firefox-test-profile"
$serverScript = Join-Path $root "test-lab\server.js"
$port = if ($env:POISON_LAB_PORT) { [int]$env:POISON_LAB_PORT } else { 8787 }
$url = "http://127.0.0.1:$port"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to run the localhost test lab."
}

if (-not (Test-Path $serverScript)) {
    throw "Missing test lab server: $serverScript"
}

New-Item -ItemType Directory -Path $profileDir -Force | Out-Null

$userJs = @"
user_pref("xpinstall.signatures.required", false);
user_pref("extensions.install.requireBuiltInCerts", false);
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
user_pref("devtools.chrome.enabled", true);
user_pref("devtools.debugger.remote-enabled", true);
user_pref("privacy.resistFingerprinting", false);
user_pref("media.peerconnection.enabled", true);
user_pref("network.http.referer.XOriginPolicy", 0);
"@
Set-Content -Path (Join-Path $profileDir "user.js") -Value $userJs -Encoding ASCII

$firefoxCandidates = @(
    "$env:ProgramFiles\Firefox Developer Edition\firefox.exe",
    "$env:ProgramFiles\Mozilla Firefox\firefox.exe",
    "${env:ProgramFiles(x86)}\Mozilla Firefox\firefox.exe"
) | Where-Object { $_ -and (Test-Path $_) }

if ($firefoxCandidates.Count -eq 0) {
    $cmd = Get-Command firefox.exe -ErrorAction SilentlyContinue
    if ($cmd) {
        $firefoxCandidates = @($cmd.Source)
    }
}

if ($firefoxCandidates.Count -eq 0) {
    throw "Could not find Firefox. Install Firefox Developer Edition or add firefox.exe to PATH."
}

$firefox = [string]$firefoxCandidates[0]
$env:PORT = [string]$port

Write-Host "Starting Poison test lab on $url" -ForegroundColor Cyan
$server = $null
try {
    $existing = Invoke-WebRequest -Uri "$url/events" -UseBasicParsing -TimeoutSec 2
    if ($existing.StatusCode -eq 200) {
        Write-Host "Lab server already responding on $url" -ForegroundColor Green
    }
} catch {
    $server = Start-Process -FilePath "node" -ArgumentList @($serverScript) -WorkingDirectory $root -PassThru -WindowStyle Hidden
    Start-Sleep -Milliseconds 800
}

Write-Host "Opening Firefox test profile: $profileDir" -ForegroundColor Cyan
Write-Host "Load extension from about:debugging:" -ForegroundColor Yellow
Write-Host "  Hybrid: vendor\uBlock\dist\build\uBlock0.firefox\manifest.json" -ForegroundColor Yellow
Write-Host "  Poison only: firefox\manifest.json" -ForegroundColor Yellow

$firefoxArgs = "-no-remote -profile `"$profileDir`" `"about:debugging#/runtime/this-firefox`" `"$url`""
try {
    Start-Process -FilePath $firefox -ArgumentList $firefoxArgs
} catch {
    Write-Host "Start-Process failed, using cmd.exe launcher fallback." -ForegroundColor Yellow
    $cmdArgs = "/c start `"`" `"$firefox`" -no-remote -profile `"$profileDir`" `"about:debugging#/runtime/this-firefox`" `"$url`""
    Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -WindowStyle Hidden
}

if ($server) {
    Write-Host "Server PID: $($server.Id)" -ForegroundColor Gray
    Write-Host "Stop it later with: Stop-Process -Id $($server.Id)" -ForegroundColor Gray
} else {
    Write-Host "Server was already running. Find it with: Get-Process node" -ForegroundColor Gray
}
