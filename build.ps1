$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Building Poison Chrome compatibility package..." -ForegroundColor Cyan
Write-Host "Root: $root" -ForegroundColor Gray

$tempDir = Join-Path $root "build"
$outDir = Join-Path $root "dist"

if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }

[void](New-Item -ItemType Directory -Path $tempDir, $outDir -Force)

$items = @("background.js", "contentScript.js", "pageScript.js", "popup.html", "popup.js", "styles.css")

# Chrome
$chDir = Join-Path $tempDir "ch"
[void](New-Item -ItemType Directory -Path $chDir -Force)
foreach ($item in $items) {
    Copy-Item -Path (Join-Path $root $item) -Destination $chDir
}
$chromeLogo = Join-Path $root "Logo-Chrome.png"
if (Test-Path $chromeLogo) {
    Copy-Item -Path $chromeLogo -Destination (Join-Path $chDir "logo-poison.png")
} else {
    Copy-Item -Path (Join-Path $root "logo-poison.png") -Destination (Join-Path $chDir "logo-poison.png")
}
Copy-Item -Path (Join-Path $root "filters") -Destination $chDir -Recurse
Copy-Item -Path (Join-Path $root "manifest.json") -Destination $chDir
Copy-Item -Path (Join-Path $root "rules_1.json") -Destination $chDir
Copy-Item -Path (Join-Path $root "rules_2.json") -Destination $chDir

$chZip = Join-Path $outDir "poison-chrome.zip"
Remove-Item $chZip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $chDir "*") -DestinationPath $chZip -Force
Write-Host "OK Chrome ZIP" -ForegroundColor Green

Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Complete! Files in: $outDir" -ForegroundColor Cyan
