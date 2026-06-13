$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$uBlockDir = Join-Path $root "vendor\uBlock"
$outDir = Join-Path $root "dist"
$buildRoot = Join-Path $uBlockDir "dist\build"
$uAssetsDir = Join-Path $buildRoot "uAssets"

if (-not (Test-Path $uBlockDir)) {
    throw "Poison Hybrid backend source is missing. Expected: $uBlockDir"
}

function Copy-Dir {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )
    if (-not (Test-Path $Source)) {
        throw "Missing source directory: $Source"
    }
    Copy-Item -Path $Source -Destination $Destination -Recurse -Force
}

function Copy-File {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )
    if (-not (Test-Path $Source)) {
        throw "Missing source file: $Source"
    }
    Copy-Item -Path $Source -Destination $Destination -Force
}

function Ensure-UAssets {
    $mainDir = Join-Path $uAssetsDir "main"
    $prodDir = Join-Path $uAssetsDir "prod"
    if ((Test-Path $mainDir) -and (Test-Path $prodDir)) {
        return
    }

    Write-Host "Cloning filter assets for Poison Hybrid..." -ForegroundColor Cyan
    if (Test-Path $uAssetsDir) {
        Remove-Item -Path $uAssetsDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $uAssetsDir -Force | Out-Null
    git clone --depth 1 --branch master https://github.com/uBlockOrigin/uAssets $mainDir
    git clone --depth 1 --branch gh-pages https://github.com/uBlockOrigin/uAssets $prodDir
}

function Copy-UBlockAssets {
    param([Parameter(Mandatory = $true)][string]$BuildDir)

    $assetsOut = Join-Path $BuildDir "assets"
    if (Test-Path $assetsOut) {
        Remove-Item -Path $assetsOut -Recurse -Force
    }
    Copy-Dir -Source (Join-Path $uBlockDir "assets") -Destination $assetsOut

    $version = (Get-Content (Join-Path $uBlockDir "dist\version") -Raw).Trim()
    if ($version -match '^\d+\.\d+\.\d+$') {
        Remove-Item -Path (Join-Path $assetsOut "assets.dev.json") -Force -ErrorAction SilentlyContinue
    } else {
        Remove-Item -Path (Join-Path $assetsOut "assets.json") -Force -ErrorAction SilentlyContinue
    }

    $thirdparties = Join-Path $assetsOut "thirdparties"
    New-Item -ItemType Directory -Path $thirdparties -Force | Out-Null

    Copy-Dir -Source (Join-Path $uAssetsDir "main\thirdparties\pgl.yoyo.org") -Destination (Join-Path $thirdparties "pgl.yoyo.org")
    Copy-Dir -Source (Join-Path $uAssetsDir "main\thirdparties\publicsuffix.org") -Destination (Join-Path $thirdparties "publicsuffix.org")
    Copy-Dir -Source (Join-Path $uAssetsDir "main\thirdparties\urlhaus-filter") -Destination (Join-Path $thirdparties "urlhaus-filter")

    $easylistOut = Join-Path $thirdparties "easylist"
    New-Item -ItemType Directory -Path $easylistOut -Force | Out-Null
    Copy-File -Source (Join-Path $uAssetsDir "prod\thirdparties\easylist.txt") -Destination (Join-Path $easylistOut "easylist.txt")
    Copy-File -Source (Join-Path $uAssetsDir "prod\thirdparties\easyprivacy.txt") -Destination (Join-Path $easylistOut "easyprivacy.txt")

    $ublockOut = Join-Path $assetsOut "ublock"
    New-Item -ItemType Directory -Path $ublockOut -Force | Out-Null
    foreach ($file in @("badlists.txt", "badware.min.txt", "filters.min.txt", "privacy.min.txt", "quick-fixes.min.txt", "unbreak.min.txt")) {
        Copy-File -Source (Join-Path $uAssetsDir "prod\filters\$file") -Destination (Join-Path $ublockOut $file)
    }
}

function Copy-UBlockCommon {
    param([Parameter(Mandatory = $true)][string]$BuildDir)

    New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
    Copy-UBlockAssets -BuildDir $BuildDir

    Copy-Dir -Source (Join-Path $uBlockDir "src\css") -Destination (Join-Path $BuildDir "css")
    Copy-Dir -Source (Join-Path $uBlockDir "src\img") -Destination (Join-Path $BuildDir "img")
    New-Item -ItemType Directory -Path (Join-Path $BuildDir "js") -Force | Out-Null
    Copy-Item -Path (Join-Path $uBlockDir "src\js\*.js") -Destination (Join-Path $BuildDir "js") -Force
    foreach ($dir in @("resources", "codemirror", "scriptlets", "wasm")) {
        Copy-Dir -Source (Join-Path $uBlockDir "src\js\$dir") -Destination (Join-Path $BuildDir "js\$dir")
    }
    Copy-Dir -Source (Join-Path $uBlockDir "src\lib") -Destination (Join-Path $BuildDir "lib")
    Copy-Dir -Source (Join-Path $uBlockDir "src\web_accessible_resources") -Destination (Join-Path $BuildDir "web_accessible_resources")
    Copy-Dir -Source (Join-Path $uBlockDir "src\_locales") -Destination (Join-Path $BuildDir "_locales")
    Copy-Item -Path (Join-Path $uBlockDir "src\*.html") -Destination $BuildDir -Force
    Copy-Item -Path (Join-Path $uBlockDir "platform\common\*.js") -Destination (Join-Path $BuildDir "js") -Force
    Copy-Item -Path (Join-Path $uBlockDir "platform\common\*.json") -Destination $BuildDir -Force
    Copy-File -Source (Join-Path $uBlockDir "LICENSE.txt") -Destination (Join-Path $BuildDir "LICENSE.txt")
}

function Set-ManifestVersion {
    param([Parameter(Mandatory = $true)][string]$BuildDir)
    $manifestPath = Join-Path $BuildDir "manifest.json"
    $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
    $manifest.version = (Get-Content (Join-Path $uBlockDir "dist\version") -Raw).Trim()
    $manifest | ConvertTo-Json -Depth 100 | Set-Content -Path $manifestPath -Encoding UTF8
}

function Set-JsonProperty {
    param(
        [Parameter(Mandatory = $true)][object]$Object,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][object]$Value
    )
    if ($Object.PSObject.Properties.Name -contains $Name) {
        $Object.$Name = $Value
    } else {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
}

function Set-PoisonHybridLocaleBranding {
    param([Parameter(Mandatory = $true)][string]$BuildDir)

    Get-ChildItem -Path (Join-Path $BuildDir "_locales") -Recurse -Filter "messages.json" | ForEach-Object {
        $path = $_.FullName
        $text = Get-Content -LiteralPath $path -Raw
        $next = $text.
            Replace("uBlock Origin Lite", "Poison Hybrid").
            Replace("uBlock Origin", "Poison Hybrid").
            Replace("uBO Lite", "Poison Hybrid").
            Replace("uBO's", "Poison Hybrid's").
            Replace("uBO", "Poison Hybrid").
            Replace("uBlockâ‚€", "Poison Hybrid").
            Replace("uBlock₀", "Poison Hybrid").
            Replace("uBlock/wiki", "Poison-Hybrid/docs").
            Replace("Poison Hybrid has prevented the following page from loading:", "Poison Hybrid blocked this page before it could load:").
            Replace("Poison Hybrid has prevented the following page from loading.", "Poison Hybrid blocked this page before it could load.").
            Replace("Finally, an efficient blocker. Easy on CPU and memory.", "Poison Hybrid privacy engine with tracker blocking, popup hardening, and Poison Identity controls.")
        if ($next -ne $text) {
            Set-Content -LiteralPath $path -Value $next -Encoding UTF8
        }
    }
}

function Set-PoisonHybridHtmlBranding {
    param([Parameter(Mandatory = $true)][string]$BuildDir)

    $replacements = @{
        "uBlock Origin Background Page" = "Poison Hybrid Background Page"
        "uBO blank" = "Poison Hybrid blank"
        "uBlock Origin" = "Poison Hybrid"
        "uBlockâ‚€" = "Poison Hybrid"
        "uBlock₀" = "Poison Hybrid"
        "img/ublock.svg" = "poison/logo-poison.png"
    }

    Get-ChildItem -Path $BuildDir -Recurse -Include "*.html","*.css" -File | ForEach-Object {
        $path = $_.FullName
        $text = Get-Content -LiteralPath $path -Raw
        $next = $text
        foreach ($key in $replacements.Keys) {
            $next = $next.Replace($key, $replacements[$key])
        }
        if ($next -ne $text) {
            Set-Content -LiteralPath $path -Value $next -Encoding UTF8
        }
    }
}

function Build-UBlockPlatform {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("firefox", "chromium")][string]$Platform
    )

    $buildDir = Join-Path $buildRoot "PoisonHybrid.$Platform"
    if (Test-Path $buildDir) {
        Remove-Item -Path $buildDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

    Copy-UBlockCommon -BuildDir $buildDir

    if ($Platform -eq "firefox") {
        Copy-Item -Path (Join-Path $uBlockDir "platform\firefox\*.json") -Destination $buildDir -Force
        Copy-Item -Path (Join-Path $uBlockDir "platform\firefox\*.js") -Destination (Join-Path $buildDir "js") -Force
        Copy-Dir -Source (Join-Path $buildDir "_locales\nb") -Destination (Join-Path $buildDir "_locales\no")
        Remove-Item -Path (Join-Path $buildDir "img\icon_128.png") -Force -ErrorAction SilentlyContinue
    } else {
        Copy-Item -Path (Join-Path $uBlockDir "platform\chromium\*.js") -Destination (Join-Path $buildDir "js") -Force
        Copy-Item -Path (Join-Path $uBlockDir "platform\chromium\*.html") -Destination $buildDir -Force
        Copy-Item -Path (Join-Path $uBlockDir "platform\chromium\*.json") -Destination $buildDir -Force
        Copy-Dir -Source (Join-Path $buildDir "_locales\nb") -Destination (Join-Path $buildDir "_locales\no")
    }

    Set-ManifestVersion -BuildDir $buildDir
    return $buildDir
}

function Add-PoisonToUBlockBuild {
    param(
        [Parameter(Mandatory = $true)][string]$BuildDir,
        [Parameter(Mandatory = $true)][string]$Platform
    )

    $poisonDir = Join-Path $BuildDir "poison"
    New-Item -ItemType Directory -Path $poisonDir -Force | Out-Null
    Copy-File -Source (Join-Path $root "pageScript.js") -Destination (Join-Path $poisonDir "pageScript.js")
    Copy-File -Source (Join-Path $root "hybrid\poison-hybrid-content.js") -Destination (Join-Path $poisonDir "poison-hybrid-content.js")
    Copy-File -Source (Join-Path $root "hybrid\poison-hybrid-background.js") -Destination (Join-Path $poisonDir "poison-hybrid-background.js")
    Copy-File -Source (Join-Path $root "popup.html") -Destination (Join-Path $poisonDir "popup.html")
    Copy-File -Source (Join-Path $root "popup.js") -Destination (Join-Path $poisonDir "popup.js")
    Copy-File -Source (Join-Path $root "styles.css") -Destination (Join-Path $poisonDir "styles.css")
    Copy-File -Source (Join-Path $root "logo-poison.png") -Destination (Join-Path $poisonDir "logo-poison.png")

    foreach ($iconName in @("icon_16.png", "icon_16-off.png", "icon_16-loading.png", "icon_32.png", "icon_32-off.png", "icon_32-loading.png", "icon_64.png", "icon_64-off.png", "icon_64-loading.png", "icon_128.png")) {
        $iconPath = Join-Path $BuildDir "img\$iconName"
        if (Test-Path $iconPath) {
            Copy-File -Source (Join-Path $root "logo-poison.png") -Destination $iconPath
        }
    }

    $poisonPopupPath = Join-Path $poisonDir "popup.html"
    (Get-Content -Raw $poisonPopupPath).Replace('href="styles.css"', 'href="/poison/styles.css"').Replace('src="popup.js"', 'src="/poison/popup.js"').Replace('src="logo-poison.png"', 'src="/poison/logo-poison.png"') |
        Set-Content -Path $poisonPopupPath -Encoding UTF8

    $backgroundPath = Join-Path $BuildDir "background.html"
    $backgroundHtml = Get-Content -Raw $backgroundPath
    if ($backgroundHtml -notmatch 'poison-hybrid-background\.js') {
        $backgroundInsert = '<script src="poison/poison-hybrid-background.js"></script>' + [Environment]::NewLine + '</body>'
        $backgroundHtml = $backgroundHtml -replace '</body>', $backgroundInsert
        Set-Content -Path $backgroundPath -Value $backgroundHtml -Encoding UTF8
    }

    $manifestPath = Join-Path $BuildDir "manifest.json"
    $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json

    $matches = @("http://*/*", "https://*/*")
    if ($Platform -eq "Firefox") {
        $matches += "file://*/*"
    }

    $poisonContentScript = [ordered]@{
        matches = $matches
        js = @("/poison/poison-hybrid-content.js")
        all_frames = $true
        match_about_blank = $true
        run_at = "document_start"
    }

    $manifest.content_scripts = @($manifest.content_scripts) + @($poisonContentScript)

    $war = @($manifest.web_accessible_resources)
    if ($war -notcontains "/poison/pageScript.js") {
        $manifest.web_accessible_resources = $war + @("/poison/pageScript.js")
    }

    Set-PoisonHybridLocaleBranding -BuildDir $BuildDir
    Set-PoisonHybridHtmlBranding -BuildDir $BuildDir

    $manifest.name = "Poison Hybrid"
    $manifest.short_name = "Poison Hybrid"
    $manifest.description = "Poison Hybrid privacy engine with tracker blocking, fingerprint controls, popup hardening, and session poison profiles."
    $manifest.browser_action.default_title = "Poison Hybrid"
    $manifest.browser_action.default_popup = "poison/popup.html"
    $poisonIconSet = [ordered]@{
        "16" = "poison/logo-poison.png"
        "32" = "poison/logo-poison.png"
        "64" = "poison/logo-poison.png"
        "128" = "poison/logo-poison.png"
    }
    Set-JsonProperty -Object $manifest -Name "icons" -Value $poisonIconSet
    Set-JsonProperty -Object $manifest.browser_action -Name "default_icon" -Value $poisonIconSet
    if ($manifest.sidebar_action) {
        $manifest.sidebar_action.default_icon = "poison/logo-poison.png"
    }

    if ($manifest.browser_specific_settings -and $manifest.browser_specific_settings.gecko) {
        $manifest.browser_specific_settings.gecko.id = "poison-hybrid@example.com"
    }
    if ($manifest.applications -and $manifest.applications.gecko) {
        $manifest.applications.gecko.id = "poison-hybrid@example.com"
    }

    $manifest | ConvertTo-Json -Depth 100 | Set-Content -Path $manifestPath -Encoding UTF8
    Copy-File -Source (Join-Path $uBlockDir "LICENSE.txt") -Destination (Join-Path $BuildDir "LICENSE.Poison-Hybrid-backend-GPLv3.txt")

    $notice = @"
Poison Hybrid third-party notice
================================

Poison Hybrid includes modified GPLv3 code from uBlock Origin:
https://github.com/gorhill/uBlock

uBlock Origin is copyright Raymond Hill and contributors.
Poison Hybrid changes the visible branding, adds Poison Identity frontend modules,
and adds page-level privacy controls, but the bundled blocking backend remains a
modified GPLv3-derived work.

Distribution requirements:
- Keep this notice.
- Keep LICENSE.txt and LICENSE.Poison-Hybrid-backend-GPLv3.txt.
- Make the complete corresponding source code available when distributing XPI/ZIP builds.
- Mark this as a modified build, not an official uBlock Origin release.
"@
    Set-Content -Path (Join-Path $BuildDir "NOTICE.Poison-Hybrid.txt") -Value $notice -Encoding UTF8

    Write-Host "Injected Poison module into $Platform Poison Hybrid build" -ForegroundColor Green
}

function New-WebExtensionZip {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDir,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path $DestinationPath) {
        Remove-Item $DestinationPath -Force
    }

    $zip = [System.IO.Compression.ZipFile]::Open($DestinationPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $basePath = (Resolve-Path $SourceDir).Path
        Get-ChildItem -Path $basePath -Recurse -File | ForEach-Object {
            $relativePath = $_.FullName.Substring($basePath.Length).TrimStart('\', '/')
            $entryName = $relativePath -replace '\\', '/'
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip,
                $_.FullName,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    }
    finally {
        $zip.Dispose()
    }
}

Write-Host "Building Poison Hybrid..." -ForegroundColor Cyan
Ensure-UAssets
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$ffBuild = Build-UBlockPlatform -Platform "firefox"
$chBuild = Build-UBlockPlatform -Platform "chromium"

Add-PoisonToUBlockBuild -BuildDir $ffBuild -Platform "Firefox"
Add-PoisonToUBlockBuild -BuildDir $chBuild -Platform "Chromium"

$ffXpi = Join-Path $outDir "poison-hybrid-firefox.xpi"
$chZip = Join-Path $outDir "poison-hybrid-chromium.zip"
Remove-Item $ffXpi, $chZip -Force -ErrorAction SilentlyContinue

New-WebExtensionZip -SourceDir $ffBuild -DestinationPath $ffXpi
New-WebExtensionZip -SourceDir $chBuild -DestinationPath $chZip

Write-Host "Hybrid Firefox XPI: $ffXpi" -ForegroundColor Green
Write-Host "Hybrid Chromium ZIP: $chZip" -ForegroundColor Green
