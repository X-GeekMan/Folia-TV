$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$webSrc = Join-Path $root "web\src"
$overlaySrc = Join-Path $root "tv-overlay\src"

if (-not (Test-Path $webSrc)) {
    Write-Error "web/src not found. Clone or extract folia-major into web/ first."
}

Copy-Item -Path (Join-Path $overlaySrc "*") -Destination $webSrc -Recurse -Force
Write-Host "Copied tv-overlay into web/src"

$mainCandidates = @(
    (Join-Path $webSrc "main.tsx"),
    (Join-Path $webSrc "index.tsx"),
    (Join-Path $webSrc "main.ts")
)

$main = $mainCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $main) {
    Write-Warning "Could not find main entry. Manually import initTvAdapter() after app mount."
    exit 0
}

$content = Get-Content -Raw $main
if ($content -match "initTvAdapter") {
    Write-Host "main already imports initTvAdapter: $main"
    exit 0
}

$importLine = 'import { initTvAdapter } from "./tv/initTvAdapter";'
$callLine = "initTvAdapter();"

if ($content -match "createRoot\([^\)]*\)\.render") {
    $patched = $importLine + "`r`n" + $content
    if ($patched -notmatch "initTvAdapter\(\)") {
        $patched = $patched -replace "(createRoot\([^\)]*\)\.render\()", "$callLine`r`n`$1"
    }
    Set-Content -Path $main -Value $patched -Encoding UTF8
    Write-Host "Patched $main"
} else {
    $patched = $importLine + "`r`n" + $content + "`r`n" + $callLine + "`r`n"
    Set-Content -Path $main -Value $patched -Encoding UTF8
    Write-Host "Appended initTvAdapter to $main"
}
