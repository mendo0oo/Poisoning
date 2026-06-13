$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Building Poison Identity..." -ForegroundColor Cyan
Write-Host "Root: $root" -ForegroundColor Gray

$tempDir = Join-Path $root "build"
$outDir = Join-Path $root "dist"

if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }

[void](New-Item -ItemType Directory -Path $tempDir, $outDir -Force)

$items = @("background.js", "contentScript.js", "pageScript.js", "popup.html", "popup.js", "styles.css", "logo-poison.png")

# Firefox
$ffDir = Join-Path $tempDir "ff"
[void](New-Item -ItemType Directory -Path $ffDir -Force)
foreach ($item in $items) {
    Copy-Item -Path (Join-Path $root $item) -Destination $ffDir
}
Copy-Item -Path (Join-Path $root "filters") -Destination $ffDir -Recurse
Copy-Item -Path (Join-Path $root "firefox\manifest.json") -Destination $ffDir

$ffZip = Join-Path $outDir "firefox.zip"
$ffXpi = Join-Path $outDir "poison-identity-firefox.xpi"
Compress-Archive -Path (Join-Path $ffDir "*") -DestinationPath $ffZip -Force
Rename-Item -Path $ffZip -NewName $ffXpi
Write-Host "OK Firefox XPI" -ForegroundColor Green

# Chrome  
$chDir = Join-Path $tempDir "ch"
[void](New-Item -ItemType Directory -Path $chDir -Force)
foreach ($item in $items) {
    Copy-Item -Path (Join-Path $root $item) -Destination $chDir
}
Copy-Item -Path (Join-Path $root "filters") -Destination $chDir -Recurse
Copy-Item -Path (Join-Path $root "manifest.json") -Destination $chDir
Copy-Item -Path (Join-Path $root "rules_1.json") -Destination $chDir
Copy-Item -Path (Join-Path $root "rules_2.json") -Destination $chDir

$chZip = Join-Path $outDir "poison-identity-chrome.zip"
Compress-Archive -Path (Join-Path $chDir "*") -DestinationPath $chZip -Force
Write-Host "OK Chrome ZIP" -ForegroundColor Green

Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Complete! Files in: $outDir" -ForegroundColor Cyan
